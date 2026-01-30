import type { Transaction, Summary, UserSettings, ApiResponse } from '../types.js';
export declare function getTransactions(params: {
    startDate?: string;
    endDate?: string;
    category?: string;
    limit?: number;
    offset?: number;
}): Promise<ApiResponse<Transaction[]>>;
export declare function addTransaction(data: {
    amount: number;
    category: string;
    date: string;
    note?: string;
    type: 'expense' | 'income';
    name?: string;
}): Promise<ApiResponse<Transaction>>;
export declare function updateTransaction(id: string, data: Partial<Transaction>): Promise<ApiResponse<Transaction>>;
export declare function deleteTransaction(id: string): Promise<ApiResponse<{
    deleted: boolean;
}>>;
export declare function getSummary(params: {
    period: 'day' | 'week' | 'month' | 'year';
    date?: string;
}): Promise<ApiResponse<Summary>>;
export declare function getCategories(): Promise<ApiResponse<string[]>>;
export declare function getSettings(): Promise<ApiResponse<UserSettings>>;
export declare function updateSettings(data: Partial<UserSettings>): Promise<ApiResponse<UserSettings>>;
