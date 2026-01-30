# Changelog

All notable changes to CashChat MCP Server will be documented in this file.

## [2.0.0] - 2026-01-29

### 🎉 Major Release - URL-Based Connections with OAuth 2.0

This is a major update that adds support for URL-based connections in Claude Desktop, making it easy for users to connect without manual config file editing.

### Added

#### Core Features
- **OAuth 2.0 Authentication Flow** - Full OAuth 2.0 implementation with PKCE support
  - Authorization endpoint (`/oauth/authorize`)
  - Token endpoint (`/oauth/token`)
  - Token revocation endpoint (`/oauth/revoke`)
  - OAuth metadata endpoint (`/.well-known/oauth-authorization-server`)

- **HTTP/SSE Server Transport** - New Express-based server with Server-Sent Events
  - SSE endpoint for MCP communication (`/sse`)
  - Health check endpoint (`/health`)
  - Secure Bearer token authentication
  - CORS support for cross-origin requests

- **Token Management System**
  - In-memory token storage (production-ready for persistent storage)
  - Authorization code generation and validation
  - Access token creation and verification
  - Automatic token expiration (30 days)
  - PKCE challenge verification

#### Files Added
- `src/server.ts` - HTTP/SSE server implementation with Express
- `src/worker.ts` - Cloudflare Workers-compatible version using Hono
- `src/auth/tokenStore.ts` - OAuth token storage and management
- `src/auth/middleware.ts` - Authentication middleware for Express
- `src/auth/oauthRoutes.ts` - OAuth 2.0 endpoint implementations
- `wrangler.toml` - Cloudflare Workers configuration
- `.env.example` - Environment variables template
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `CHANGELOG.md` - This changelog

#### Documentation
- Updated `README.md` with URL-based setup instructions
- Added architecture diagrams for both URL and stdio modes
- Added troubleshooting section
- Added security recommendations
- Created detailed deployment guide

#### Scripts
- `npm run start:server` - Start HTTP/SSE server
- `npm run dev:server` - Development mode with auto-reload

### Changed

- **Maintained Backward Compatibility** - Original stdio mode (`src/index.ts`) remains unchanged
- **Updated package.json** - Added new dependencies for HTTP server and OAuth
- **Enhanced TypeScript Configuration** - Added Cloudflare Workers types

### Dependencies

#### New Dependencies
- `express` (^5.2.1) - HTTP server framework
- `cors` (^2.8.6) - CORS middleware
- `uuid` (^13.0.0) - UUID generation for tokens
- `@types/express` (^5.0.6) - TypeScript types for Express
- `@types/cors` (^2.8.19) - TypeScript types for CORS
- `@types/uuid` (^10.0.0) - TypeScript types for UUID
- `@cloudflare/workers-types` (latest) - TypeScript types for Cloudflare Workers

### Technical Details

#### Architecture
The server now supports two modes:

1. **Legacy stdio mode** - Local subprocess communication (existing functionality)
2. **URL-based mode** - HTTP server with SSE transport and OAuth (new)

#### Security Features
- OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- Bearer token authentication
- Secure authorization code flow
- Token expiration and revocation
- HTTPS support for production

#### Deployment Options
- Local development server
- Node.js hosting (Railway, DigitalOcean, AWS, etc.)
- Cloudflare Workers (with Hono framework)

### Testing

All 8 existing MCP tools verified to work:
- ✅ `get_transactions` - Fetch transactions with filters
- ✅ `add_transaction` - Add new transactions
- ✅ `update_transaction` - Update existing transactions
- ✅ `delete_transaction` - Delete transactions
- ✅ `get_summary` - Get spending summaries
- ✅ `get_categories` - List categories
- ✅ `get_settings` - Get user settings
- ✅ `update_settings` - Update user settings

### Migration Guide

#### For Existing Users (stdio mode)
No changes required! Your existing configuration will continue to work.

#### For New Users (URL-based mode)
See the [Quick Start](README.md#quick-start) section in README.md.

### Breaking Changes

None. This release is fully backward compatible with version 1.0.0.

### Known Limitations

1. **Token Storage** - Currently uses in-memory storage. For production with multiple instances, implement Redis or database storage.

2. **Cloudflare Workers SSE** - The Workers version has limited SSE support due to runtime constraints. The Node.js version is recommended for production.

3. **HTTPS Requirement** - Claude Desktop requires HTTPS for OAuth in production. Use a reverse proxy or hosting platform with SSL support.

### Future Enhancements

- [ ] Persistent token storage with Redis/PostgreSQL
- [ ] Rate limiting middleware
- [ ] Advanced OAuth scopes (read-only mode)
- [ ] WebSocket transport option
- [ ] Multi-user support with proper user authentication
- [ ] Admin dashboard for token management
- [ ] Metrics and monitoring integration

---

## [1.0.0] - 2024-01-27

### Initial Release

- Basic MCP server with stdio transport
- 8 financial data tools for CashChat
- Transaction management (CRUD operations)
- Spending summaries and analytics
- Category management
- User settings control
- Claude Desktop integration via stdio

---

**For detailed upgrade instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**
