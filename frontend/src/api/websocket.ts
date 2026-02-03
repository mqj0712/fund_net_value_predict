import type { WSMessage } from '../types';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: ((message: WSMessage) => void)[] = [];
  private url: string;

  constructor(endpoint: string) {
    this.url = `${WS_BASE_URL}${endpoint}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected:', this.url);
          this.reconnectAttempts = 0;
          resolve();

          // Send ping every 30 seconds to keep connection alive
          const pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send('ping');
            } else {
              clearInterval(pingInterval);
            }
          }, 30000);
        };

        this.ws.onmessage = (event) => {
          if (event.data === 'pong') {
            return;
          }

          try {
            const message: WSMessage = JSON.parse(event.data);
            this.messageHandlers.forEach((handler) => handler(message));
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed:', this.url);
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  onMessage(handler: (message: WSMessage) => void) {
    this.messageHandlers.push(handler);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers = [];
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const createRealtimeNavWebSocket = (fundCode: string) => {
  return new WebSocketClient(`/ws/realtime/${fundCode}`);
};

export const createPortfolioWebSocket = (portfolioId: number) => {
  return new WebSocketClient(`/ws/portfolio/${portfolioId}`);
};

export const createAlertsWebSocket = () => {
  return new WebSocketClient('/ws/alerts');
};
