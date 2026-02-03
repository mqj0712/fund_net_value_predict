import { create } from 'zustand';
import type { Fund, RealtimeNav } from '../types';
import { fundsApi } from '../api/funds';

interface FundState {
  funds: Fund[];
  selectedFund: Fund | null;
  realtimeNav: Record<string, RealtimeNav>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchFunds: () => Promise<void>;
  searchFunds: (query: string) => Promise<Fund[]>;
  selectFund: (fund: Fund | null) => void;
  addFund: (data: { code: string; name: string; type?: string; company?: string }) => Promise<void>;
  deleteFund: (code: string) => Promise<void>;
  updateRealtimeNav: (fundCode: string, nav: RealtimeNav) => void;
  clearError: () => void;
}

export const useFundStore = create<FundState>((set, get) => ({
  funds: [],
  selectedFund: null,
  realtimeNav: {},
  loading: false,
  error: null,

  fetchFunds: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fundsApi.listFunds(1, 100);
      set({ funds: response.items, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  searchFunds: async (query: string) => {
    try {
      const results = await fundsApi.searchFunds(query);
      return results;
    } catch (error: any) {
      set({ error: error.message });
      return [];
    }
  },

  selectFund: (fund: Fund | null) => {
    set({ selectedFund: fund });
  },

  addFund: async (data) => {
    set({ loading: true, error: null });
    try {
      const newFund = await fundsApi.createFund(data);
      set((state) => ({
        funds: [newFund, ...state.funds],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteFund: async (code: string) => {
    set({ loading: true, error: null });
    try {
      await fundsApi.deleteFund(code);
      set((state) => ({
        funds: state.funds.filter((f) => f.code !== code),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateRealtimeNav: (fundCode: string, nav: RealtimeNav) => {
    set((state) => ({
      realtimeNav: {
        ...state.realtimeNav,
        [fundCode]: nav,
      },
    }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
