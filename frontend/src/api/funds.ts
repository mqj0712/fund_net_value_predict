import apiClient from './client';
import type { Fund, NavHistory, RealtimeNav, PaginatedResponse, UserFundPreference } from '../types';

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
    name?: string;
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

  // Update fund
  updateFund: async (code: string, data: {
    name?: string;
    type?: string;
    company?: string;
  }): Promise<Fund> => {
    const response = await apiClient.put(`/api/v1/funds/${code}`, data);
    return response.data;
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

  // Fund Preferences
  getUserFundPreferences: async (userId: string): Promise<UserFundPreference[]> => {
    const response = await apiClient.get('/api/v1/funds/preferences', {
      params: { user_id: userId },
    });
    return response.data;
  },

  setFundPreference: async (
    fundId: number,
    isVisible: boolean,
    sortOrder: number | null = null,
    userId: string,
  ): Promise<UserFundPreference> => {
    const response = await apiClient.post('/api/v1/funds/preferences', {
      fund_id: fundId,
      is_visible: isVisible,
      sort_order: sortOrder,
    }, {
      params: { user_id: userId },
    });
    return response.data;
  },

  batchUpdatePreferences: async (
    updates: Array<{ fundId: number; sortOrder: number }>,
    userId: string,
  ): Promise<void> => {
    await apiClient.put('/api/v1/funds/preferences/batch',
      updates.map((u) => ({ fund_id: u.fundId, sort_order: u.sortOrder })),
      {
        params: { user_id: userId },
      },
    );
  },

  deleteFundPreference: async (fundId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/funds/preferences/${fundId}`, {
      params: { user_id: userId },
    });
  },
};
