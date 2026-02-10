"""Technical analysis indicators calculation module."""
import numpy as np
import pandas as pd
from typing import Any


class TechnicalAnalyzer:
    """Technical indicators calculator using pandas."""

    @staticmethod
    def calculate_ma(df: pd.DataFrame, periods: list[int] = [5, 10, 20, 60]) -> pd.DataFrame:
        """Calculate Moving Averages."""
        df = df.copy()
        for p in periods:
            df[f'MA{p}'] = df['close'].rolling(window=p, min_periods=1).mean().round(4)
        return df

    @staticmethod
    def calculate_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
        """Calculate MACD (Moving Average Convergence Divergence)."""
        df = df.copy()
        exp1 = df['close'].ewm(span=fast, adjust=False).mean()
        exp2 = df['close'].ewm(span=slow, adjust=False).mean()
        df['MACD_DIF'] = (exp1 - exp2).round(4)
        df['MACD_DEA'] = df['MACD_DIF'].ewm(span=signal, adjust=False).mean().round(4)
        df['MACD_HIST'] = (2 * (df['MACD_DIF'] - df['MACD_DEA'])).round(4)
        return df

    @staticmethod
    def calculate_kdj(df: pd.DataFrame, n: int = 9, m1: int = 3, m2: int = 3) -> pd.DataFrame:
        """Calculate KDJ (Stochastic Oscillator)."""
        df = df.copy()
        low_list = df['low'].rolling(window=n, min_periods=1).min()
        high_list = df['high'].rolling(window=n, min_periods=1).max()
        
        rsv = (df['close'] - low_list) / (high_list - low_list) * 100
        rsv = rsv.fillna(50)
        
        df['KDJ_K'] = rsv.ewm(com=m1 - 1, adjust=False).mean().round(2)
        df['KDJ_D'] = df['KDJ_K'].ewm(com=m2 - 1, adjust=False).mean().round(2)
        df['KDJ_J'] = (3 * df['KDJ_K'] - 2 * df['KDJ_D']).round(2)
        
        return df

    @staticmethod
    def calculate_rsi(df: pd.DataFrame, periods: list[int] = [6, 12, 24]) -> pd.DataFrame:
        """Calculate RSI (Relative Strength Index)."""
        df = df.copy()
        delta = df['close'].diff()
        
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        
        for p in periods:
            avg_gain = gain.rolling(window=p, min_periods=1).mean()
            avg_loss = loss.rolling(window=p, min_periods=1).mean()
            
            rs = avg_gain / avg_loss.replace(0, np.inf)
            df[f'RSI{p}'] = (100 - (100 / (1 + rs))).round(2)
        
        return df

    @staticmethod
    def calculate_boll(df: pd.DataFrame, period: int = 20, std_dev: int = 2) -> pd.DataFrame:
        """Calculate Bollinger Bands."""
        df = df.copy()
        df['BOLL_MID'] = df['close'].rolling(window=period, min_periods=1).mean().round(4)
        rolling_std = df['close'].rolling(window=period, min_periods=1).std()
        df['BOLL_UPPER'] = (df['BOLL_MID'] + std_dev * rolling_std).round(4)
        df['BOLL_LOWER'] = (df['BOLL_MID'] - std_dev * rolling_std).round(4)
        return df

    @staticmethod
    def calculate_all(df: pd.DataFrame) -> pd.DataFrame:
        """Calculate all technical indicators."""
        df = df.copy()
        df = TechnicalAnalyzer.calculate_ma(df)
        df = TechnicalAnalyzer.calculate_macd(df)
        df = TechnicalAnalyzer.calculate_kdj(df)
        df = TechnicalAnalyzer.calculate_rsi(df)
        df = TechnicalAnalyzer.calculate_boll(df)
        return df
