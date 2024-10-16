package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

func refreshSpotifyToken(refreshToken string) (string, error) {
	log.Println("Attempting to refresh access token for refresh token:", refreshToken)
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

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response body: %w", err)
	}

	var responseData map[string]interface{}
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		return "", fmt.Errorf("error parsing response JSON: %w", err)
	}

	if accessToken, exists := responseData["access_token"].(string); exists {
		log.Println("Access token refreshed successfully")
		return accessToken, nil
	}
	return "", fmt.Errorf("error refreshing access token: response missing access token")
}

func makeSpotifyRequest(req *http.Request, accessToken, tokenKey, endpoint string, retryCount int) ([]byte, error) {
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

			// get a new access token using the refresh token
			newAccessToken, err := refreshSpotifyToken(token.RefreshToken)
			if err != nil {
				log.Println("Failed to refresh token, returning error.")
				return nil, fmt.Errorf("error refreshing access token: %w", err)
			}

			// update access token in dynamo
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
