package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
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

var tableName = "Tokens"

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
