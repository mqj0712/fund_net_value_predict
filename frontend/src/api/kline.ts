import axios from 'axios';
import type { KlineResponse, KlineSummary, KlinePeriod } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const klineApi = {
  async getKlineData(
    fundCode: string,
    period: KlinePeriod = 'daily',
    startDate?: string,
    endDate?: string,
    indicators: boolean = true
  ): Promise<KlineResponse> {
    const params = new URLSearchParams({
      period,
      indicators: indicators.toString(),
    });

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await apiClient.get<KlineResponse>(
      `/api/v1/kline/${fundCode}?${params.toString()}`
    );

    return response.data;
  },

  async getKlineSummary(
    fundCode: string,
    period: KlinePeriod = 'daily'
  ): Promise<KlineSummary> {
    const response = await apiClient.get<KlineSummary>(
      `/api/v1/kline/${fundCode}/summary`,
      { params: { period } }
    );

    return response.data;
  },
};
