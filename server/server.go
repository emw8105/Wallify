package main

// some notes because this is my first time writing a server in Go
// fmt.Sprintf - used to format a string, similar to string interpolation ( i.e. ${}) in JS, can insert vars into strings
// log.Fatalf - logs a message and exits the program
// log.Println - logs a message
// http.HandleFunc - used to route HTTP requests from the net/http package, maps a url path to a function (i.e. /login or /callback)
// http.Redirect - used to redirect the client to a different URL, in our case is used after generating an auth URL from spotify to redirect the user to the spotify login page
// http.ListenAndServe - starts the server and listens for HTTP requests on the specified port (i.e. :8888)
// url.Values - used to create form-encoded data to send in the body of the post request
// strings.NewReader - creates a reader from a string which can be passed an http.NewRequest body for a post request
// defer resp.Body.Close() - ensures that the response body is closed after the function returns, helps avoid resource leakage

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
)

var (
	clientId     string
	clientSecret string
	redirectUri  string
)

// map to store tokens, mutex used for safe concurrent access
var tokenMap = make(map[string]map[string]interface{})
var tokenMapMutex sync.Mutex

// generate a unique key for the token map
func generateUniqueKey() string {
	for {
		bytes := make([]byte, 16)
		_, err := rand.Read(bytes)
		if err != nil { // i.e. if there is an error, log it and exit
			log.Fatalf("Error generating unique key: %v", err)
		}
		key := hex.EncodeToString(bytes)

		tokenMapMutex.Lock()
		if _, exists := tokenMap[key]; !exists {
			tokenMapMutex.Unlock()
			return key // return if the key is unique
		}
		tokenMapMutex.Unlock()
	}
}

// cleanup function to remove expired tokens from the token map
func cleanupTokenMap() {
	expirationTime := 24 * time.Hour
	for {
		time.Sleep(1 * time.Hour) // run every hour

		tokenMapMutex.Lock()
		now := time.Now()

		log.Printf("Cleaning up tokens at time %v\n", now)
		for key, value := range tokenMap {
			tokenTimestamp := value["timestamp"].(time.Time)
			if now.Sub(tokenTimestamp) > expirationTime {
				log.Printf("Removing expired token key: %s\n", key)
				delete(tokenMap, key)
			}
		}
		tokenMapMutex.Unlock()
	}
}

// refresh token route to get a new access token
func refreshSpotifyToken(refreshToken string) (string, error) {
	log.Println("Attempting to refresh access token for refresh token:", refreshToken)

	// prep the form data
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)

	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", bytes.NewBufferString(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientId, clientSecret)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending token request: %w", err)
	}
	defer resp.Body.Close()

	// parse the response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response body: %w", err)
	}

	var responseData map[string]interface{}
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		return "", fmt.Errorf("error parsing response JSON: %w", err)
	}

	// if the response contains the access token, then return it back to the calling function
	if accessToken, exists := responseData["access_token"].(string); exists {
		log.Println("Access token refreshed successfully")
		return accessToken, nil
	}

	return "", fmt.Errorf("error refreshing access token: response missing access token")
}

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, x-token-key")
	(*w).Header().Set("Access-Control-Max-Age", "86400")
}

// universal request handler for Spotify API
func makeSpotifyRequest(req *http.Request, accessToken, endpoint string, retryCount int) ([]byte, error) {
	client := &http.Client{}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusUnauthorized && retryCount < 1 {
			log.Println("Access token expired, attempting to refresh token...")

			tokenKey := req.Header.Get("x-token-key")
			tokenMapMutex.Lock()
			tokenInfo, exists := tokenMap[tokenKey]
			tokenMapMutex.Unlock()

			if !exists {
				log.Printf("Invalid or missing token")
				return nil, fmt.Errorf("invalid or missing token")
			}

			newAccessToken, err := refreshSpotifyToken(tokenInfo["refreshToken"].(string))
			if err != nil {
				log.Println("Failed to refresh token, returning error.")
				return nil, fmt.Errorf("error refreshing access token: %w", err)
			}

			tokenMapMutex.Lock()
			tokenMap[tokenKey]["accessToken"] = newAccessToken
			tokenMapMutex.Unlock()

			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", newAccessToken))
			return makeSpotifyRequest(req, newAccessToken, endpoint, retryCount+1)
		}
		return nil, fmt.Errorf("spotify API error: %s", string(body))
	}

	return body, nil
}

// helper function to get the maximum concatenated 99 items from the user's top artists or tracks
// Spotify API limit is 50 items per request, each client requests 99, this intermediary function is used to handle the requests
func getTopContent(accessToken, content string, totalContent int) ([]map[string]interface{}, error) {
	limit := 50 // Spotify's API limit per request
	var results []map[string]interface{}

	for offset := 0; offset < totalContent; offset += limit {
		requestLimit := min(limit, totalContent-offset)
		url := fmt.Sprintf("https://api.spotify.com/v1/me/top/%s?limit=%d&offset=%d", content, requestLimit, offset)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("error creating request: %w", err)
		}

		resp, err := makeSpotifyRequest(req, accessToken, content, 0)
		if err != nil {
			return nil, err
		}

		var data map[string]interface{}
		if err := json.Unmarshal(resp, &data); err != nil {
			return nil, fmt.Errorf("error unmarshaling response: %w", err)
		}

		items, ok := data["items"].([]interface{})
		if !ok {
			return nil, fmt.Errorf("unexpected response format")
		}

		for _, item := range items {
			results = append(results, item.(map[string]interface{}))
		}
	}

	return results[:min(len(results), totalContent)], nil
}

// route to fetch the user's top artists or tracks based on the specified content type
func handleTopContent(contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		tokenKey := r.Header.Get("x-token-key")
		log.Printf("Request received for top %s with Token Key %v\n", contentType, tokenKey)

		tokenMapMutex.Lock()
		tokenInfo, exists := tokenMap[tokenKey]
		tokenMapMutex.Unlock()

		if !exists {
			http.Error(w, "Invalid or missing token", http.StatusUnauthorized)
			log.Printf("Invalid or missing token")
			return
		}

		limit := r.URL.Query().Get("limit")
		if limit == "" {
			limit = "50"
		}

		totalContent, err := strconv.Atoi(limit)
		if err != nil {
			http.Error(w, "Invalid limit", http.StatusBadRequest)
			log.Printf("Invalid limit: %v", err)
			return
		}

		topContent, err := getTopContent(tokenInfo["accessToken"].(string), contentType, totalContent)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error fetching top %s", contentType), http.StatusInternalServerError)
			log.Printf("Error fetching top %s: %v", contentType, err)
			return
		}

		response, err := json.Marshal(topContent)
		if err != nil {
			http.Error(w, "Error marshaling response", http.StatusInternalServerError)
			log.Printf("Error marshaling response: %v", err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(response)
	}
}

// route to fetch the user's profile picture
func handleProfile(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	tokenKey := r.Header.Get("x-token-key")
	log.Printf("Request received for %v with Token Key %v\n", r.URL.Path, tokenKey)

	tokenMapMutex.Lock()
	tokenInfo, exists := tokenMap[tokenKey]
	tokenMapMutex.Unlock()

	if !exists {
		http.Error(w, "Invalid or missing token", http.StatusUnauthorized)
		log.Printf("Invalid or missing token")
		return
	}

	req, _ := http.NewRequest("GET", "https://api.spotify.com/v1/me", nil)
	response, err := makeSpotifyRequest(req, tokenInfo["accessToken"].(string), "profile", 0)
	if err != nil {
		http.Error(w, "Error fetching profile", http.StatusInternalServerError)
		return
	}

	// parse the profile picture, some users may not have a profile picture so lots of checks are needed
	var profileData map[string]interface{}
	json.Unmarshal(response, &profileData)
	profilePictureUrl := ""
	if images, ok := profileData["images"].([]interface{}); ok && len(images) > 0 {
		if image, ok := images[0].(map[string]interface{}); ok {
			if url, ok := image["url"].(string); ok {
				profilePictureUrl = url
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"profilePictureUrl": profilePictureUrl})
}

// route to handle the callback from Spotify after the user is authenticated
func handleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		log.Println("Authorization code is missing")
		http.Error(w, "Authorization code is missing", http.StatusBadRequest)
		return
	}

	log.Println("Authorization code:", code)

	// create the form data to send in the token request
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectUri)

	// make a post request to spotify's access token endpoint
	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	if err != nil { // i.e. if there is an error, log it and exit
		log.Fatalf("Error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientId, clientSecret)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil { // i.e. if there is an error, log it and exit
		log.Fatalf("Error sending token request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response body: %v", err)
	}

	log.Println("Response from Spotify:", string(body))

	// parse the JSON response to extract the access token
	var tokenResponse map[string]interface{}
	if err := json.Unmarshal(body, &tokenResponse); err != nil {
		log.Fatalf("Error unmarshalling token response: %v", err)
	}

	accessToken, ok := tokenResponse["access_token"].(string)
	if !ok {
		log.Fatalf("Access token missing from response: %v", tokenResponse)
	}

	// generate a unique key for the token
	key := generateUniqueKey()

	// store the token and timestamp in the token map with mutex lock for sync safety
	tokenMapMutex.Lock()
	tokenMap[key] = map[string]interface{}{
		"accessToken": accessToken,
		"timestamp":   time.Now(),
	}
	tokenMapMutex.Unlock()

	fmt.Println("Token Map: ", tokenMap)

	// redirect the user back to the React app with the token key
	http.Redirect(w, r, fmt.Sprintf("http://localhost:3000?token_key=%s", key), http.StatusSeeOther)
}

func main() {
	// load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error loading .env file")
	}

	clientId = os.Getenv("CLIENT_ID")
	clientSecret = os.Getenv("CLIENT_SECRET")
	redirectUri = os.Getenv("REDIRECT_URI")

	// check if any of the environment variables are missing
	if clientId == "" || clientSecret == "" || redirectUri == "" {
		log.Fatal("Missing environment variables: CLIENT_ID, CLIENT_SECRET, or REDIRECT_URI")
	}

	// start cleanup routine in the background
	go cleanupTokenMap()

	// basic catch all route, make sure the server is running
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Wallify Server: Page not found")
	})

	// login route, basically uses the Spotify API to generate an auth URL and redirects the user to the Spotify login page
	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		authUrl := fmt.Sprintf(
			"https://accounts.spotify.com/authorize?client_id=%s&response_type=code&redirect_uri=%s&scope=user-top-read",
			clientId, redirectUri)
		log.Println("Generated Authorization URL:", authUrl)
		http.Redirect(w, r, authUrl, http.StatusSeeOther)
	})

	// callback route, it's a bit more complicated so details are abstracted to the handleCallback function
	http.HandleFunc("/callback", handleCallback)

	http.HandleFunc("/top-artists", handleTopContent("artists"))
	http.HandleFunc("/top-tracks", handleTopContent("tracks"))
	http.HandleFunc("/profile", handleProfile)

	log.Println("Server is running on http://localhost:8888")
	log.Fatal(http.ListenAndServe(":8888", nil))
}
