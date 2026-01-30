import { Request, Response, NextFunction } from 'express';
import { OAuthToken } from './tokenStore.js';
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
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to check for specific scopes
 */
export declare function requireScopes(...requiredScopes: string[]): (req: Request, res: Response, next: NextFunction) => void;
