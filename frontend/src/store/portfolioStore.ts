import { create } from 'zustand';
import type { Portfolio, PortfolioDetail, PortfolioPerformance, PortfolioTransaction } from '../types';
import { portfolioApi } from '../api/portfolio';

interface PortfolioState {
  portfolios: Portfolio[];
  selectedPortfolio: PortfolioDetail | null;
  performance: PortfolioPerformance | null;
  transactions: PortfolioTransaction[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchPortfolios: () => Promise<void>;
  createPortfolio: (data: { name: string; description?: string }) => Promise<void>;
  selectPortfolio: (id: number) => Promise<void>;
  updatePortfolio: (id: number, data: { name?: string; description?: string }) => Promise<void>;
  deletePortfolio: (id: number) => Promise<void>;
  addItem: (portfolioId: number, data: any) => Promise<void>;
  updateItem: (portfolioId: number, itemId: number, data: any) => Promise<void>;
  deleteItem: (portfolioId: number, itemId: number) => Promise<void>;
  fetchPerformance: (id: number) => Promise<void>;
  executeTransaction: (portfolioId: number, data: any) => Promise<void>;
  fetchTransactions: (portfolioId: number) => Promise<void>;
  clearError: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  selectedPortfolio: null,
  performance: null,
  transactions: [],
  loading: false,
  error: null,

  fetchPortfolios: async () => {
    set({ loading: true, error: null });
    try {
      const portfolios = await portfolioApi.listPortfolios();
      set({ portfolios, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createPortfolio: async (data) => {
    set({ loading: true, error: null });
    try {
      const newPortfolio = await portfolioApi.createPortfolio(data);
      set((state) => ({
        portfolios: [newPortfolio, ...state.portfolios],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  selectPortfolio: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const portfolio = await portfolioApi.getPortfolio(id);
      set({ selectedPortfolio: portfolio, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updatePortfolio: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await portfolioApi.updatePortfolio(id, data);
      set((state) => ({
        portfolios: state.portfolios.map((p) => (p.id === id ? updated : p)),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deletePortfolio: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await portfolioApi.deletePortfolio(id);
      set((state) => ({
        portfolios: state.portfolios.filter((p) => p.id !== id),
        selectedPortfolio: state.selectedPortfolio?.id === id ? null : state.selectedPortfolio,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  addItem: async (portfolioId, data) => {
    set({ loading: true, error: null });
    try {
      await portfolioApi.addItem(portfolioId, data);
      // Refresh portfolio details
      const portfolio = await portfolioApi.getPortfolio(portfolioId);
      set({ selectedPortfolio: portfolio, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateItem: async (portfolioId, itemId, data) => {
    set({ loading: true, error: null });
    try {
      await portfolioApi.updateItem(portfolioId, itemId, data);
      // Refresh portfolio details
      const portfolio = await portfolioApi.getPortfolio(portfolioId);
      set({ selectedPortfolio: portfolio, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteItem: async (portfolioId, itemId) => {
    set({ loading: true, error: null });
    try {
      await portfolioApi.deleteItem(portfolioId, itemId);
      // Refresh portfolio details
      const portfolio = await portfolioApi.getPortfolio(portfolioId);
      set({ selectedPortfolio: portfolio, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchPerformance: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const performance = await portfolioApi.getPerformance(id);
      set({ performance, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  executeTransaction: async (portfolioId, data) => {
    set({ loading: true, error: null });
    try {
      await portfolioApi.executeTransaction(portfolioId, data);
      // Refresh portfolio details and performance
      const portfolio = await portfolioApi.getPortfolio(portfolioId);
      const performance = await portfolioApi.getPerformance(portfolioId);
      const transactions = await portfolioApi.getTransactions(portfolioId);
      set({
        selectedPortfolio: portfolio,
        performance,
        transactions,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchTransactions: async (portfolioId: number) => {
    set({ loading: true, error: null });
    try {
      const transactions = await portfolioApi.getTransactions(portfolioId);
      set({ transactions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
