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
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerTransactionTools } from './tools/transactions.js';
import { registerSummaryTools } from './tools/summary.js';
import oauthRoutes from './auth/oauthRoutes.js';
import { requireAuth } from './auth/middleware.js';
// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
// Create Express app
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '1.0.0',
        serverUrl: SERVER_URL,
    });
});
// OAuth routes (public - no auth required)
app.use('/oauth', oauthRoutes);
// OAuth metadata endpoint (required by Claude Desktop)
app.get('/.well-known/oauth-authorization-server', (req, res) => {
    res.json({
        issuer: SERVER_URL,
        authorization_endpoint: `${SERVER_URL}/oauth/authorize`,
        token_endpoint: `${SERVER_URL}/oauth/token`,
        revocation_endpoint: `${SERVER_URL}/oauth/revoke`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
        code_challenge_methods_supported: ['S256', 'plain'],
        scopes_supported: ['read', 'write'],
    });
});
/**
 * SSE endpoint for MCP communication
 * POST /sse
 *
 * This endpoint handles the Server-Sent Events connection for MCP.
 * Claude Desktop will connect to this endpoint after OAuth authentication.
 */
app.post('/sse', requireAuth, async (req, res) => {
    console.error(`SSE connection from user: ${req.user?.userId}`);
    // Create a new MCP server instance for this connection
    const server = new McpServer({
        name: 'cashchat',
        version: '1.0.0',
    });
    // Register all tools
    registerTransactionTools(server);
    registerSummaryTools(server);
    // Server info resource
    server.resource('server-info', 'cashchat://info', async () => ({
        contents: [{
                uri: 'cashchat://info',
                mimeType: 'text/plain',
                text: `CashChat MCP Server v1.0.0

Available tools:
- get_transactions: Fetch transactions with filters
- add_transaction: Add a new transaction
- update_transaction: Update an existing transaction
- delete_transaction: Delete a transaction
- get_summary: Get spending summary
- get_categories: List all categories
- get_settings: Get user settings
- update_settings: Update user settings

User: ${req.user?.userId}
Connected via: SSE Transport
`
            }]
    }));
    // Create SSE transport
    const transport = new SSEServerTransport('/messages', res);
    // Connect the server to the transport
    await server.connect(transport);
    console.error(`MCP server connected for user: ${req.user?.userId}`);
    // Handle client disconnect
    req.on('close', () => {
        console.error(`SSE connection closed for user: ${req.user?.userId}`);
    });
});
/**
 * Messages endpoint for SSE transport
 * GET /messages
 *
 * This is the endpoint where SSE messages are streamed to the client
 */
app.get('/messages', requireAuth, (req, res) => {
    // This endpoint is handled by the SSE transport
    // If we reach here, it means the transport hasn't been set up yet
    res.status(400).json({
        error: 'bad_request',
        error_description: 'SSE transport not initialized. POST to /sse first.',
    });
});
// Root endpoint with server info
app.get('/', (req, res) => {
    res.json({
        name: 'CashChat MCP Server',
        version: '1.0.0',
        description: 'Model Context Protocol server for CashChat financial data',
        endpoints: {
            health: '/health',
            sse: '/sse',
            oauth: {
                authorize: '/oauth/authorize',
                token: '/oauth/token',
                revoke: '/oauth/revoke',
                metadata: '/.well-known/oauth-authorization-server',
            },
        },
        documentation: 'https://github.com/supastellar/cashchat-mcp',
    });
});
// Start server
async function main() {
    app.listen(PORT, () => {
        console.error(`CashChat MCP Server running on ${SERVER_URL}`);
        console.error(`SSE endpoint: ${SERVER_URL}/sse`);
        console.error(`OAuth authorize: ${SERVER_URL}/oauth/authorize`);
        console.error('');
        console.error('Ready to accept connections from Claude Desktop!');
    });
}
main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
