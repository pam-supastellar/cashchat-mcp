#!/usr/bin/env node
/**
 * CashChat MCP Server - HTTP/SSE Version
 *
 * Exposes CashChat financial data to AI assistants via Model Context Protocol
 * over HTTP with Server-Sent Events (SSE) transport and OAuth 2.0 authentication.
 *
 * Usage:
 *   CASHCHAT_API_KEY=your-key node build/server.js
 *
 * Environment Variables:
 *   - CASHCHAT_API_KEY: Your CashChat API key (required)
 *   - CASHCHAT_API_URL: API endpoint (optional)
 *   - PORT: HTTP server port (default: 3000)
 *   - SERVER_URL: Public server URL (for OAuth redirects)
 *   - OAUTH_CLIENT_ID: OAuth client ID (optional)
 *   - OAUTH_CLIENT_SECRET: OAuth client secret (optional)
 */
export {};
