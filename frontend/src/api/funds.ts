import apiClient from './client';
import type { Fund, NavHistory, RealtimeNav, PaginatedResponse } from '../types';

export const fundsApi = {
  // List all funds
  listFunds: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Fund>> => {
    const response = await apiClient.get('/api/v1/funds', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  // Search funds
  searchFunds: async (query: string): Promise<Fund[]> => {
    const response = await apiClient.get('/api/v1/funds/search', {
      params: { q: query },
    });
    return response.data;
  },

  // Get fund by code
  getFund: async (code: string): Promise<Fund> => {
    const response = await apiClient.get(`/api/v1/funds/${code}`);
    return response.data;
  },

  // Create fund
  createFund: async (data: {
    code: string;
    name: string;
    type?: string;
    company?: string;
  }): Promise<Fund> => {
    const response = await apiClient.post('/api/v1/funds', data);
    return response.data;
  },

  // Delete fund
  deleteFund: async (code: string): Promise<void> => {
    await apiClient.delete(`/api/v1/funds/${code}`);
  },

  // Get NAV history
  getNavHistory: async (
    code: string,
    startDate?: string,
    endDate?: string
  ): Promise<NavHistory[]> => {
    const response = await apiClient.get(`/api/v1/funds/${code}/nav/history`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Get real-time NAV
  getRealtimeNav: async (code: string): Promise<RealtimeNav> => {
    const response = await apiClient.get(`/api/v1/funds/${code}/nav/realtime`);
    return response.data;
  },
};
