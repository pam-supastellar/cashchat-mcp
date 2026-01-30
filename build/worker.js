/**
 * CashChat MCP Server - Cloudflare Workers Version
 *
 * This is a Cloudflare Workers-compatible version using Hono framework
 * instead of Express, since Express doesn't work in Workers environment.
 *
 * Deploy with: wrangler deploy
 *
 * Environment Variables (set with wrangler secrets):
 *   - CASHCHAT_API_KEY: Your CashChat API key (required)
 *   - OAUTH_CLIENT_SECRET: OAuth client secret (optional)
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTransactionTools } from './tools/transactions.js';
import { registerSummaryTools } from './tools/summary.js';
// Create Hono app
const app = new Hono();
// Middleware
app.use('/*', cors());
// Health check
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        version: '1.0.0',
        serverUrl: c.env.SERVER_URL || 'https://cashchat.supastellar.dev',
    });
});
// Root endpoint
app.get('/', (c) => {
    return c.json({
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
// OAuth Authorization Endpoint
app.get('/oauth/authorize', (c) => {
    const clientId = c.env.OAUTH_CLIENT_ID || 'cashchat-mcp-server';
    const serverUrl = c.env.SERVER_URL || 'https://cashchat.supastellar.dev';
    const responseType = c.req.query('response_type');
    const clientIdParam = c.req.query('client_id');
    const redirectUri = c.req.query('redirect_uri');
    const scope = c.req.query('scope');
    const state = c.req.query('state');
    const codeChallenge = c.req.query('code_challenge');
    // Validate parameters
    if (responseType !== 'code') {
        return c.json({
            error: 'unsupported_response_type',
            error_description: 'Only response_type=code is supported',
        }, 400);
    }
    if (!clientIdParam || clientIdParam !== clientId) {
        return c.json({
            error: 'invalid_client',
            error_description: 'Invalid or missing client_id',
        }, 400);
    }
    if (!redirectUri) {
        return c.json({
            error: 'invalid_request',
            error_description: 'redirect_uri is required',
        }, 400);
    }
    // Generate authorization code (simplified for demo)
    const code = generateRandomToken();
    // Redirect with authorization code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
        redirectUrl.searchParams.set('state', state);
    }
    return c.redirect(redirectUrl.toString());
});
// OAuth Token Endpoint
app.post('/oauth/token', async (c) => {
    const body = await c.req.parseBody();
    const clientId = c.env.OAUTH_CLIENT_ID || 'cashchat-mcp-server';
    const grantType = body.grant_type;
    const code = body.code;
    const redirectUri = body.redirect_uri;
    const clientIdParam = body.client_id;
    // Validate grant type
    if (grantType !== 'authorization_code') {
        return c.json({
            error: 'unsupported_grant_type',
            error_description: 'Only grant_type=authorization_code is supported',
        }, 400);
    }
    // Validate client
    if (!clientIdParam || clientIdParam !== clientId) {
        return c.json({
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
        }, 401);
    }
    if (!code || !redirectUri) {
        return c.json({
            error: 'invalid_request',
            error_description: 'code and redirect_uri are required',
        }, 400);
    }
    // Generate access token
    const accessToken = generateRandomToken();
    return c.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 2592000, // 30 days
        scope: 'read write',
    });
});
// OAuth metadata endpoint
app.get('/.well-known/oauth-authorization-server', (c) => {
    const serverUrl = c.env.SERVER_URL || 'https://cashchat.supastellar.dev';
    return c.json({
        issuer: serverUrl,
        authorization_endpoint: `${serverUrl}/oauth/authorize`,
        token_endpoint: `${serverUrl}/oauth/token`,
        revocation_endpoint: `${serverUrl}/oauth/revoke`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
        code_challenge_methods_supported: ['S256', 'plain'],
        scopes_supported: ['read', 'write'],
    });
});
// SSE endpoint (simplified - full implementation requires more work for Workers)
app.post('/sse', async (c) => {
    // Extract Bearer token
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({
            error: 'unauthorized',
            error_description: 'Missing or invalid Authorization header',
        }, 401);
    }
    // Create MCP server instance
    const server = new McpServer({
        name: 'cashchat',
        version: '1.0.0',
    });
    // Register tools
    registerTransactionTools(server);
    registerSummaryTools(server);
    // Register server info resource
    server.resource('server-info', 'cashchat://info', async () => ({
        contents: [
            {
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

Environment: Cloudflare Workers
`,
            },
        ],
    }));
    // Note: Full SSE implementation for Workers requires custom handling
    // This is a placeholder - for production, you'd need to implement
    // the SSE transport compatible with Workers' Response API
    return c.json({
        message: 'SSE endpoint - full implementation requires Workers-specific SSE handling',
        status: 'not_fully_implemented',
    });
});
// Utility: Generate random token
function generateRandomToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export default app;
