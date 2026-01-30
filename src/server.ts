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

import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerTransactionTools } from './tools/transactions.js';
import { registerSummaryTools } from './tools/summary.js';
import oauthRoutes from './auth/oauthRoutes.js';
import loginRoutes from './auth/loginRoutes.js';
import { requireAuth } from './auth/middleware.js';

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// SECURITY: Require SESSION_SECRET environment variable
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is required');
  console.error('Generate a secure secret with: openssl rand -base64 32');
  process.exit(1);
}
if (SESSION_SECRET.length < 32) {
  console.error('FATAL: SESSION_SECRET must be at least 32 characters long');
  console.error('Generate a secure secret with: openssl rand -base64 32');
  process.exit(1);
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SECURITY: Trust proxy to get correct client IP for rate limiting
// Set to 1 if behind a single proxy (nginx, cloudflare, etc.)
app.set('trust proxy', 1);

// Session middleware (required for OAuth login flow)
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 15 * 60 * 1000, // 15 minutes
    sameSite: 'strict', // SECURITY: Prevent CSRF attacks with strict same-site policy
  },
}));

// Rate limiting for OAuth endpoints
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    error: 'too_many_requests',
    error_description: 'Too many authorization attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    serverUrl: SERVER_URL,
    features: ['oauth2', 'pkce', 'payload-auth', 'rate-limiting'],
  });
});

// OAuth routes with rate limiting
// Login routes (authorize + login endpoints with user authentication)
app.use('/oauth', oauthLimiter, loginRoutes);

// Token endpoint (from oauthRoutes.ts - token exchange)
app.use('/oauth', oauthRoutes);

// OAuth metadata endpoint (required by Claude Desktop)
app.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
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
app.post('/sse', requireAuth, async (req: Request, res: Response) => {
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
  server.resource(
    'server-info',
    'cashchat://info',
    async () => ({
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
    })
  );

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
app.get('/messages', requireAuth, (req: Request, res: Response) => {
  // This endpoint is handled by the SSE transport
  // If we reach here, it means the transport hasn't been set up yet
  res.status(400).json({
    error: 'bad_request',
    error_description: 'SSE transport not initialized. POST to /sse first.',
  });
});

// Root endpoint with server info
app.get('/', (req: Request, res: Response) => {
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
