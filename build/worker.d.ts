/**
 * CashChat MCP Server - Cloudflare Workers Version
 *
 * This is a Cloudflare Workers-compatible version using Hono framework
 * instead of Express, since Express doesn't work in Workers environment.
 *
 * Deploy with: wrangler deploy
 *
 * Environment Variables (set with wrangler secrets):
 *   - CASHCHAT_API_KEY: Your CashChat API key (required)
 *   - OAUTH_CLIENT_SECRET: OAuth client secret (optional)
 */
import { Hono } from 'hono';
interface Env {
    CASHCHAT_API_KEY: string;
    CASHCHAT_API_URL?: string;
    SERVER_URL?: string;
    OAUTH_CLIENT_ID?: string;
    OAUTH_CLIENT_SECRET?: string;
    TOKENS?: KVNamespace;
}
declare const app: Hono<{
    Bindings: Env;
}, import("hono/types").BlankSchema, "/">;
export default app;
