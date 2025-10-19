import axios from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use(async (config) => {
  // Get the current session from Supabase
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

// Dashboard API
export const dashboard = {
  getSummary: (params?: any) => api.get('/api/dashboard/summary', { params }),
  getSpendingOverTime: (params?: any) => api.get('/api/dashboard/spending-over-time', { params }),
  getCategoryBreakdown: (params?: any) => api.get('/api/dashboard/category-breakdown', { params }),
  getSankey: (params?: any) => api.get('/api/dashboard/sankey', { params }),
};

// Transactions API
export const transactions = {
  getAll: (params?: any) => api.get('/api/transactions', { params }),
  getById: (id: string) => api.get(`/api/transactions/${id}`),
  create: (data: any) => api.post('/api/transactions', data),
  update: (id: string, data: any) => api.patch(`/api/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/api/transactions/${id}`),
  bulkUpdate: (data: any) => api.put('/api/transactions/bulk', data),
  classify: (data: any) => api.post('/api/transactions/classify', data),
  classifyBatch: (transaction_ids: string[]) => api.post('/api/transactions/classify/batch', { transaction_ids }),
  getUnclassified: (params?: any) => api.get('/api/transactions/unclassified', { params }),
};

// Accounts API
export const accounts = {
  getAll: (params?: any) => api.get('/api/accounts', { params }),
  getById: (id: string) => api.get(`/api/accounts/${id}`),
  create: (data: any) => api.post('/api/accounts', data),
  update: (id: string, data: any) => api.patch(`/api/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/api/accounts/${id}`),
};

// Categories API
export const categories = {
  getAll: (params?: any) => api.get('/api/categories', { params }),
  getById: (id: string) => api.get(`/api/categories/${id}`),
  create: (data: any) => api.post('/api/categories', data),
  update: (id: string, data: any) => api.patch(`/api/categories/${id}`, data),
  delete: (id: string) => api.delete(`/api/categories/${id}`),
};

// Transfers API
export const transfers = {
  getAll: (params?: any) => api.get('/api/transfers', { params }),
  getById: (id: string) => api.get(`/api/transfers/${id}`),
  create: (data: any) => api.post('/api/transfers', data),
  update: (id: string, data: any) => api.put(`/api/transfers/${id}`, data),
  delete: (id: string) => api.delete(`/api/transfers/${id}`),
};

// Imports API
export const imports = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/imports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  setMapping: (jobId: string, mapping: Record<string, string>) =>
    api.post(`/api/imports/${jobId}/mapping`, { mapping }),
  execute: (jobId: string, accountId: string) =>
    api.post(`/api/imports/${jobId}/execute`, { account_id: accountId }),
  getHistory: (params?: any) => api.get('/api/imports', { params }),
};

// Foreign Exchange API
export const fx = {
  getRates: (params?: any) => api.get('/api/fx/rates', { params }),
  getCurrencies: () => api.get('/api/fx/currencies'),
  convert: (data: any) => api.post('/api/fx/convert', data),
};

// Auth API
export const auth = {
  login: (data: any) => api.post('/api/auth/login', data),
  register: (data: any) => api.post('/api/auth/register', data),
  logout: () => api.post('/api/auth/logout'),
  getCurrentUser: () => api.get('/api/auth/me'),
};

export default api;
