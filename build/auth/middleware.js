// Authentication Middleware for Express
import { verifyAccessToken } from './tokenStore.js';
/**
 * Middleware to verify OAuth access token
 */
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'unauthorized',
            error_description: 'Missing or invalid Authorization header',
        });
        return;
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const tokenData = verifyAccessToken(token);
    if (!tokenData) {
        res.status(401).json({
            error: 'invalid_token',
            error_description: 'Token is invalid or expired',
        });
        return;
    }
    // Attach user info to request
    req.user = {
        userId: tokenData.userId,
        scopes: tokenData.scopes,
        token: tokenData,
    };
    next();
}
/**
 * Middleware to check for specific scopes
 */
export function requireScopes(...requiredScopes) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'unauthorized',
                error_description: 'Authentication required',
            });
            return;
        }
        const hasAllScopes = requiredScopes.every(scope => req.user.scopes.includes(scope));
        if (!hasAllScopes) {
            res.status(403).json({
                error: 'insufficient_scope',
                error_description: `Required scopes: ${requiredScopes.join(', ')}`,
            });
            return;
        }
        next();
    };
}
