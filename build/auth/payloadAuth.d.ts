/**
 * PayloadCMS Authentication
 * Validates user credentials against PayloadCMS backend
 */
interface PayloadAuthResponse {
    success: boolean;
    user?: {
        id: string;
        email: string;
        token: string;
    };
    error?: string;
}
/**
 * Authenticate user with PayloadCMS
 */
export declare function authenticateWithPayload(email: string, password: string): Promise<PayloadAuthResponse>;
/**
 * Verify a PayloadCMS JWT token
 */
export declare function verifyPayloadToken(token: string): Promise<boolean>;
/**
 * Get user info from PayloadCMS token
 */
export declare function getPayloadUser(token: string): Promise<PayloadAuthResponse>;
export {};
