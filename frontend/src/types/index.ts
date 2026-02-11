// TypeScript types for the application.
export interface Fund {
  id: number;
  code: string;
  name: string;
  type?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface NavHistory {
  id: number;
  fund_id: number;
  date: string;
  nav: number;
  accumulated_nav?: number;
  daily_growth?: number;
  created_at: string;
}

export interface RealtimeNav {
  fund_code: string;
  fund_name: string;
  current_nav: number;
  estimated_nav: number;
  change_percent: number;
  last_update: string;
  is_trading_hours: boolean;
}

export interface Portfolio {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItem {
  id: number;
  portfolio_id: number;
  fund_id: number;
  shares: number;
  cost_basis: number;
  purchase_date: string;
  created_at: string;
  updated_at: string;
  fund?: Fund;
}

export interface PortfolioDetail extends Portfolio {
  items: PortfolioItem[];
}

export interface PortfolioTransaction {
  id: number;
  portfolio_id: number;
  fund_id: number;
  transaction_type: 'buy' | 'sell' | 'adjust';
  shares: number;
  price: number;
  notes?: string;
  transaction_date: string;
  created_at: string;
  fund?: Fund;
}

export interface PortfolioPerformance {
  portfolio_id: number;
  total_cost: number;
  current_value: number;
  total_return: number;
  return_percent: number;
  holdings: {
    fund_code: string;
    fund_name: string;
    shares: number;
    cost_basis: number;
    current_nav: number;
    cost: number;
    value: number;
    return: number;
    return_percent: number;
  }[];
}

export interface Alert {
  id: number;
  fund_id: number;
  alert_type: 'price_above' | 'price_below' | 'change_percent';
  threshold: number;
  is_active: boolean;
  last_triggered?: string;
  created_at: string;
  updated_at: string;
  fund?: Fund;
}

export interface WSMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// K-line data types
export interface KlineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  amount?: number;
  change_pct?: number;
  turnover?: number;
  // Moving Averages
  MA5?: number;
  MA10?: number;
  MA20?: number;
  MA60?: number;
  // MACD
  MACD_DIF?: number;
  MACD_DEA?: number;
  MACD_HIST?: number;
  // KDJ
  KDJ_K?: number;
  KDJ_D?: number;
  KDJ_J?: number;
  // RSI
  RSI6?: number;
  RSI12?: number;
  RSI24?: number;
  // Bollinger Bands
  BOLL_UPPER?: number;
  BOLL_MID?: number;
  BOLL_LOWER?: number;
}

export interface KlineResponse {
  fund_code: string;
  fund_name: string;
  period: string;
  start_date: string;
  end_date: string;
  data_count: number;
  indicators_enabled: boolean;
  kline_data: KlineData[];
}

export interface KlineSummary {
  fund_code: string;
  fund_name: string;
  period: string;
  latest: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    change_pct: number;
  };
  statistics: {
    high_30: number;
    low_30: number;
    avg_30: number;
    data_points: number;
  };
  indicators: {
    MA5?: number;
    MA20?: number;
    MA60?: number;
    MACD_DIF: number;
    MACD_HIST: number;
    KDJ_K: number;
    RSI6?: number;
  };
  signals: {
    trend: 'bullish' | 'bearish' | 'neutral';
    macd: 'bullish' | 'bearish' | 'neutral';
    rsi: 'overbought' | 'oversold' | 'neutral';
  };
}

export type KlinePeriod = 'daily' | 'weekly' | 'monthly' | '1min' | '5min' | '15min' | '30min' | '60min';

// Index types
export interface IndexData {
  code: string;
  name: string;
  current: number;
  change: number;
  change_percent: number;
  last_update: string;
}

// User Fund Preference types
export interface UserFundPreference {
  id: number;
  user_id: string;
  fund_id: number;
  fund?: Fund;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
