# CashChat MCP Server - Deployment Guide

This guide covers deploying the CashChat MCP Server to various platforms.

## Table of Contents

- [Local Development](#local-development)
- [Production Deployment Options](#production-deployment-options)
  - [Option 1: Node.js Server (Recommended)](#option-1-nodejs-server-recommended)
  - [Option 2: Cloudflare Workers](#option-2-cloudflare-workers)
- [Configuration](#configuration)
- [Testing the Connection](#testing-the-connection)

---

## Local Development

### Prerequisites

- Node.js 18+ installed
- CashChat API key (get from https://cashchat.supastellar.dev)
- npm or yarn package manager

### Setup

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/supastellar/cashchat-mcp.git
cd cashchat-mcp
npm install
```

2. Create a `.env` file:

```bash
cp .env.example .env
```

3. Edit `.env` with your credentials:

```env
CASHCHAT_API_KEY=your_api_key_here
PORT=3000
SERVER_URL=http://localhost:3000
OAUTH_CLIENT_ID=cashchat-mcp-server
```

4. Build and start the server:

```bash
npm run build
npm run start:server
```

The server will start on `http://localhost:3000`.

---

## Production Deployment Options

### Option 1: Node.js Server (Recommended)

Deploy to any Node.js hosting platform (DigitalOcean, AWS, Heroku, Railway, Render, etc.)

#### Deployment Steps

1. **Build the application:**

```bash
npm run build
```

2. **Set environment variables on your hosting platform:**

```env
CASHCHAT_API_KEY=your_api_key_here
PORT=3000
SERVER_URL=https://cashchat.supastellar.dev
OAUTH_CLIENT_ID=cashchat-mcp-server
OAUTH_CLIENT_SECRET=your_secret_here  # Optional but recommended
```

3. **Start the server:**

```bash
npm run start:server
```

4. **Configure your domain:**
   - Point your domain (e.g., `cashchat.supastellar.dev`) to your server
   - Set up SSL certificate (use Let's Encrypt or your hosting provider's SSL)

#### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway init

# Set environment variables
railway variables set CASHCHAT_API_KEY=your_key
railway variables set SERVER_URL=https://your-app.railway.app

# Deploy
railway up
```

#### DigitalOcean App Platform

1. Connect your GitHub repository
2. Set environment variables in the App Platform dashboard
3. Deploy with automatic builds

---

### Option 2: Cloudflare Workers

**Note:** The Cloudflare Workers version has limited SSE support due to Workers' runtime constraints. The Node.js version is recommended for production.

#### Prerequisites

- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`

#### Deployment Steps

1. **Login to Cloudflare:**

```bash
wrangler login
```

2. **Set secrets:**

```bash
wrangler secret put CASHCHAT_API_KEY
# Enter your API key when prompted
```

3. **Edit `wrangler.toml`:**

Update the `SERVER_URL` to your production domain:

```toml
[vars]
SERVER_URL = "https://cashchat.supastellar.dev"
```

4. **Deploy:**

```bash
wrangler deploy
```

5. **Configure custom domain:**

```bash
wrangler domains add cashchat.supastellar.dev
```

#### Limitations

- SSE transport in Workers requires custom implementation
- In-memory token storage won't persist across Worker instances
- Consider using Cloudflare KV or Durable Objects for token storage

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CASHCHAT_API_KEY` | Yes | - | Your CashChat API key |
| `PORT` | No | `3000` | HTTP server port (Node.js only) |
| `SERVER_URL` | No | `http://localhost:3000` | Public server URL for OAuth redirects |
| `OAUTH_CLIENT_ID` | No | `cashchat-mcp-server` | OAuth client identifier |
| `OAUTH_CLIENT_SECRET` | No | - | OAuth client secret (recommended for production) |
| `CASHCHAT_API_URL` | No | `https://cashchat.supastellar.dev/api` | CashChat API endpoint |

### Security Recommendations

1. **Use HTTPS in production** - OAuth requires secure connections
2. **Set OAUTH_CLIENT_SECRET** - Add an extra layer of security
3. **Implement rate limiting** - Protect against abuse
4. **Use a proper token store** - Replace in-memory storage with Redis or database
5. **Enable CORS properly** - Restrict origins in production

---

## Testing the Connection

### 1. Health Check

```bash
curl https://cashchat.supastellar.dev/health
```

Expected response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "serverUrl": "https://cashchat.supastellar.dev"
}
```

### 2. OAuth Metadata

```bash
curl https://cashchat.supastellar.dev/.well-known/oauth-authorization-server
```

Should return OAuth server configuration.

### 3. Connect from Claude Desktop

Add to Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "cashchat": {
      "url": "https://cashchat.supastellar.dev/sse",
      "oauth": {
        "authUrl": "https://cashchat.supastellar.dev/oauth/authorize",
        "tokenUrl": "https://cashchat.supastellar.dev/oauth/token",
        "clientId": "cashchat-mcp-server",
        "scopes": ["read", "write"]
      }
    }
  }
}
```

Restart Claude Desktop to connect.

---

## Troubleshooting

### Common Issues

1. **"Connection refused"**
   - Check if the server is running
   - Verify firewall rules allow the port
   - Confirm SERVER_URL is correct

2. **OAuth errors**
   - Verify OAUTH_CLIENT_ID matches in both server and client config
   - Check that SERVER_URL is publicly accessible
   - Ensure HTTPS is enabled in production

3. **API errors**
   - Verify CASHCHAT_API_KEY is correct
   - Check CASHCHAT_API_URL is accessible from your server
   - Look at server logs for detailed error messages

### Logs

View server logs to debug issues:

```bash
# Node.js deployment
tail -f /var/log/your-app.log

# Railway
railway logs

# Cloudflare Workers
wrangler tail
```

---

## Production Checklist

- [ ] Environment variables are set correctly
- [ ] HTTPS/SSL is configured
- [ ] Custom domain is configured and working
- [ ] OAuth flow completes successfully
- [ ] Health check endpoint returns healthy status
- [ ] All 8 MCP tools are working
- [ ] Server logs are being captured
- [ ] Monitoring/alerting is set up
- [ ] Backups are configured (if using persistent storage)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/supastellar/cashchat-mcp/issues
- Documentation: https://github.com/supastellar/cashchat-mcp

---

**Last updated:** January 2026
