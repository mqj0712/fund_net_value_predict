import apiClient from './client';
import type { Portfolio, PortfolioDetail, PortfolioItem, PortfolioPerformance } from '../types';

export const portfolioApi = {
  // List all portfolios
  listPortfolios: async (): Promise<Portfolio[]> => {
    const response = await apiClient.get('/api/v1/portfolio');
    return response.data;
  },

  // Create portfolio
  createPortfolio: async (data: {
    name: string;
    description?: string;
  }): Promise<Portfolio> => {
    const response = await apiClient.post('/api/v1/portfolio', data);
    return response.data;
  },

  // Get portfolio details
  getPortfolio: async (id: number): Promise<PortfolioDetail> => {
    const response = await apiClient.get(`/api/v1/portfolio/${id}`);
    return response.data;
  },

  // Update portfolio
  updatePortfolio: async (
    id: number,
    data: { name?: string; description?: string }
  ): Promise<Portfolio> => {
    const response = await apiClient.put(`/api/v1/portfolio/${id}`, data);
    return response.data;
  },

  // Delete portfolio
  deletePortfolio: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/portfolio/${id}`);
  },

  // Add item to portfolio
  addItem: async (
    portfolioId: number,
    data: {
      fund_id: number;
      shares: number;
      cost_basis: number;
      purchase_date: string;
    }
  ): Promise<PortfolioItem> => {
    const response = await apiClient.post(`/api/v1/portfolio/${portfolioId}/items`, data);
    return response.data;
  },

  // Update portfolio item
  updateItem: async (
    portfolioId: number,
    itemId: number,
    data: {
      shares?: number;
      cost_basis?: number;
      purchase_date?: string;
    }
  ): Promise<PortfolioItem> => {
    const response = await apiClient.put(
      `/api/v1/portfolio/${portfolioId}/items/${itemId}`,
      data
    );
    return response.data;
  },

  // Delete portfolio item
  deleteItem: async (portfolioId: number, itemId: number): Promise<void> => {
    await apiClient.delete(`/api/v1/portfolio/${portfolioId}/items/${itemId}`);
  },

  // Get portfolio performance
  getPerformance: async (id: number): Promise<PortfolioPerformance> => {
    const response = await apiClient.get(`/api/v1/portfolio/${id}/performance`);
    return response.data;
  },
};
