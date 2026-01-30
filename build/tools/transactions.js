// Transaction Tools for MCP
import { z } from 'zod';
import * as api from '../api/client.js';
export function registerTransactionTools(server) {
    // Get transactions
    server.tool('get_transactions', 'Get transactions from CashChat with optional filters', {
        startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
        endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
        category: z.string().optional().describe('Filter by category'),
        limit: z.number().optional().default(50).describe('Max results (default 50)'),
        offset: z.number().optional().default(0).describe('Offset for pagination'),
    }, async (params) => {
        const result = await api.getTransactions(params);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        const transactions = result.data || [];
        if (transactions.length === 0) {
            return { content: [{ type: 'text', text: 'No transactions found.' }] };
        }
        const formatted = transactions.map(tx => `• ${tx.date} | ${tx.category} | ${tx.type === 'income' ? '+' : '-'}${tx.currency}${tx.amount.toFixed(2)} | ${tx.name || tx.note || 'No description'}`).join('\n');
        return {
            content: [{
                    type: 'text',
                    text: `Found ${transactions.length} transactions:\n\n${formatted}`
                }]
        };
    });
    // Add transaction
    server.tool('add_transaction', 'Add a new transaction to CashChat', {
        amount: z.number().positive().describe('Transaction amount (positive number)'),
        category: z.string().describe('Category (e.g., Food, Transport, Shopping)'),
        date: z.string().describe('Date (YYYY-MM-DD)'),
        note: z.string().optional().describe('Optional note/description'),
        type: z.enum(['expense', 'income']).default('expense').describe('Transaction type'),
        name: z.string().optional().describe('Merchant/transaction name'),
    }, async (params) => {
        const result = await api.addTransaction(params);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        const tx = result.data;
        return {
            content: [{
                    type: 'text',
                    text: `✅ Transaction added!\n\n• Amount: ${tx.type === 'income' ? '+' : '-'}${tx.currency}${tx.amount.toFixed(2)}\n• Category: ${tx.category}\n• Date: ${tx.date}\n• Note: ${tx.note || 'None'}`
                }]
        };
    });
    // Update transaction
    server.tool('update_transaction', 'Update an existing transaction in CashChat', {
        id: z.string().describe('Transaction ID'),
        amount: z.number().positive().optional().describe('New amount'),
        category: z.string().optional().describe('New category'),
        note: z.string().optional().describe('New note'),
        name: z.string().optional().describe('New name/merchant'),
    }, async (params) => {
        const { id, ...updates } = params;
        const result = await api.updateTransaction(id, updates);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        return {
            content: [{
                    type: 'text',
                    text: `✅ Transaction ${id} updated successfully!`
                }]
        };
    });
    // Delete transaction
    server.tool('delete_transaction', 'Delete a transaction from CashChat', {
        id: z.string().describe('Transaction ID to delete'),
    }, async (params) => {
        const result = await api.deleteTransaction(params.id);
        if (!result.success) {
            return { content: [{ type: 'text', text: `Error: ${result.error}` }] };
        }
        return {
            content: [{
                    type: 'text',
                    text: `✅ Transaction ${params.id} deleted.`
                }]
        };
    });
}
