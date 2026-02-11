import { create } from 'zustand';
import type { Fund, RealtimeNav, UserFundPreference } from '../types';
import { fundsApi } from '../api/funds';

const getUserId = (): string => {
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('user_id', userId);
  }
  return userId;
};

interface FundState {
  funds: Fund[];
  selectedFund: Fund | null;
  realtimeNav: Record<string, RealtimeNav>;
  preferences: UserFundPreference[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchFunds: () => Promise<void>;
  searchFunds: (query: string) => Promise<Fund[]>;
  selectFund: (fund: Fund | null) => void;
  addFund: (data: { code: string; name?: string; type?: string; company?: string }) => Promise<void>;
  deleteFund: (code: string) => Promise<void>;
  updateFund: (code: string, data: { name?: string; type?: string; company?: string }) => Promise<void>;
  updateRealtimeNav: (fundCode: string, nav: RealtimeNav) => void;
  clearError: () => void;
  
  // Preference actions
  fetchPreferences: () => Promise<void>;
  updatePreference: (fundId: number, isVisible: boolean, sortOrder?: number) => Promise<void>;
  updateSortOrder: (updates: Array<{ fundId: number; sortOrder: number }>) => Promise<void>;
  
}

export const useFundStore = create<FundState>((set) => ({
  funds: [],
  selectedFund: null,
  realtimeNav: {},
  preferences: [],
  loading: false,
  error: null,

  fetchFunds: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fundsApi.listFunds(1, 100);
      set({ funds: response.items, loading: false });
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
    }
  },

  fetchPreferences: async () => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const preferences = await fundsApi.getUserFundPreferences(userId);
      set({ preferences, loading: false });
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
    }
  },

  searchFunds: async (query: string) => {
    try {
      const results = await fundsApi.searchFunds(query);
      return results;
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message });
      return [];
    }
  },

  selectFund: (fund: Fund | null) => {
    set({ selectedFund: fund });
  },

  addFund: async (data: { code: string; name?: string; type?: string; company?: string }) => {
    set({ loading: true, error: null });
    try {
      const newFund = await fundsApi.createFund(data);
      set((state) => ({
        funds: [newFund, ...state.funds],
        loading: false,
      }));
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
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
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
      throw error;
    }
  },

  updateFund: async (code: string, data: { name?: string; type?: string; company?: string }) => {
    set({ loading: true, error: null });
    try {
      const updatedFund = await fundsApi.updateFund(code, data);
      set((state) => ({
        funds: state.funds.map((f) => (f.code === code ? updatedFund : f)),
        selectedFund: state.selectedFund?.code === code ? updatedFund : state.selectedFund,
        loading: false,
      }));
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
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

  updatePreference: async (fundId: number, isVisible: boolean, sortOrder?: number) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      const updatedPref = await fundsApi.setFundPreference(fundId, isVisible, sortOrder, userId);
      set((state) => {
        const existingIndex = state.preferences.findIndex((p) => p.fund_id === fundId);
        let newPreferences: UserFundPreference[];
        if (existingIndex >= 0) {
          newPreferences = [...state.preferences];
          newPreferences[existingIndex] = updatedPref;
        } else {
          newPreferences = [...state.preferences, updatedPref];
        }
        return { preferences: newPreferences, loading: false };
      });
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
      throw error;
    }
  },

  updateSortOrder: async (updates: Array<{ fundId: number; sortOrder: number }>) => {
    set({ loading: true, error: null });
    try {
      const userId = getUserId();
      await fundsApi.batchUpdatePreferences(updates, userId);
      set((state) => {
        const prefMap = new Map(state.preferences.map((p) => [p.fund_id, p]));
        updates.forEach((u) => {
          const pref = prefMap.get(u.fundId);
          if (pref) {
            pref.sort_order = u.sortOrder;
          }
        });
        return { preferences: state.preferences, loading: false };
      });
    } catch (error: unknown) {
      const err = error as Error;
      set({ error: err.message, loading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Computed helper functions
export const getSortedFunds = (state: FundState): Fund[] => {
  const prefMap = new Map(state.preferences.map((p) => [p.fund_id, p]));
  const fundsWithOrder = state.funds.map((fund, index) => {
    const pref = prefMap.get(fund.id);
    return {
      fund,
      sortOrder: pref?.sort_order,
      originalIndex: index,
    };
  });

  fundsWithOrder.sort((a, b) => {
    const aHasOrder = a.sortOrder !== null && a.sortOrder !== undefined;
    const bHasOrder = b.sortOrder !== null && b.sortOrder !== undefined;

    if (aHasOrder && bHasOrder) {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
    if (aHasOrder) {
      return -1;
    }
    if (bHasOrder) {
      return 1;
    }
    return a.originalIndex - b.originalIndex;
  });

  return fundsWithOrder.map((item) => item.fund);
};

export const getVisibleFunds = (state: FundState): Fund[] => {
  const prefMap = new Map(state.preferences.map((p) => [p.fund_id, p]));
  const visibleFunds = state.funds.filter((fund) => {
    const pref = prefMap.get(fund.id);
    return pref?.is_visible;
  });

  const fundsWithOrder = visibleFunds.map((fund) => {
    const pref = prefMap.get(fund.id);
    return {
      fund,
      sortOrder: pref?.sort_order,
      originalIndex: state.funds.indexOf(fund),
    };
  });

  fundsWithOrder.sort((a, b) => {
    const aHasOrder = a.sortOrder !== null && a.sortOrder !== undefined;
    const bHasOrder = b.sortOrder !== null && b.sortOrder !== undefined;

    if (aHasOrder && bHasOrder) {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
    if (aHasOrder) {
      return -1;
    }
    if (bHasOrder) {
      return 1;
    }
    return a.originalIndex - b.originalIndex;
  });

  fundsWithOrder.sort((a, b) => {
    if (a.sortOrder !== null && a.sortOrder !== undefined && b.sortOrder !== null && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    if (a.sortOrder !== null && a.sortOrder !== undefined) {
      return -1;
    }
    if (b.sortOrder !== null && b.sortOrder !== undefined) {
      return 1;
    }
    return a.originalIndex - b.originalIndex;
  });

  return fundsWithOrder.map((item) => item.fund);
};
