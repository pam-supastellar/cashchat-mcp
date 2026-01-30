// OAuth 2.0 Routes
import { Router } from 'express';
import { consumeAuthorizationCode, createAccessToken, revokeAccessToken, } from './tokenStore.js';
const router = Router();
// OAuth configuration
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'cashchat-mcp-server';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
// NOTE: /oauth/authorize endpoint moved to loginRoutes.ts
// This route now handles proper user authentication with login page
/**
 * OAuth Token Endpoint
 * POST /oauth/token
 *
 * Exchange authorization code for access token
 */
router.post('/token', (req, res) => {
    const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier, } = req.body;
    // Validate grant type
    if (grant_type !== 'authorization_code') {
        res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Only grant_type=authorization_code is supported',
        });
        return;
    }
    // Validate client credentials
    if (!client_id || client_id !== OAUTH_CLIENT_ID) {
        res.status(401).json({
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
        });
        return;
    }
    // Client secret is optional for public clients (PKCE is used instead)
    if (OAUTH_CLIENT_SECRET && client_secret !== OAUTH_CLIENT_SECRET) {
        res.status(401).json({
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
        });
        return;
    }
    // Validate required parameters
    if (!code || !redirect_uri) {
        res.status(400).json({
            error: 'invalid_request',
            error_description: 'code and redirect_uri are required',
        });
        return;
    }
    // Exchange authorization code for access token
    const authCode = consumeAuthorizationCode(String(code), String(client_id), String(redirect_uri), code_verifier);
    if (!authCode) {
        res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid or expired authorization code',
        });
        return;
    }
    // Create access token
    const accessToken = createAccessToken(authCode.userId, authCode.scopes);
    // Return token response
    res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
        scope: authCode.scopes.join(' '),
    });
});
/**
 * OAuth Token Revocation Endpoint
 * POST /oauth/revoke
 *
 * Revoke an access token
 */
router.post('/revoke', (req, res) => {
    const { token } = req.body;
    if (!token) {
        res.status(400).json({
            error: 'invalid_request',
            error_description: 'token is required',
        });
        return;
    }
    // Revoke the token
    revokeAccessToken(String(token));
    // Always return 200 OK (even if token doesn't exist)
    res.json({ success: true });
});
/**
 * OAuth Metadata Endpoint
 * GET /.well-known/oauth-authorization-server
 *
 * Returns OAuth 2.0 server metadata
 */
router.get('/.well-known/oauth-authorization-server', (req, res) => {
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
export default router;
