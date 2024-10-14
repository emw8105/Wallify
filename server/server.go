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
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
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

	// generate a unique key for the token and store it in the token map
	key := generateUniqueKey()

	tokenMapMutex.Lock()
	tokenMap[key] = map[string]interface{}{
		"accessToken": body, // store the actual access token in the token map
		"timestamp":   time.Now(),
	}
	tokenMapMutex.Unlock()

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

	log.Println("Server is running on http://localhost:8888")
	log.Fatal(http.ListenAndServe(":8888", nil))
}
