# Quick Start Guide

Get CashChat MCP Server running in under 5 minutes!

## For Users (Claude Desktop)

### Option 1: Use Public Server (Easiest)

1. Open Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add this configuration:

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

3. Restart Claude Desktop

4. Click "Authorize" when prompted

5. Done! Try: "Show me my spending this month"

---

## For Developers

### Run Locally in 3 Commands

```bash
# 1. Clone and install
git clone https://github.com/supastellar/cashchat-mcp
cd cashchat-mcp && npm install

# 2. Configure (get API key from cashchat.supastellar.dev)
echo "CASHCHAT_API_KEY=your_key_here" > .env

# 3. Build and run
npm run build && npm run start:server
```

Server runs on `http://localhost:3000`

### Connect Claude Desktop to Local Server

Edit config file:

```json
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
```

**Note**: For local testing with OAuth, you may need HTTPS. Use [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
# Update URLs in config to use ngrok HTTPS URL
```

---

## Deploy to Production

### Railway (Recommended - 2 minutes)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway init
railway variables set CASHCHAT_API_KEY=your_key
railway up
```

Railway will give you a public URL. Update Claude config with that URL.

### Cloudflare Workers (5 minutes)

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Login and deploy
wrangler login
wrangler secret put CASHCHAT_API_KEY
wrangler deploy
```

Configure custom domain in Cloudflare dashboard.

---

## Test It Works

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Should return:
```json
{"status": "healthy", "version": "1.0.0"}
```

### 2. OAuth Metadata

```bash
curl http://localhost:3000/.well-known/oauth-authorization-server
```

Should return OAuth configuration.

### 3. Try in Claude Desktop

Ask Claude:
- "What did I spend on groceries this month?"
- "Add a $20 lunch transaction"
- "Show my spending summary"

---

## Common Issues

### "Connection refused"

Server not running. Start with:
```bash
npm run start:server
```

### "Invalid API key"

Get API key from [CashChat](https://cashchat.supastellar.dev) settings.

### "OAuth error"

Make sure URLs in Claude config match your server exactly.

---

## What's Next?

- 📖 Read [README.md](README.md) for detailed documentation
- 🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- 🧪 Check [TESTING.md](TESTING.md) for testing guide
- 🐛 Report issues on [GitHub](https://github.com/supastellar/cashchat-mcp/issues)

---

## Need Help?

- **Documentation**: Full docs in [README.md](README.md)
- **Deployment**: Step-by-step in [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/supastellar/cashchat-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/supastellar/cashchat-mcp/discussions)

---

**That's it! You're ready to use CashChat with Claude.** 🎉
