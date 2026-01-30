declare const router: import("express-serve-static-core").Router;
declare module 'express-session' {
    interface SessionData {
        oauthParams?: {
            response_type: string;
            client_id: string;
            redirect_uri: string;
            scope: string;
            state?: string;
            code_challenge: string;
            code_challenge_method: string;
        };
        csrfToken?: string;
        googleOAuthState?: string;
    }
}
export default router;
