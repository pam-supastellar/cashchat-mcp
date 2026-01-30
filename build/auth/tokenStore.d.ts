export interface OAuthToken {
    accessToken: string;
    userId: string;
    expiresAt: Date;
    scopes: string[];
    createdAt: Date;
}
export interface AuthorizationCode {
    code: string;
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    scopes: string[];
    expiresAt: Date;
    createdAt: Date;
    consumed: boolean;
}
/**
 * Generate a new authorization code
 */
export declare function createAuthorizationCode(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    scopes: string[];
    codeChallenge?: string;
    codeChallengeMethod?: string;
}): string;
/**
 * Verify and consume an authorization code
 */
export declare function consumeAuthorizationCode(code: string, clientId: string, redirectUri: string, codeVerifier?: string): AuthorizationCode | null;
/**
 * Create a new access token
 */
export declare function createAccessToken(userId: string, scopes: string[]): string;
/**
 * Verify an access token
 */
export declare function verifyAccessToken(accessToken: string): OAuthToken | null;
/**
 * Revoke an access token
 */
export declare function revokeAccessToken(accessToken: string): boolean;
/**
 * Clean up expired tokens (run periodically)
 */
export declare function cleanupExpiredTokens(): void;
