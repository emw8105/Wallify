package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type Token struct {
	TokenID      string
	AccessToken  string
	RefreshToken string
	Expiration   int64
}

func generateUniqueKey() (string, error) {
	for {
		// generate a random 16-byte key
		bytes := make([]byte, 16)
		_, err := rand.Read(bytes)
		if err != nil {
			return "", fmt.Errorf("error generating unique key: %w", err)
		}
		key := hex.EncodeToString(bytes)

		// check if key already exists in DynamoDB
		result, err := dynamoClient.GetItem(context.TODO(), &dynamodb.GetItemInput{
			TableName: aws.String(tableName),
			Key: map[string]types.AttributeValue{
				"TokenID": &types.AttributeValueMemberS{Value: key},
			},
		})

		if err != nil || result.Item == nil {
			return key, nil
		}
	}
}

// retrieve a token from dynamo
func FetchToken(tokenKey string) (*Token, error) {
	result, err := dynamoClient.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"TokenID": &types.AttributeValueMemberS{Value: tokenKey},
		},
	})
	if err != nil || result.Item == nil {
		return nil, fmt.Errorf("invalid or missing token")
	}

	accessToken := result.Item["AccessToken"].(*types.AttributeValueMemberS).Value
	refreshToken := result.Item["RefreshToken"].(*types.AttributeValueMemberS).Value
	expiration, _ := strconv.ParseInt(result.Item["Expiration"].(*types.AttributeValueMemberN).Value, 10, 64)

	return &Token{
		TokenID:      tokenKey,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Expiration:   expiration,
	}, nil
}

// update the the access token in dynamo
func UpdateAccessToken(tokenKey, newAccessToken string) error {
	_, err := dynamoClient.UpdateItem(context.TODO(), &dynamodb.UpdateItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"TokenID": &types.AttributeValueMemberS{Value: tokenKey},
		},
		UpdateExpression: aws.String("SET AccessToken = :newToken"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":newToken": &types.AttributeValueMemberS{Value: newAccessToken},
		},
	})
	return err
}

func refreshAccessToken(refreshToken string) (string, error) {
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

	if accessToken, exists := responseData["AccessToken"].(string); exists {
		log.Println("Access token refreshed successfully")
		return accessToken, nil
	}
	return "", fmt.Errorf("error refreshing access token: response missing access token")
}
