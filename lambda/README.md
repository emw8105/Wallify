# Wallify Lambda Backend

This folder contains a single AWS Lambda function that exposes the same routes your EC2 Go server had:

- `/login`
- `/callback`
- `/health-check`
- `/top-artists`
- `/top-tracks`
- `/profile`

The function uses one API Gateway entrypoint and routes requests internally with `http.ServeMux`.

## Environment variables

Set these in Lambda:

- `CLIENT_ID`
- `CLIENT_SECRET`
- `REDIRECT_URI`

Optional but recommended:

- `DYNAMODB_REGION` (defaults to `AWS_REGION`, then `us-east-1`)
- `TOKENS_TABLE_NAME` (defaults to `Wallify-Tokens`)
- `USERS_TABLE_NAME` (defaults to `Wallify-Users`)
- `DEFAULT_CLIENT_REDIRECT` (defaults to `https://wallify.doypid.com`)
- `ALLOWED_CLIENT_REDIRECTS` (comma-separated allowlist, example: `https://wallify.doypid.com,http://127.0.0.1:3000`)

The function expects DynamoDB tables:

- `Wallify-Tokens`
- `Wallify-Users`

## Build for Lambda (Go custom runtime)

From this folder:

```bash
go mod tidy
GOOS=linux GOARCH=amd64 go build -o bootstrap .
zip function.zip bootstrap
```

If you deploy on arm64, build with:

```bash
GOOS=linux GOARCH=arm64 go build -o bootstrap .
zip function.zip bootstrap
```

## API Gateway notes

- Use API Gateway HTTP API or REST API with a Lambda proxy integration.
- Forward all backend paths to this function.
- Ensure CORS is enabled at API Gateway level too.

## Redirect/callback note

`/login` accepts an optional `client_origin` query parameter from the frontend and stores it in Spotify `state`.
`/callback` reads that state and redirects back to the same allowed client origin with `?token_key=...`.
If state is missing or invalid, it falls back to `DEFAULT_CLIENT_REDIRECT`.
