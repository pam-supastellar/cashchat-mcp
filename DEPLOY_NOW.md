# 🚀 Deploy CashChat MCP to Railway - 5 Minutes

## Quick Deploy (Recommended)

### Option 1: One-Click Deploy Button
1. Click this button: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/cashchat-mcp)
2. Set environment variables:
   - `CASHCHAT_API_KEY` = (your API key)
   - `SERVER_URL` = `https://${{RAILWAY_PUBLIC_DOMAIN}}`
3. Click "Deploy"
4. Done! Copy your URL: `https://cashchat-mcp-production.up.railway.app`

### Option 2: Railway CLI (Terminal)
```bash
# From /Users/pam/cashchat-mcp directory
railway login
railway init
railway up
railway variables set CASHCHAT_API_KEY="your-key-here"
railway domain
```

### Option 3: GitHub + Railway (Auto-Deploy)
1. Push to GitHub:
   ```bash
   cd /Users/pam/cashchat-mcp
   git init
   git add .
   git commit -m "CashChat MCP Server v2.0"
   gh repo create cashchat-mcp --public --source=. --push
   ```

2. Go to https://railway.app/new
3. Click "Deploy from GitHub repo"
4. Select `cashchat-mcp`
5. Add environment variables (see below)
6. Deploy!

## Required Environment Variables

```env
CASHCHAT_API_KEY=<your_cashchat_api_key>
SERVER_URL=https://<your-app>.railway.app
```

## After Deployment

### 1. Test Health Endpoint
```bash
curl https://<your-app>.railway.app/health
```

### 2. Test OAuth Metadata
```bash
curl https://<your-app>.railway.app/.well-known/oauth-authorization-server
```

### 3. Configure Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "cashchat": {
      "url": "https://<your-app>.railway.app/sse",
      "oauth": {
        "authUrl": "https://<your-app>.railway.app/oauth/authorize",
        "tokenUrl": "https://<your-app>.railway.app/oauth/token",
        "clientId": "cashchat-mcp-server",
        "scopes": ["read", "write"]
      }
    }
  }
}
```

### 4. Restart Claude Desktop

Done! Your CashChat MCP server is live and ready to use.

## Troubleshooting

**Server won't start?**
- Check logs: `railway logs`
- Verify `CASHCHAT_API_KEY` is set
- Ensure `PORT` is not hardcoded

**OAuth fails?**
- Verify `SERVER_URL` matches your Railway domain
- Check `CASHCHAT_API_KEY` is valid
- Try OAuth flow manually: visit `/oauth/authorize`

**Tools not working?**
- Test CashChat API directly: `curl https://cashchat.supastellar.dev/api/health`
- Check server logs for errors
- Verify API key has proper permissions

---

**Deploy time:** ~5 minutes
**Cost:** $0/month (Railway free tier)
