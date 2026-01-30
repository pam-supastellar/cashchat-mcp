#!/usr/bin/env node
/**
 * CashChat MCP Server
 *
 * Exposes CashChat financial data to AI assistants via Model Context Protocol.
 *
 * Usage:
 *   CASHCHAT_API_KEY=your-key node build/index.js
 *
 * Configure in Claude Desktop:
 *   ~/Library/Application Support/Claude/claude_desktop_config.json
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTransactionTools } from './tools/transactions.js';
import { registerSummaryTools } from './tools/summary.js';
// Create MCP server
const server = new McpServer({
    name: 'cashchat',
    version: '1.0.0',
});
// Register all tools
registerTransactionTools(server);
registerSummaryTools(server);
// Server info resource
server.resource('server-info', 'cashchat://info', async () => ({
    contents: [{
            uri: 'cashchat://info',
            mimeType: 'text/plain',
            text: `CashChat MCP Server v1.0.0

Available tools:
- get_transactions: Fetch transactions with filters
- add_transaction: Add a new transaction
- update_transaction: Update an existing transaction
- delete_transaction: Delete a transaction
- get_summary: Get spending summary
- get_categories: List all categories
- get_settings: Get user settings
- update_settings: Update user settings

Configuration:
- CASHCHAT_API_KEY: Your CashChat API key (required)
- CASHCHAT_API_URL: API endpoint (optional, defaults to production)
`
        }]
}));
// Start server with stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr (not stdout - that's for MCP messages)
    console.error('CashChat MCP Server started');
}
main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
