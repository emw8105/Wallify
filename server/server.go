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
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

var (
	clientId     string
	clientSecret string
	redirectUri  string
	dynamoClient *dynamodb.Client
)

var tableName = "Wallify-Tokens"

// helper function to get the maximum concatenated 99 items from the user's top artists or tracks
// Spotify API limit is 50 items per request, each client requests 99, this intermediary function is used to handle the requests
func getTopContent(accessToken, tokenKey, content string, totalContent int) ([]map[string]interface{}, error) {
	limit := 50
	var results []map[string]interface{}

	for offset := 0; offset < totalContent; offset += limit {
		requestLimit := min(limit, totalContent-offset)
		url := fmt.Sprintf("https://api.spotify.com/v1/me/top/%s?limit=%d&offset=%d", content, requestLimit, offset)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("error creating request: %w", err)
		}

		resp, err := makeSpotifyRequest(req, accessToken, tokenKey, content, 0)
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

	// load the AWS SDK config to connect to DynamoDB
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-east-1"),
	)
	if err != nil {
		log.Fatalf("Error loading AWS SDK config: %v", err)
	}

	dynamoClient = dynamodb.NewFromConfig(cfg)

	// basic catch all route, make sure the server is running
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Wallify Server: Page not found")
	})

	log.Printf("Table name in main is %s", tableName)

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
