// CashChat API Types

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  note?: string;
  type: 'expense' | 'income';
  source: 'user' | 'gmail' | 'telegram';
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  total: number;
  byCategory: Record<string, number>;
  transactionCount: number;
  period: string;
  startDate: string;
  endDate: string;
}

export interface UserSettings {
  preferredCurrency: string;
  agentInstructions?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Tool input types
export interface GetTransactionsInput {
  startDate?: string;
  endDate?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface AddTransactionInput {
  amount: number;
  category: string;
  date: string;
  note?: string;
  type: 'expense' | 'income';
  name?: string;
}

export interface UpdateTransactionInput {
  id: string;
  amount?: number;
  category?: string;
  note?: string;
  name?: string;
}

export interface GetSummaryInput {
  period: 'day' | 'week' | 'month' | 'year';
  date?: string;
}
