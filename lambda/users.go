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

type SpotifyProfile struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
	Country     string `json:"country"`
}

func processUser(accessToken string) error {
	userProfile, err := fetchSpotifyProfile(accessToken)
	if err != nil {
		return fmt.Errorf("error fetching user profile: %w", err)
	}

	userExists, err := checkIfUserExists(userProfile.ID)
	if err != nil {
		return fmt.Errorf("error checking if user exists in DynamoDB: %w", err)
	}

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

func fetchSpotifyProfile(accessToken string) (*SpotifyProfile, error) {
	req, _ := http.NewRequest("GET", "https://api.spotify.com/v1/me", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

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

func checkIfUserExists(userID string) (bool, error) {
	result, err := dynamoClient.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(usersTable),
		Key: map[string]types.AttributeValue{
			"UserID": &types.AttributeValueMemberS{Value: userID},
		},
	})

	if err != nil {
		return false, err
	}

	return result.Item != nil, nil
}

func storeUserInDynamo(profile *SpotifyProfile) error {
	item := map[string]types.AttributeValue{
		"UserID":   &types.AttributeValueMemberS{Value: profile.ID},
		"Username": &types.AttributeValueMemberS{Value: profile.DisplayName},
		"Email":    &types.AttributeValueMemberS{Value: profile.Email},
		"Country":  &types.AttributeValueMemberS{Value: profile.Country},
	}

	_, err := dynamoClient.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(usersTable),
		Item:      item,
	})

	return err
}
