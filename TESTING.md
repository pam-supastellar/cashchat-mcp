# Testing Guide

This guide will help you test the CashChat MCP Server to ensure everything is working correctly.

## Quick Test Checklist

- [ ] Server starts successfully
- [ ] Health check endpoint responds
- [ ] OAuth metadata endpoint works
- [ ] OAuth authorization flow completes
- [ ] Token endpoint returns access token
- [ ] SSE endpoint accepts authenticated requests
- [ ] All 8 MCP tools function correctly

---

## Local Testing

### 1. Start the Server

```bash
# Set up environment
cp .env.example .env
# Edit .env with your CASHCHAT_API_KEY

# Build
npm run build

# Start server
npm run start:server
```

Expected output:
```
CashChat MCP Server running on http://localhost:3000
SSE endpoint: http://localhost:3000/sse
OAuth authorize: http://localhost:3000/oauth/authorize

Ready to accept connections from Claude Desktop!
```

### 2. Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "serverUrl": "http://localhost:3000"
}
```

### 3. Test OAuth Metadata

```bash
curl http://localhost:3000/.well-known/oauth-authorization-server
```

Expected response:
```json
{
  "issuer": "http://localhost:3000",
  "authorization_endpoint": "http://localhost:3000/oauth/authorize",
  "token_endpoint": "http://localhost:3000/oauth/token",
  "revocation_endpoint": "http://localhost:3000/oauth/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "none"],
  "code_challenge_methods_supported": ["S256", "plain"],
  "scopes_supported": ["read", "write"]
}
```

### 4. Test OAuth Authorization Flow

**Step 1: Get authorization code**

Visit in browser:
```
http://localhost:3000/oauth/authorize?response_type=code&client_id=cashchat-mcp-server&redirect_uri=http://localhost:3000/callback&scope=read%20write&state=test123
```

You'll be redirected to:
```
http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=test123
```

Copy the `code` parameter value.

**Step 2: Exchange code for token**

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR_AUTHORIZATION_CODE",
    "redirect_uri": "http://localhost:3000/callback",
    "client_id": "cashchat-mcp-server"
  }'
```

Expected response:
```json
{
  "access_token": "YOUR_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "scope": "read write"
}
```

Save the `access_token` for the next tests.

### 5. Test SSE Endpoint (Authenticated)

```bash
curl -X POST http://localhost:3000/sse \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Should establish an SSE connection (server will keep connection open).

### 6. Test Unauthorized Access

```bash
curl -X POST http://localhost:3000/sse
```

Expected response (401):
```json
{
  "error": "unauthorized",
  "error_description": "Missing or invalid Authorization header"
}
```

---

## Testing with Claude Desktop

### Setup

1. Create test config file:

```bash
mkdir -p ~/Library/Application\ Support/Claude
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json <<EOF
{
  "mcpServers": {
    "cashchat": {
      "url": "http://localhost:3000/sse",
      "oauth": {
        "authUrl": "http://localhost:3000/oauth/authorize",
        "tokenUrl": "http://localhost:3000/oauth/token",
        "clientId": "cashchat-mcp-server",
        "scopes": ["read", "write"]
      }
    }
  }
}
EOF
```

2. Restart Claude Desktop

3. Look for OAuth authorization prompt

4. Click "Authorize"

### Test MCP Tools

Try these commands in Claude Desktop:

#### Test 1: Get Categories
```
What transaction categories are available?
```

Expected: List of categories from CashChat

#### Test 2: Get Transactions
```
Show me my recent transactions
```

Expected: List of recent transactions

#### Test 3: Add Transaction
```
Add a transaction: $25 for coffee on 2024-01-29
```

Expected: Confirmation that transaction was added

#### Test 4: Get Summary
```
Show me my spending summary for this month
```

Expected: Monthly spending breakdown by category

#### Test 5: Get Settings
```
What are my CashChat settings?
```

Expected: Display of preferred currency and agent instructions

---

## Testing stdio Mode (Legacy)

### Setup

```bash
# Edit config for stdio mode
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json <<EOF
{
  "mcpServers": {
    "cashchat": {
      "command": "node",
      "args": ["$(pwd)/build/index.js"],
      "env": {
        "CASHCHAT_API_KEY": "your_api_key_here"
      }
    }
  }
}
EOF
```

### Test

1. Restart Claude Desktop
2. Try the same commands as URL-based mode
3. Verify all tools work

---

## Production Testing

Before deploying to production, test the following:

### 1. HTTPS Configuration

```bash
# Test with your production domain
curl https://cashchat.supastellar.dev/health
```

### 2. OAuth with HTTPS

```bash
# Test OAuth metadata
curl https://cashchat.supastellar.dev/.well-known/oauth-authorization-server

# Verify all URLs use https://
```

### 3. Load Testing

```bash
# Install apache bench
brew install httpd

# Test health endpoint
ab -n 1000 -c 10 https://cashchat.supastellar.dev/health

# Expected: No errors, reasonable response times
```

### 4. Security Headers

```bash
curl -I https://cashchat.supastellar.dev/health
```

Check for security headers:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`

### 5. Token Expiration

1. Get an access token
2. Wait for token to expire (or set short expiry for testing)
3. Try to use expired token
4. Should receive 401 unauthorized

---

## Troubleshooting Tests

### Server won't start

Check:
- Node.js version: `node --version` (should be 18+)
- Port availability: `lsof -i :3000`
- Environment variables: `cat .env`

### OAuth fails

Check:
- SERVER_URL matches actual server URL
- Redirect URI matches exactly
- Client ID matches in both server and client config

### SSE connection drops

Check:
- Server logs for errors
- Network connectivity
- Firewall rules
- Keep-alive settings

### Tools don't work

Check:
- CASHCHAT_API_KEY is correct
- CashChat API is accessible: `curl https://cashchat.supastellar.dev/api/v1/health`
- Server logs show tool invocations

---

## Automated Testing Script

Save as `test.sh`:

```bash
#!/bin/bash

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_KEY="${CASHCHAT_API_KEY:-}"

echo "Testing CashChat MCP Server at $BASE_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Test 2: OAuth metadata
echo "Test 2: OAuth Metadata"
curl -s "$BASE_URL/.well-known/oauth-authorization-server" | jq .
echo ""

# Test 3: Unauthorized SSE access (should fail)
echo "Test 3: Unauthorized Access (should fail)"
curl -s -X POST "$BASE_URL/sse" | jq .
echo ""

echo "Manual OAuth flow test required - visit:"
echo "$BASE_URL/oauth/authorize?response_type=code&client_id=cashchat-mcp-server&redirect_uri=$BASE_URL/callback&scope=read%20write&state=test"
echo ""
echo "All automated tests completed!"
```

Run with:
```bash
chmod +x test.sh
./test.sh
```

---

## Performance Benchmarks

Expected performance on standard hardware:

- **Health check**: < 10ms
- **OAuth authorize**: < 50ms
- **Token exchange**: < 100ms
- **SSE connect**: < 200ms
- **MCP tool execution**: < 500ms (depends on CashChat API)

---

## Test Coverage

Current test coverage:

- [x] HTTP server startup
- [x] Health check endpoint
- [x] OAuth metadata endpoint
- [x] OAuth authorization flow
- [x] Token endpoint
- [x] Token verification
- [x] SSE endpoint authentication
- [x] All 8 MCP tools (manual testing)
- [ ] Unit tests (TODO)
- [ ] Integration tests (TODO)
- [ ] End-to-end tests (TODO)

---

## Reporting Issues

If you find bugs during testing:

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
2. Search existing [GitHub Issues](https://github.com/supastellar/cashchat-mcp/issues)
3. Create a new issue with:
   - Test that failed
   - Expected behavior
   - Actual behavior
   - Server logs
   - Environment details (OS, Node version, etc.)

---

**Happy Testing! 🚀**
