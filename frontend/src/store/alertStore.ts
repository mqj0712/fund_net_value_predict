import { create } from 'zustand';
import type { Alert } from '../types';
import { alertsApi } from '../api/alerts';

interface AlertState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchAlerts: () => Promise<void>;
  createAlert: (data: {
    fund_id: number;
    alert_type: 'price_above' | 'price_below' | 'change_percent';
    threshold: number;
    is_active?: boolean;
  }) => Promise<void>;
  updateAlert: (id: number, data: { threshold?: number; is_active?: boolean }) => Promise<void>;
  deleteAlert: (id: number) => Promise<void>;
  toggleAlert: (id: number) => Promise<void>;
  clearError: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,

  fetchAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const alerts = await alertsApi.listAlerts();
      set({ alerts, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createAlert: async (data) => {
    set({ loading: true, error: null });
    try {
      const newAlert = await alertsApi.createAlert(data);
      set((state) => ({
        alerts: [newAlert, ...state.alerts],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateAlert: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await alertsApi.updateAlert(id, data);
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updated : a)),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteAlert: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await alertsApi.deleteAlert(id);
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  toggleAlert: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const updated = await alertsApi.toggleAlert(id);
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updated : a)),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
