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

func handleCallback(w http.ResponseWriter, r *http.Request) {
	if clientId == "" || clientSecret == "" || redirectUri == "" {
		http.Error(w, "Missing environment variables", http.StatusInternalServerError)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		log.Println("Authorization code is missing")
		http.Error(w, "Authorization code is missing", http.StatusBadRequest)
		return
	}

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectUri)

	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	if err != nil {
		http.Error(w, "Error creating token request", http.StatusInternalServerError)
		log.Printf("Error creating request: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientId, clientSecret)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Error sending token request", http.StatusInternalServerError)
		log.Printf("Error sending token request: %v", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Error reading Spotify response", http.StatusInternalServerError)
		log.Printf("Error reading response body: %v", err)
		return
	}

	var tokenResponse map[string]interface{}
	if err := json.Unmarshal(body, &tokenResponse); err != nil {
		http.Error(w, "Error parsing Spotify response", http.StatusInternalServerError)
		log.Printf("Error unmarshalling token response: %v", err)
		return
	}

	accessToken, ok := tokenResponse["access_token"].(string)
	if !ok {
		http.Error(w, "Spotify response missing access_token", http.StatusBadGateway)
		log.Printf("Access token missing from response: %v", tokenResponse)
		return
	}

	refreshToken, ok := tokenResponse["refresh_token"].(string)
	if !ok {
		http.Error(w, "Spotify response missing refresh_token", http.StatusBadGateway)
		log.Printf("Refresh token missing from response: %v", tokenResponse)
		return
	}

	key, err := generateUniqueKey()
	if err != nil {
		http.Error(w, "Error generating token key", http.StatusInternalServerError)
		log.Printf("Error generating unique key: %v", err)
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
		http.Error(w, "Error storing token", http.StatusInternalServerError)
		log.Printf("Error storing token in DynamoDB table %s: %v", tableName, err)
		return
	}

	if err := processUser(accessToken); err != nil {
		http.Error(w, "Error processing user", http.StatusInternalServerError)
		log.Printf("Error processing user: %v", err)
		return
	}

	clientRedirectOrigin := resolveClientRedirectFromRequest(r)
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

		totalContent := 99
		topContent, err := getTopContent(token.AccessToken, tokenKey, contentType, totalContent)
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
