/**
 * PayloadCMS Authentication
 * Validates user credentials against PayloadCMS backend
 */
const PAYLOAD_URL = process.env.PAYLOAD_URL || 'https://cashchat.supastellar.dev';
/**
 * Authenticate user with PayloadCMS
 */
export async function authenticateWithPayload(email, password) {
    try {
        // SECURITY: Always require password for email/password authentication
        // OAuth users should use a different authentication flow
        if (!password) {
            return {
                success: false,
                error: 'Password is required for email/password authentication',
            };
        }
        const response = await fetch(`${PAYLOAD_URL}/api/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.errors?.[0]?.message || 'Invalid email or password',
            };
        }
        const data = await response.json();
        if (!data.user || !data.token) {
            return {
                success: false,
                error: 'Invalid response from authentication service',
            };
        }
        return {
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                token: data.token,
            },
        };
    }
    catch (error) {
        console.error('PayloadCMS auth error:', error);
        return {
            success: false,
            error: 'Authentication service unavailable',
        };
    }
}
/**
 * Find user by email (for OAuth flows where we don't have password)
 */
export async function findUserByEmail(email) {
    try {
        // Use PayloadCMS API to query users by email
        // Note: This requires an API key or admin authentication
        const apiKey = process.env.CASHCHAT_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: 'Server configuration error',
            };
        }
        const response = await fetch(`${PAYLOAD_URL}/api/users?where[email][equals]=${encodeURIComponent(email)}&limit=1`, {
            headers: {
                'Authorization': `users API-Key ${apiKey}`,
            },
        });
        if (!response.ok) {
            return {
                success: false,
                error: 'Failed to find user account',
            };
        }
        const data = await response.json();
        if (!data.docs || data.docs.length === 0) {
            return {
                success: false,
                error: 'No account found with this email',
            };
        }
        const user = data.docs[0];
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                token: '', // OAuth flow doesn't need PayloadCMS token
            },
        };
    }
    catch (error) {
        console.error('User lookup error:', error);
        return {
            success: false,
            error: 'Failed to verify user account',
        };
    }
}
/**
 * Verify a PayloadCMS JWT token
 */
export async function verifyPayloadToken(token) {
    try {
        const response = await fetch(`${PAYLOAD_URL}/api/users/me`, {
            headers: {
                'Authorization': `JWT ${token}`,
            },
        });
        return response.ok;
    }
    catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}
/**
 * Get user info from PayloadCMS token
 */
export async function getPayloadUser(token) {
    try {
        const response = await fetch(`${PAYLOAD_URL}/api/users/me`, {
            headers: {
                'Authorization': `JWT ${token}`,
            },
        });
        if (!response.ok) {
            return {
                success: false,
                error: 'Invalid or expired token',
            };
        }
        const data = await response.json();
        return {
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                token,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: 'Failed to fetch user info',
        };
    }
}
