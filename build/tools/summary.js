// Summary & Analytics Tools for MCP
import { z } from 'zod';
import * as api from '../api/client.js';
export function registerSummaryTools(server) {
    // Get spending summary
    server.tool('get_summary', 'Get spending summary for a time period', {
        period: z.enum(['day', 'week', 'month', 'year']).describe('Time period'),
        date: z.string().optional().describe('Reference date (YYYY-MM-DD, defaults to today)'),
    }, async (params) => {
        const result = await api.getSummary(params);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        const summary = result.data;
        // Format category breakdown
        const categoryLines = Object.entries(summary.byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amount]) => `  • ${cat}: $${amount.toFixed(2)}`)
            .join('\n');
        return {
            content: [{
                    type: 'text',
                    text: `📊 Spending Summary (${summary.period})\n\n` +
                        `Period: ${summary.startDate} to ${summary.endDate}\n` +
                        `Total: $${summary.total.toFixed(2)}\n` +
                        `Transactions: ${summary.transactionCount}\n\n` +
                        `By Category:\n${categoryLines || '  No transactions'}`
                }]
        };
    });
    // Get categories
    server.tool('get_categories', 'Get list of transaction categories', {}, async () => {
        const result = await api.getCategories();
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        const categories = result.data || [];
        return {
            content: [{
                    type: 'text',
                    text: categories.length > 0
                        ? `📁 Categories:\n${categories.map(c => `  • ${c}`).join('\n')}`
                        : 'No categories found.'
                }]
        };
    });
    // Get settings
    server.tool('get_settings', 'Get CashChat user settings', {}, async () => {
        const result = await api.getSettings();
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        const settings = result.data;
        return {
            content: [{
                    type: 'text',
                    text: `⚙️ CashChat Settings\n\n` +
                        `• Preferred Currency: ${settings.preferredCurrency}\n` +
                        `• Agent Instructions: ${settings.agentInstructions || 'None set'}`
                }]
        };
    });
    // Update settings
    server.tool('update_settings', 'Update CashChat user settings', {
        preferredCurrency: z.string().optional().describe('Currency code (USD, CAD, INR, etc.)'),
        agentInstructions: z.string().optional().describe('Custom instructions for AI assistant'),
    }, async (params) => {
        const result = await api.updateSettings(params);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        return {
            content: [{
                    type: 'text',
                    text: `✅ Settings updated!`
                }]
        };
    });
}
