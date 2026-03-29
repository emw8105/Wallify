package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/joho/godotenv"
)

var (
	clientId     string
	clientSecret string
	redirectUri  string
	dynamoClient *dynamodb.Client
	usersTable   string
)

var (
	tableName              = "Wallify-Tokens"
	defaultClientRedirect  = "https://wallify.doypid.com"
	allowedClientRedirects = map[string]struct{}{}
	adapter                *httpadapter.HandlerAdapter
)

func encodeState(value string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(value))
}

func decodeState(value string) (string, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return "", err
	}
	return string(decoded), nil
}

func parseCSVEnv(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}

func normalizeClientOrigin(origin string) string {
	trimmed := strings.TrimSpace(origin)
	return strings.TrimSuffix(trimmed, "/")
}

func isAllowedClientOrigin(origin string) bool {
	_, ok := allowedClientRedirects[normalizeClientOrigin(origin)]
	return ok
}

func resolveClientRedirectFromRequest(r *http.Request) string {
	state := r.URL.Query().Get("state")
	if state != "" {
		decodedState, err := decodeState(state)
		if err == nil && isAllowedClientOrigin(decodedState) {
			return normalizeClientOrigin(decodedState)
		}
	}

	if referer := r.Referer(); referer != "" {
		if refererURL, err := url.Parse(referer); err == nil {
			origin := normalizeClientOrigin(refererURL.Scheme + "://" + refererURL.Host)
			if isAllowedClientOrigin(origin) {
				return origin
			}
		}
	}

	return defaultClientRedirect
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Server is up")
}

func init() {
	_ = godotenv.Load(".env")

	clientId = os.Getenv("CLIENT_ID")
	clientSecret = os.Getenv("CLIENT_SECRET")
	redirectUri = os.Getenv("REDIRECT_URI")
	usersTable = os.Getenv("USERS_TABLE_NAME")
	if usersTable == "" {
		usersTable = "Wallify-Users"
	}

	if configuredTokenTable := os.Getenv("TOKENS_TABLE_NAME"); configuredTokenTable != "" {
		tableName = configuredTokenTable
	}

	if configuredDefaultClientRedirect := os.Getenv("DEFAULT_CLIENT_REDIRECT"); configuredDefaultClientRedirect != "" {
		defaultClientRedirect = normalizeClientOrigin(configuredDefaultClientRedirect)
	}

	allowedClientRedirects = map[string]struct{}{
		normalizeClientOrigin(defaultClientRedirect): {},
		normalizeClientOrigin("http://127.0.0.1:3000"): {},
		normalizeClientOrigin("http://localhost:3000"): {},
	}
	for _, origin := range parseCSVEnv(os.Getenv("ALLOWED_CLIENT_REDIRECTS")) {
		allowedClientRedirects[normalizeClientOrigin(origin)] = struct{}{}
	}

	dynamoRegion := os.Getenv("DYNAMODB_REGION")
	if dynamoRegion == "" {
		dynamoRegion = os.Getenv("AWS_REGION")
	}
	if dynamoRegion == "" {
		dynamoRegion = "us-east-1"
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(dynamoRegion))
	if err != nil {
		log.Fatalf("error loading AWS SDK config: %v", err)
	}

	log.Printf("Configured DynamoDB region: %s", dynamoRegion)
	log.Printf("Configured token table: %s", tableName)
	log.Printf("Configured users table: %s", usersTable)
	log.Printf("Configured default client redirect: %s", defaultClientRedirect)

	dynamoClient = dynamodb.NewFromConfig(cfg)

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Wallify Server: Page not found")
	})

	mux.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)

		if clientId == "" || redirectUri == "" {
			http.Error(w, "Missing environment variables", http.StatusInternalServerError)
			return
		}

		clientOrigin := normalizeClientOrigin(r.URL.Query().Get("client_origin"))
		if !isAllowedClientOrigin(clientOrigin) {
			clientOrigin = defaultClientRedirect
		}

		state := encodeState(clientOrigin)
		authUrl := fmt.Sprintf(
			"https://accounts.spotify.com/authorize?client_id=%s&response_type=code&redirect_uri=%s&scope=user-top-read user-read-email user-read-private&state=%s",
			clientId, url.QueryEscape(redirectUri), url.QueryEscape(state))

		log.Println("Generated Authorization URL:", authUrl)
		http.Redirect(w, r, authUrl, http.StatusSeeOther)
	})

	mux.HandleFunc("/callback", handleCallback)
	mux.HandleFunc("/health-check", healthCheck)
	mux.HandleFunc("/top-artists", handleTopContent("artists"))
	mux.HandleFunc("/top-tracks", handleTopContent("tracks"))
	mux.HandleFunc("/profile", handleProfile)

	adapter = httpadapter.New(mux)
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return adapter.ProxyWithContext(ctx, req)
}

func main() {
	lambda.Start(handler)
}
