import apiClient from './client';
import type { Alert } from '../types';

export const alertsApi = {
  // List all alerts
  listAlerts: async (): Promise<Alert[]> => {
    const response = await apiClient.get('/api/v1/alerts');
    return response.data;
  },

  // Create alert
  createAlert: async (data: {
    fund_id: number;
    alert_type: 'price_above' | 'price_below' | 'change_percent';
    threshold: number;
    is_active?: boolean;
  }): Promise<Alert> => {
    const response = await apiClient.post('/api/v1/alerts', data);
    return response.data;
  },

  // Update alert
  updateAlert: async (
    id: number,
    data: {
      threshold?: number;
      is_active?: boolean;
    }
  ): Promise<Alert> => {
    const response = await apiClient.put(`/api/v1/alerts/${id}`, data);
    return response.data;
  },

  // Delete alert
  deleteAlert: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/alerts/${id}`);
  },

  // Toggle alert
  toggleAlert: async (id: number): Promise<Alert> => {
    const response = await apiClient.post(`/api/v1/alerts/${id}/toggle`);
    return response.data;
  },
};
