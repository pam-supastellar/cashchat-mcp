import { Router } from 'express';
import { authenticateWithPayload, findUserByEmail } from './payloadAuth.js';
import { createAuthorizationCode } from './tokenStore.js';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'cashchat-mcp-server';
// Whitelist of allowed redirect URIs for security
const ALLOWED_REDIRECT_URIS = [
    'http://localhost:8080/callback',
    'http://localhost:3001/callback',
    'claude-desktop://oauth/callback',
];
/**
 * OAuth Authorization Endpoint - Step 1
 * Validates OAuth params and shows login page
 */
router.get('/authorize', (req, res) => {
    const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, } = req.query;
    // Validate response_type
    if (response_type !== 'code') {
        return res.status(400).json({
            error: 'unsupported_response_type',
            error_description: 'Only response_type=code is supported',
        });
    }
    // Validate client_id
    if (!client_id || client_id !== OAUTH_CLIENT_ID) {
        return res.status(400).json({
            error: 'invalid_client',
            error_description: 'Invalid or missing client_id',
        });
    }
    // Validate redirect_uri
    if (!redirect_uri || typeof redirect_uri !== 'string') {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'redirect_uri is required',
        });
    }
    // SECURITY: Validate redirect_uri against whitelist (exact match only)
    // Using exact match prevents attacks like:
    // - allowed: 'https://example.com/callback'
    // - attack: 'https://example.com/callback.evil.com'
    const isAllowedRedirect = ALLOWED_REDIRECT_URIS.includes(redirect_uri);
    if (!isAllowedRedirect) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'redirect_uri not in whitelist',
        });
    }
    // ENFORCE PKCE (required for public clients)
    if (!code_challenge || !code_challenge_method) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'PKCE is required: code_challenge and code_challenge_method must be provided',
        });
    }
    // Only allow S256 (more secure than plain)
    if (code_challenge_method !== 'S256') {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Only S256 code_challenge_method is supported',
        });
    }
    // Generate CSRF token for form submission protection
    const csrfToken = crypto.randomBytes(32).toString('hex');
    // Store OAuth parameters and CSRF token in session
    req.session.oauthParams = {
        response_type: String(response_type),
        client_id: String(client_id),
        redirect_uri: String(redirect_uri),
        scope: scope ? String(scope) : 'read write',
        state: state ? String(state) : undefined,
        code_challenge: String(code_challenge),
        code_challenge_method: String(code_challenge_method),
    };
    req.session.csrfToken = csrfToken;
    // Save session before redirecting
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Failed to initialize session',
            });
        }
        // Serve login page with CSRF token embedded
        res.send(generateLoginHTML(csrfToken));
    });
});
/**
 * OAuth Login Endpoint - Step 2
 * Validates credentials and issues authorization code
 */
router.post('/login', async (req, res) => {
    const { email, password, csrf_token } = req.body;
    // Validate input
    if (!email || !password) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Email and password are required',
        });
    }
    // SECURITY: Validate CSRF token
    if (!csrf_token || !req.session.csrfToken) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'CSRF token is missing. Please start the authorization flow again.',
        });
    }
    if (csrf_token !== req.session.csrfToken) {
        return res.status(403).json({
            error: 'access_denied',
            error_description: 'Invalid CSRF token. Possible CSRF attack detected.',
        });
    }
    // Clear CSRF token after validation (one-time use)
    delete req.session.csrfToken;
    // Check session for OAuth params
    if (!req.session.oauthParams) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'OAuth session expired. Please start the authorization flow again.',
        });
    }
    // Authenticate with PayloadCMS
    const authResult = await authenticateWithPayload(email, password);
    if (!authResult.success || !authResult.user) {
        return res.status(401).json({
            error: 'access_denied',
            error_description: authResult.error || 'Invalid email or password',
        });
    }
    // Store OAuth params and user ID before regenerating session
    const oauthParams = req.session.oauthParams;
    const userId = authResult.user.id;
    if (!oauthParams) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'OAuth session expired. Please start the authorization flow again.',
        });
    }
    // SECURITY: Regenerate session after successful authentication to prevent session fixation
    req.session.regenerate((err) => {
        if (err) {
            console.error('Session regeneration error:', err);
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Failed to establish secure session',
            });
        }
        // Extract OAuth params
        const { client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, } = oauthParams;
        // Generate authorization code
        const code = createAuthorizationCode({
            userId: userId,
            clientId: client_id,
            redirectUri: redirect_uri,
            scopes: scope.split(' '),
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method,
        });
        // Build redirect URL with authorization code
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('code', code);
        if (state) {
            redirectUrl.searchParams.set('state', state);
        }
        // Return redirect URL (client-side JS will handle redirect)
        res.json({
            success: true,
            redirectUrl: redirectUrl.toString(),
        });
    });
});
/**
 * OAuth Error Page
 */
router.get('/error', (req, res) => {
    const { error, error_description } = req.query;
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authorization Error - CashChat</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 40px;
          max-width: 500px;
          text-align: center;
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #333; margin-bottom: 15px; font-size: 24px; }
        .error-code {
          background: #fed7d7;
          color: #c53030;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-family: monospace;
          font-size: 14px;
        }
        p { color: #666; line-height: 1.6; margin-bottom: 25px; }
        .btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>Authorization Error</h1>
        <div class="error-code">${error || 'unknown_error'}</div>
        <p>${error_description || 'Something went wrong during authorization. Please try again.'}</p>
        <a href="/" class="btn">Return to Home</a>
      </div>
    </body>
    </html>
  `);
});
/**
 * Google OAuth Initiate - Store state in session
 */
router.post('/google/initiate', (req, res) => {
    const { state } = req.body;
    if (!state || typeof state !== 'string') {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'State parameter is required',
        });
    }
    // SECURITY: Store state in session for CSRF protection
    req.session.googleOAuthState = state;
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Failed to store session state',
            });
        }
        res.json({ success: true });
    });
});
/**
 * Google OAuth Callback Handler
 */
router.get('/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    // Handle OAuth errors from Google
    if (error) {
        return res.redirect(`/oauth/error?error=access_denied&error_description=${encodeURIComponent('Google authentication was cancelled or failed')}`);
    }
    // SECURITY: Validate state parameter against stored session value (CSRF protection)
    if (!state || typeof state !== 'string') {
        return res.redirect('/oauth/error?error=invalid_request&error_description=Missing state parameter');
    }
    if (!req.session.googleOAuthState) {
        return res.redirect('/oauth/error?error=invalid_request&error_description=Session expired. Please try again.');
    }
    if (state !== req.session.googleOAuthState) {
        console.error('Google OAuth CSRF attack detected: state mismatch');
        return res.redirect('/oauth/error?error=access_denied&error_description=Invalid state parameter. Possible CSRF attack detected.');
    }
    // Clear the state from session after validation (one-time use)
    delete req.session.googleOAuthState;
    if (!req.session.oauthParams) {
        return res.redirect('/oauth/error?error=invalid_request&error_description=OAuth session expired. Please try again.');
    }
    if (!code) {
        return res.redirect('/oauth/error?error=invalid_request&error_description=Missing authorization code from Google');
    }
    try {
        // Exchange Google authorization code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: String(code),
                client_id: process.env.GOOGLE_CLIENT_ID || '',
                client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                redirect_uri: `${process.env.SERVER_URL || 'http://localhost:3000'}/oauth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });
        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange Google authorization code');
        }
        const tokenData = await tokenResponse.json();
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
            },
        });
        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch Google user info');
        }
        const googleUser = await userInfoResponse.json();
        // For Google OAuth, we need to find the user by email (not authenticate with password)
        // This should use findUserByEmail or a separate OAuth user lookup
        const authResult = await findUserByEmail(googleUser.email);
        if (!authResult.success || !authResult.user) {
            return res.redirect(`/oauth/error?error=access_denied&error_description=${encodeURIComponent('No CashChat account found for this Google account. Please sign up first.')}`);
        }
        // Store OAuth params and user ID before regenerating session
        const oauthParams = req.session.oauthParams;
        const userId = authResult.user.id;
        if (!oauthParams) {
            return res.redirect('/oauth/error?error=invalid_request&error_description=OAuth session expired. Please try again.');
        }
        // SECURITY: Regenerate session after successful authentication to prevent session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                return res.redirect('/oauth/error?error=server_error&error_description=Failed to establish secure session');
            }
            // Extract OAuth params
            const { client_id, redirect_uri, scope, state: oauthState, code_challenge, code_challenge_method, } = oauthParams;
            // Generate authorization code
            const authCode = createAuthorizationCode({
                userId: userId,
                clientId: client_id,
                redirectUri: redirect_uri,
                scopes: scope.split(' '),
                codeChallenge: code_challenge,
                codeChallengeMethod: code_challenge_method,
            });
            // Build redirect URL with authorization code
            const redirectUrl = new URL(redirect_uri);
            redirectUrl.searchParams.set('code', authCode);
            if (oauthState) {
                redirectUrl.searchParams.set('state', oauthState);
            }
            // Redirect back to Claude Desktop
            res.redirect(redirectUrl.toString());
        });
    }
    catch (error) {
        console.error('Google OAuth error:', error);
        return res.redirect('/oauth/error?error=server_error&error_description=Failed to authenticate with Google');
    }
});
/**
 * Generate login HTML with embedded CSRF token
 */
function generateLoginHTML(csrfToken) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    const hasGoogleOAuth = !!googleClientId;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to CashChat</title>
  ${hasGoogleOAuth ? '<script src="https://accounts.google.com/gsi/client" async defer></script>' : ''}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 48px;
      max-width: 420px;
      width: 100%;
      animation: slideUp 0.4s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .logo {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo h1 {
      font-size: 36px;
      color: #2d3748;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .logo p {
      color: #718096;
      font-size: 15px;
    }

    .oauth-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .oauth-badge-icon {
      font-size: 24px;
    }

    .oauth-badge-text {
      flex: 1;
    }

    .oauth-badge-text strong {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .oauth-badge-text p {
      font-size: 13px;
      opacity: 0.9;
      line-height: 1.4;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #2d3748;
      font-weight: 600;
      font-size: 14px;
    }

    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.2s;
      background: #f7fafc;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    }

    input::placeholder {
      color: #a0aec0;
    }

    .error-message {
      background: #fed7d7;
      color: #c53030;
      padding: 14px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
      animation: shake 0.4s ease-out;
    }

    .error-message.show {
      display: block;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }

    .btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .btn:hover::before {
      width: 300px;
      height: 300px;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .btn:disabled:hover {
      transform: none;
      box-shadow: none;
    }

    .btn-content {
      position: relative;
      z-index: 1;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 24px 0;
      color: #a0aec0;
      font-size: 14px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e2e8f0;
    }

    .divider span {
      padding: 0 16px;
      font-weight: 500;
    }

    .btn-google {
      background: white;
      color: #2d3748;
      border: 2px solid #e2e8f0;
      margin-bottom: 20px;
    }

    .btn-google:hover {
      background: #f7fafc;
      border-color: #cbd5e0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .btn-google:hover::before {
      display: none;
    }

    .google-icon {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      vertical-align: middle;
    }

    .hidden {
      display: none;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .footer {
      text-align: center;
      margin-top: 28px;
      font-size: 13px;
      color: #718096;
    }

    .footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .container {
        padding: 32px 24px;
      }

      .logo h1 {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>💰 CashChat</h1>
      <p>Connect your finances to AI</p>
    </div>

    <div class="oauth-badge">
      <div class="oauth-badge-icon">🔐</div>
      <div class="oauth-badge-text">
        <strong>Claude Desktop Authorization</strong>
        <p>Sign in to allow Claude Desktop to access your CashChat financial data.</p>
      </div>
    </div>

    <div id="errorMessage" class="error-message"></div>

    ${hasGoogleOAuth ? `
    <button type="button" class="btn btn-google" id="googleSignInBtn">
      <span class="btn-content">
        <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </span>
    </button>

    <div class="divider">
      <span>or sign in with email</span>
    </div>
    ` : ''}

    <form id="loginForm">
      <input type="hidden" name="csrf_token" id="csrfToken" value="${csrfToken}">

      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          autocomplete="email"
          autofocus
        >
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          autocomplete="current-password"
        >
      </div>

      <button type="submit" class="btn" id="submitBtn">
        <span class="btn-content">Sign In & Authorize</span>
      </button>
    </form>

    <div class="footer">
      <p>
        Don't have an account?
        <a href="https://cashchat.supastellar.dev/signup" target="_blank">Sign up</a>
      </p>
      <p style="margin-top: 12px;">
        <a href="https://cashchat.supastellar.dev/privacy" target="_blank">Privacy</a> •
        <a href="https://cashchat.supastellar.dev/terms" target="_blank">Terms</a>
      </p>
    </div>
  </div>

  <script>
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');
    const btnContent = submitBtn.querySelector('.btn-content');
    const googleSignInBtn = document.getElementById('googleSignInBtn');

    // Google Sign-In handler
    if (googleSignInBtn) {
      googleSignInBtn.addEventListener('click', async () => {
        // Generate and store state parameter in session for CSRF protection
        const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

        // Store state in session before redirecting
        try {
          const response = await fetch('/oauth/google/initiate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ state }),
          });

          if (!response.ok) {
            showError('Failed to initiate Google Sign-In. Please try again.');
            return;
          }

          const data = await response.json();

          // Redirect to Google OAuth with state parameter
          const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
          googleAuthUrl.searchParams.set('client_id', '${googleClientId}');
          googleAuthUrl.searchParams.set('redirect_uri', '${serverUrl}/oauth/google/callback');
          googleAuthUrl.searchParams.set('response_type', 'code');
          googleAuthUrl.searchParams.set('scope', 'email profile');
          googleAuthUrl.searchParams.set('access_type', 'offline');
          googleAuthUrl.searchParams.set('state', state);

          window.location.href = googleAuthUrl.toString();
        } catch (error) {
          showError('Network error. Please check your connection and try again.');
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const csrfToken = document.getElementById('csrfToken').value;

      // Validate
      if (!email || !password) {
        showError('Please enter both email and password');
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      btnContent.innerHTML = '<span class="spinner"></span>Signing in...';
      errorDiv.classList.remove('show');

      try {
        const response = await fetch('/oauth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, csrf_token: csrfToken }),
        });

        const data = await response.json();

        if (response.ok && data.success && data.redirectUrl) {
          // Success! Redirect to Claude Desktop
          btnContent.innerHTML = '✓ Success! Redirecting...';
          setTimeout(() => {
            window.location.href = data.redirectUrl;
          }, 500);
        } else {
          // Show error
          showError(data.error_description || 'Invalid email or password. Please try again.');
          resetButton();
        }
      } catch (error) {
        showError('Network error. Please check your connection and try again.');
        resetButton();
      }
    });

    function showError(message) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }

    function resetButton() {
      submitBtn.disabled = false;
      btnContent.innerHTML = 'Sign In & Authorize';
    }
  </script>
</body>
</html>`;
}
export default router;
