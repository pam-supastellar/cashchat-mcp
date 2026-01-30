// CashChat API Client
const API_URL = process.env.CASHCHAT_API_URL || 'https://cashchat.supastellar.dev/api';
const API_KEY = process.env.CASHCHAT_API_KEY;
if (!API_KEY) {
    console.error('Warning: CASHCHAT_API_KEY not set. API calls will fail.');
}
async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                ...options.headers,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `API error ${response.status}: ${errorText}`,
            };
        }
        const data = await response.json();
        return { success: true, data: data };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
// Transaction API
export async function getTransactions(params) {
    const query = new URLSearchParams();
    if (params.startDate)
        query.set('startDate', params.startDate);
    if (params.endDate)
        query.set('endDate', params.endDate);
    if (params.category)
        query.set('category', params.category);
    if (params.limit)
        query.set('limit', params.limit.toString());
    if (params.offset)
        query.set('offset', params.offset.toString());
    return apiRequest(`/v1/transactions?${query}`);
}
export async function addTransaction(data) {
    return apiRequest('/v1/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}
export async function updateTransaction(id, data) {
    return apiRequest(`/v1/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}
export async function deleteTransaction(id) {
    return apiRequest(`/v1/transactions/${id}`, {
        method: 'DELETE',
    });
}
// Summary API
export async function getSummary(params) {
    const query = new URLSearchParams();
    query.set('period', params.period);
    if (params.date)
        query.set('date', params.date);
    return apiRequest(`/v1/summary?${query}`);
}
export async function getCategories() {
    return apiRequest('/v1/categories');
}
// Settings API
export async function getSettings() {
    return apiRequest('/v1/settings');
}
export async function updateSettings(data) {
    return apiRequest('/v1/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}
