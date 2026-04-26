package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, x-token-key")
	(*w).Header().Set("Access-Control-Max-Age", "86400")
}

func normalizeTimeRange(value string) string {
	switch value {
	case "short_term", "medium_term", "long_term":
		return value
	default:
		return "medium_term"
	}
}

func handleCallback(w http.ResponseWriter, r *http.Request) {
	// Resolve the client origin up front so every error path can redirect back to the app.
	clientRedirectOrigin := resolveClientRedirectFromRequest(r)

	// Spotify sends ?error=access_denied (and similar) when the user is not permitted
	// to authorise the app (e.g. the app is in development mode and the account has not
	// been added to the allowlist in the Spotify Developer Portal).
	if spotifyError := r.URL.Query().Get("error"); spotifyError != "" {
		log.Printf("Spotify returned error during OAuth: %s", spotifyError)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=not_authorized", http.StatusSeeOther)
		return
	}

	if clientId == "" || clientSecret == "" || redirectUri == "" {
		log.Println("Missing environment variables in handleCallback")
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		log.Println("Authorization code is missing")
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=auth_failed", http.StatusSeeOther)
		return
	}

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectUri)

	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientId, clientSecret)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending token request: %v", err)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response body: %v", err)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	var tokenResponse map[string]interface{}
	if err := json.Unmarshal(body, &tokenResponse); err != nil {
		log.Printf("Error unmarshalling token response: %v", err)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	accessToken, ok := tokenResponse["access_token"].(string)
	if !ok {
		log.Printf("Access token missing from response: %v", tokenResponse)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	refreshToken, ok := tokenResponse["refresh_token"].(string)
	if !ok {
		log.Printf("Refresh token missing from response: %v", tokenResponse)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	key, err := generateUniqueKey()
	if err != nil {
		log.Printf("Error generating unique key: %v", err)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	item := map[string]types.AttributeValue{
		"TokenID":      &types.AttributeValueMemberS{Value: key},
		"AccessToken":  &types.AttributeValueMemberS{Value: accessToken},
		"RefreshToken": &types.AttributeValueMemberS{Value: refreshToken},
		"Expiration":   &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", time.Now().Unix())},
	}

	_, err = dynamoClient.PutItem(context.Background(), &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      item,
	})
	if err != nil {
		log.Printf("Error storing token in DynamoDB table %s: %v", tableName, err)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	if err := processUser(accessToken); err != nil {
		log.Printf("Error processing user: %v", err)
		http.Redirect(w, r, clientRedirectOrigin+"/?login_error=server_error", http.StatusSeeOther)
		return
	}

	clientRedirect := fmt.Sprintf("%s/?token_key=%s", clientRedirectOrigin, key)
	http.Redirect(w, r, clientRedirect, http.StatusSeeOther)
}

func handleTopContent(contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		tokenKey := r.Header.Get("x-token-key")
		log.Printf("Request received for top %s with Token Key %v\n", contentType, tokenKey)

		token, err := FetchToken(tokenKey)
		if err != nil {
			http.Error(w, "Invalid or missing token", http.StatusUnauthorized)
			log.Printf("Invalid or missing token")
			return
		}

		rawTimeRange := r.URL.Query().Get("time_range")
		timeRange := normalizeTimeRange(rawTimeRange)
		log.Printf("Top %s request time_range raw=%q normalized=%q", contentType, rawTimeRange, timeRange)

		totalContent := 99
		topContent, err := getTopContent(token.AccessToken, tokenKey, contentType, totalContent, timeRange)
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

func handleProfile(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	tokenKey := r.Header.Get("x-token-key")
	log.Printf("Request received for %v with Token Key %v\n", r.URL.Path, tokenKey)

	token, err := FetchToken(tokenKey)
	if err != nil {
		http.Error(w, "Invalid or missing token", http.StatusUnauthorized)
		log.Printf("Invalid or missing token")
		return
	}

	req, _ := http.NewRequest("GET", "https://api.spotify.com/v1/me", nil)
	response, err := makeSpotifyRequest(req, token.AccessToken, tokenKey, "profile", 0)
	if err != nil {
		http.Error(w, "Error fetching profile", http.StatusInternalServerError)
		return
	}

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

func handleLogout(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tokenKey := r.Header.Get("x-token-key")
	if tokenKey == "" {
		http.Error(w, "Invalid or missing token", http.StatusBadRequest)
		return
	}

	if err := DeleteToken(tokenKey); err != nil {
		http.Error(w, "Failed to log out", http.StatusInternalServerError)
		log.Printf("Error deleting token %s: %v", tokenKey, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out"})
}

func getTopContent(accessToken, tokenKey, content string, totalContent int, timeRange string) ([]map[string]interface{}, error) {
	limit := 50
	var results []map[string]interface{}

	for offset := 0; offset < totalContent; offset += limit {
		requestLimit := min(limit, totalContent-offset)
		url := fmt.Sprintf("https://api.spotify.com/v1/me/top/%s?limit=%d&offset=%d&time_range=%s", content, requestLimit, offset, timeRange)

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

func makeSpotifyRequest(req *http.Request, accessToken, tokenKey, endpoint string, retryCount int) ([]byte, error) {
	log.Printf("Making request to Spotify API, Endpoint: %s, AccessToken: %s, TokenKey: %s, RetryCount: %d", endpoint, accessToken, tokenKey, retryCount)
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
			token, err := FetchToken(tokenKey)
			if err != nil {
				return nil, err
			}

			newAccessToken, err := refreshAccessToken(token.RefreshToken)
			if err != nil {
				log.Println("Failed to refresh token, returning error.")
				return nil, fmt.Errorf("error refreshing access token: %w", err)
			}

			if err := UpdateAccessToken(tokenKey, newAccessToken); err != nil {
				return nil, fmt.Errorf("error updating access token in DynamoDB: %w", err)
			}

			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", newAccessToken))
			return makeSpotifyRequest(req, newAccessToken, tokenKey, endpoint, retryCount+1)
		}
		return nil, fmt.Errorf("spotify API error: %s", string(body))
	}
	return body, nil
}
