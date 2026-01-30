// OAuth Token Storage
// In production, use a database like Redis or PostgreSQL
// For now, using in-memory storage for simplicity
import { randomBytes, createHash } from 'crypto';
// In-memory storage (replace with database in production)
const tokens = new Map();
const authorizationCodes = new Map();
// Configuration
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
/**
 * Generate a new authorization code
 */
export function createAuthorizationCode(params) {
    const code = randomBytes(32).toString('base64url');
    const authCode = {
        code,
        userId: params.userId,
        clientId: params.clientId,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: params.codeChallengeMethod,
        scopes: params.scopes,
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
        createdAt: new Date(),
    };
    authorizationCodes.set(code, authCode);
    // Clean up expired codes
    setTimeout(() => authorizationCodes.delete(code), CODE_EXPIRY_MS);
    return code;
}
/**
 * Verify and consume an authorization code
 */
export function consumeAuthorizationCode(code, clientId, redirectUri, codeVerifier) {
    const authCode = authorizationCodes.get(code);
    if (!authCode) {
        return null;
    }
    // Check expiry
    if (authCode.expiresAt < new Date()) {
        authorizationCodes.delete(code);
        return null;
    }
    // Verify client and redirect URI match
    if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
        return null;
    }
    // Verify PKCE if present
    if (authCode.codeChallenge && codeVerifier) {
        const hash = createHash('sha256').update(codeVerifier).digest('base64url');
        if (hash !== authCode.codeChallenge) {
            return null;
        }
    }
    // Code is valid - consume it (one-time use)
    authorizationCodes.delete(code);
    return authCode;
}
/**
 * Create a new access token
 */
export function createAccessToken(userId, scopes) {
    const accessToken = randomBytes(32).toString('base64url');
    const token = {
        accessToken,
        userId,
        scopes,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
        createdAt: new Date(),
    };
    tokens.set(accessToken, token);
    return accessToken;
}
/**
 * Verify an access token
 */
export function verifyAccessToken(accessToken) {
    const token = tokens.get(accessToken);
    if (!token) {
        return null;
    }
    // Check expiry
    if (token.expiresAt < new Date()) {
        tokens.delete(accessToken);
        return null;
    }
    return token;
}
/**
 * Revoke an access token
 */
export function revokeAccessToken(accessToken) {
    return tokens.delete(accessToken);
}
/**
 * Clean up expired tokens (run periodically)
 */
export function cleanupExpiredTokens() {
    const now = new Date();
    // Clean up expired tokens
    for (const [token, data] of tokens.entries()) {
        if (data.expiresAt < now) {
            tokens.delete(token);
        }
    }
    // Clean up expired authorization codes
    for (const [code, data] of authorizationCodes.entries()) {
        if (data.expiresAt < now) {
            authorizationCodes.delete(code);
        }
    }
}
// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
