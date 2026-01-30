// Authentication Middleware for Express

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, OAuthToken } from './tokenStore.js';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        scopes: string[];
        token: OAuthToken;
      };
    }
  }
}

/**
 * Middleware to verify OAuth access token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
export function requireScopes(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'unauthorized',
        error_description: 'Authentication required',
      });
      return;
    }

    const hasAllScopes = requiredScopes.every(scope =>
      req.user!.scopes.includes(scope)
    );

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
