# CashChat MCP Server

**Connect your financial data to AI assistants like Claude**

CashChat MCP Server exposes your CashChat financial data to AI assistants via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). It supports both local stdio connections and remote URL-based connections with OAuth 2.0 authentication.

## Features

- 🔐 **OAuth 2.0 Authentication** - Secure URL-based connections for Claude Desktop
- 💰 **Transaction Management** - Query, add, update, and delete transactions
- 📊 **Financial Analytics** - Get spending summaries and category breakdowns
- ⚙️ **Settings Control** - Manage currency preferences and AI agent instructions
- 🚀 **Multiple Deployment Options** - Run locally, Node.js server, or Cloudflare Workers
- 🔌 **MCP Standard Compliant** - Works with any MCP-compatible AI assistant

## Quick Start

### For Claude Desktop Users (URL-based connection)

This is the recommended way to connect CashChat to Claude Desktop using a publicly accessible server.

#### 1. Get Your CashChat API Key

Sign up at [CashChat](https://cashchat.supastellar.dev) and get your API key from the settings page.

#### 2. Connect to the Public Server

Add this configuration to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

#### 3. Restart Claude Desktop

Restart Claude Desktop and you'll be prompted to authorize the connection. Click "Authorize" and you're ready to go!

#### 4. Try It Out

In Claude Desktop, try asking:
- "What did I spend on groceries this month?"
- "Add a transaction: $50 for dinner at Joe's Restaurant"
- "Show me my spending summary for this week"

---

## Local Development & Self-Hosting

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- CashChat API key

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/supastellar/cashchat-mcp
cd cashchat-mcp
```

2. **Install dependencies:**

```bash
npm install
```

3. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and add your CashChat API key:

```env
CASHCHAT_API_KEY=your_api_key_here
PORT=3000
SERVER_URL=http://localhost:3000
```

4. **Build the project:**

```bash
npm run build
```

5. **Start the server:**

```bash
npm run start:server
```

The server will be running at `http://localhost:3000`.

### Testing Locally

Connect Claude Desktop to your local server by updating the config:

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

**Note:** Claude Desktop may require HTTPS for OAuth. For local testing with HTTPS, use a tool like [ngrok](https://ngrok.com/) or [localtunnel](https://localtunnel.me/).

---

## Legacy stdio Mode (for local-only setup)

If you prefer the classic stdio-based local connection without OAuth:

### Claude Desktop Config (stdio mode)

```json
{
  "mcpServers": {
    "cashchat": {
      "command": "node",
      "args": ["/absolute/path/to/cashchat-mcp/build/index.js"],
      "env": {
        "CASHCHAT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

This mode runs the server as a subprocess and communicates via stdin/stdout. No HTTP server or OAuth required.

---

## Available Tools

The MCP server provides 8 tools for interacting with your financial data:

### Transaction Tools

#### `get_transactions`
Retrieve transactions with optional filters.

**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `category` (optional): Filter by category
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset

**Example:**
```
Get my transactions from January 2024
```

#### `add_transaction`
Add a new transaction.

**Parameters:**
- `amount` (required): Transaction amount
- `category` (required): Category (e.g., Food, Transport)
- `date` (required): Date (YYYY-MM-DD)
- `type` (optional): 'expense' or 'income' (default: expense)
- `note` (optional): Description
- `name` (optional): Merchant name

**Example:**
```
Add a transaction: $75 for groceries at Whole Foods on 2024-01-15
```

#### `update_transaction`
Update an existing transaction.

**Parameters:**
- `id` (required): Transaction ID
- `amount` (optional): New amount
- `category` (optional): New category
- `note` (optional): New note
- `name` (optional): New merchant name

#### `delete_transaction`
Delete a transaction.

**Parameters:**
- `id` (required): Transaction ID to delete

### Analytics Tools

#### `get_summary`
Get spending summary for a time period.

**Parameters:**
- `period` (required): 'day', 'week', 'month', or 'year'
- `date` (optional): Reference date (defaults to today)

**Example:**
```
Show me my spending summary for this month
```

#### `get_categories`
List all available transaction categories.

**Example:**
```
What categories can I use?
```

### Settings Tools

#### `get_settings`
Get your CashChat settings.

#### `update_settings`
Update your CashChat settings.

**Parameters:**
- `preferredCurrency` (optional): Currency code (USD, CAD, EUR, etc.)
- `agentInstructions` (optional): Custom instructions for AI assistant

---

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Quick Deployment Options

#### Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/cashchat-mcp)

1. Click the button above
2. Add your `CASHCHAT_API_KEY`
3. Deploy!

#### Cloudflare Workers

```bash
npm install -g wrangler
wrangler login
wrangler secret put CASHCHAT_API_KEY
wrangler deploy
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## Architecture

### URL-Based Mode (HTTP + SSE + OAuth)

```
┌─────────────────┐          ┌──────────────────┐
│  Claude Desktop │          │  CashChat MCP    │
│                 │          │  Server (HTTP)   │
├─────────────────┤          ├──────────────────┤
│                 │          │                  │
│  1. OAuth Flow  │ ◄───────►│  /oauth/*        │
│                 │          │                  │
│  2. SSE Connect │ ◄───────►│  /sse            │
│                 │          │                  │
│  3. MCP Tools   │ ◄───────►│  MCP Server      │
│                 │          │                  │
└─────────────────┘          └────────┬─────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │  CashChat API    │
                             │  (Backend)       │
                             └──────────────────┘
```

### Legacy stdio Mode

```
┌─────────────────┐          ┌──────────────────┐
│  Claude Desktop │          │  CashChat MCP    │
│                 │          │  Server (stdio)  │
├─────────────────┤          ├──────────────────┤
│                 │          │                  │
│  stdio pipe     │ ◄───────►│  MCP Server      │
│                 │          │                  │
└─────────────────┘          └────────┬─────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │  CashChat API    │
                             │  (Backend)       │
                             └──────────────────┘
```

---

## Security

- **OAuth 2.0** with PKCE support for secure authorization
- **Bearer token authentication** for API requests
- **HTTPS required** in production
- **Token expiration** (30 days default)
- **Scope-based permissions** (read/write)

### Production Security Recommendations

1. Use HTTPS only (no HTTP in production)
2. Set `OAUTH_CLIENT_SECRET` for additional security
3. Implement rate limiting
4. Use a proper database for token storage (not in-memory)
5. Rotate API keys regularly
6. Monitor access logs

---

## Troubleshooting

### "Connection refused" error

- Check if the server is running
- Verify the URL in your Claude Desktop config
- Ensure firewall allows the port

### OAuth authorization fails

- Confirm `SERVER_URL` is publicly accessible
- Check that URLs in Claude config match your server
- Verify HTTPS is enabled (required by Claude Desktop)

### "Invalid API key" error

- Check your `CASHCHAT_API_KEY` is correct
- Verify the API key is active in your CashChat account

### Tools not showing up in Claude

- Restart Claude Desktop after config changes
- Check server logs for errors
- Verify OAuth flow completed successfully

For more help, see [DEPLOYMENT.md](./DEPLOYMENT.md) or open an issue.

---

## Development

### Project Structure

```
cashchat-mcp/
├── src/
│   ├── index.ts              # Legacy stdio server
│   ├── server.ts             # HTTP/SSE server with OAuth
│   ├── worker.ts             # Cloudflare Workers version
│   ├── types.ts              # TypeScript types
│   ├── api/
│   │   └── client.ts         # CashChat API client
│   ├── auth/
│   │   ├── tokenStore.ts     # OAuth token storage
│   │   ├── middleware.ts     # Auth middleware
│   │   └── oauthRoutes.ts    # OAuth endpoints
│   └── tools/
│       ├── transactions.ts   # Transaction tools
│       └── summary.ts        # Analytics tools
├── build/                    # Compiled JavaScript
├── package.json
├── tsconfig.json
├── wrangler.toml            # Cloudflare Workers config
└── README.md
```

### Scripts

- `npm run build` - Compile TypeScript
- `npm run dev` - Watch mode for development
- `npm start` - Run stdio server (legacy)
- `npm run start:server` - Run HTTP/SSE server
- `npm run dev:server` - Development mode with auto-reload

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Links

- **CashChat:** https://cashchat.supastellar.dev
- **MCP Documentation:** https://modelcontextprotocol.io
- **Claude Desktop:** https://claude.ai/download
- **GitHub:** https://github.com/supastellar/cashchat-mcp
- **Issues:** https://github.com/supastellar/cashchat-mcp/issues

---

## Support

Need help?

- 📖 Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- 🐛 Report bugs on [GitHub Issues](https://github.com/supastellar/cashchat-mcp/issues)
- 💬 Questions? Open a [Discussion](https://github.com/supastellar/cashchat-mcp/discussions)

---

**Built with ❤️ by [Supa Stellar](https://supastellar.dev)**
