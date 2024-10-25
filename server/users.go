package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// definition for spotify profile item for metrics purposes
type SpotifyProfile struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
	Country     string `json:"country"`
}

func processUser(accessToken string) error {
	// fetch the user profile from Spotify
	userProfile, err := fetchSpotifyProfile(accessToken)
	if err != nil {
		return fmt.Errorf("error fetching user profile: %w", err)
	}

	// check if the user already exists in the users table
	userExists, err := checkIfUserExists(userProfile.ID)
	if err != nil {
		return fmt.Errorf("error checking if user exists in DynamoDB: %w", err)
	}

	// if the user does not exist, store the user in the users table
	if userExists {
		log.Printf("User already exists in DynamoDB: ID=%s, DisplayName=%s, Email=%s, Country=%s",
			userProfile.ID, userProfile.DisplayName, userProfile.Email, userProfile.Country)
	} else {
		err = storeUserInDynamo(userProfile)
		if err != nil {
			return fmt.Errorf("error storing user in DynamoDB: %w", err)
		}
		log.Printf("New user added to DynamoDB: ID=%s, DisplayName=%s, Email=%s, Country=%s",
			userProfile.ID, userProfile.DisplayName, userProfile.Email, userProfile.Country)
	}

	return nil
}

// fetch user profile from Spotify
func fetchSpotifyProfile(accessToken string) (*SpotifyProfile, error) {
	req, _ := http.NewRequest("GET", "https://api.spotify.com/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// TEMP: read and log the raw response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// parse the body into the expected struct
	var profile struct {
		ID          string `json:"id"`
		DisplayName string `json:"display_name"`
		Email       string `json:"email"`
		Country     string `json:"country"`
	}

	err = json.Unmarshal(bodyBytes, &profile)
	if err != nil {
		return nil, err
	}

	userProfile := &SpotifyProfile{
		ID:          profile.ID,
		DisplayName: profile.DisplayName,
		Email:       profile.Email,
		Country:     profile.Country,
	}

	return userProfile, nil
}

// check if user already exists the users table
func checkIfUserExists(userID string) (bool, error) {
	// query dynamo for user with userID
	result, err := dynamoClient.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String("Wallify-Users"),
		Key: map[string]types.AttributeValue{
			"UserID": &types.AttributeValueMemberS{Value: userID},
		},
	})

	if err != nil {
		return false, err
	}

	return result.Item != nil, nil
}

// store the user in the users table
func storeUserInDynamo(profile *SpotifyProfile) error {
	// create an item for the new user
	item := map[string]types.AttributeValue{
		"UserID":   &types.AttributeValueMemberS{Value: profile.ID},
		"Username": &types.AttributeValueMemberS{Value: profile.DisplayName},
		"Email":    &types.AttributeValueMemberS{Value: profile.Email},
		"Country":  &types.AttributeValueMemberS{Value: profile.Country},
	}

	// insert the user into the users table
	_, err := dynamoClient.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String("Wallify-Users"),
		Item:      item,
	})

	return err
}
