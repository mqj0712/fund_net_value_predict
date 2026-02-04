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
