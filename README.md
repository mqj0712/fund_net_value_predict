# Chinese Fund NAV Estimation Application

A full-stack application for tracking and displaying real-time estimated net asset values (NAV) for Chinese mutual funds with portfolio management and alert notifications.

## Features

- **Real-time NAV Estimation**: Live updates of fund NAV during trading hours via WebSocket
- **Fund Tracking**: Add and track multiple Chinese mutual funds
- **Historical Charts**: View historical NAV data with interactive charts
- **Portfolio Management**: Create portfolios and track multiple fund holdings
- **Price Alerts**: Set up alerts for price changes and get real-time notifications
- **Responsive UI**: Modern interface built with Ant Design

## Technology Stack

### Backend
- **FastAPI**: Modern async Python web framework
- **SQLAlchemy 2.0**: Async ORM for database operations
- **SQLite**: Development database (easily switchable to PostgreSQL)
- **efinance**: Chinese fund data provider
- **APScheduler**: Background task scheduling
- **WebSocket**: Real-time data streaming

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Ant Design**: Comprehensive UI component library
- **Zustand**: Lightweight state management
- **Apache ECharts**: Powerful charting library
- **Axios**: HTTP client

## Project Structure

```
fund/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Configuration
│   │   ├── api/                 # API endpoints
│   │   │   ├── v1/endpoints/    # REST endpoints
│   │   │   └── websocket.py     # WebSocket handlers
│   │   ├── core/                # Business logic
│   │   │   ├── data_fetcher.py  # External API client
│   │   │   ├── nav_estimator.py # NAV calculation
│   │   │   └── cache_manager.py # Cache management
│   │   ├── models/              # Database models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── db/                  # Database layer
│   │   └── tasks/               # Background tasks
│   └── fund.db                  # SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # API clients
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── store/               # Zustand stores
│   │   ├── hooks/               # Custom hooks
│   │   └── types/               # TypeScript types
│   └── package.json
│
└── pixi.toml                    # Python environment
```

## Setup Instructions

### Prerequisites

- Python 3.11
- Node.js 18+ and npm
- pixi (Python package manager)

### Backend Setup

1. Install dependencies:
```bash
pixi install
```

2. Start the backend server:
```bash
cd backend
pixi run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at:
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at: http://localhost:5173

## Usage

### Adding a Fund

1. Click the "Add Fund" button on the dashboard
2. Enter the fund code (e.g., `001186`)
3. Enter the fund name (e.g., `富国文体健康股票`)
4. Optionally enter type and company
5. Click "Add Fund"

The system will automatically:
- Fetch fund information from external APIs
- Download historical NAV data (last year)
- Start real-time NAV updates via WebSocket

### Viewing Real-time NAV

Once a fund is added, the dashboard will display:
- Current estimated NAV
- Change percentage (color-coded: red for up, green for down)
- Trading status (Trading/Closed)
- Fund basic information

The NAV updates automatically every 30 seconds during trading hours (9:30-15:00 Beijing time).

### API Endpoints

#### Funds
- `GET /api/v1/funds` - List all tracked funds
- `GET /api/v1/funds/search?q={query}` - Search funds
- `GET /api/v1/funds/{code}` - Get fund details
- `POST /api/v1/funds` - Add fund to tracking
- `DELETE /api/v1/funds/{code}` - Remove fund
- `GET /api/v1/funds/{code}/nav/history` - Historical NAV data
- `GET /api/v1/funds/{code}/nav/realtime` - Real-time NAV

#### Portfolio
- `GET /api/v1/portfolio` - List portfolios
- `POST /api/v1/portfolio` - Create portfolio
- `GET /api/v1/portfolio/{id}` - Portfolio details
- `POST /api/v1/portfolio/{id}/items` - Add fund to portfolio
- `GET /api/v1/portfolio/{id}/performance` - Portfolio performance

#### Alerts
- `GET /api/v1/alerts` - List alerts
- `POST /api/v1/alerts` - Create alert
- `PUT /api/v1/alerts/{id}` - Update alert
- `DELETE /api/v1/alerts/{id}` - Delete alert
- `POST /api/v1/alerts/{id}/toggle` - Toggle alert

#### WebSocket
- `ws://localhost:8000/ws/realtime/{fund_code}` - Real-time NAV updates
- `ws://localhost:8000/ws/portfolio/{portfolio_id}` - Portfolio updates
- `ws://localhost:8000/ws/alerts` - Alert notifications

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./fund.db

# API Settings
API_V1_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Data Sync
SYNC_INTERVAL_MINUTES=30
ALERT_CHECK_INTERVAL_SECONDS=60

# Cache TTL (seconds)
CACHE_FUND_INFO_TTL=3600
CACHE_REALTIME_NAV_TTL=60
CACHE_HISTORY_TTL=21600
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

## Background Tasks

The application runs two background tasks:

1. **NAV Data Sync** (every 30 minutes)
   - Fetches latest NAV data for all tracked funds
   - Updates historical data in database
   - Invalidates cache

2. **Alert Checker** (every 60 seconds)
   - Checks all active alerts
   - Evaluates alert conditions
   - Broadcasts notifications via WebSocket

## Testing

### Test Backend API

```bash
# Health check
curl http://localhost:8000/health

# Add a fund
curl -X POST http://localhost:8000/api/v1/funds \
  -H "Content-Type: application/json" \
  -d '{"code": "001186", "name": "富国文体健康股票", "type": "股票型", "company": "富国基金"}'

# Get real-time NAV
curl http://localhost:8000/api/v1/funds/001186/nav/realtime

# List funds
curl http://localhost:8000/api/v1/funds
```

### Test WebSocket

Use a WebSocket client or browser console:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/realtime/001186');
ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## Data Sources

- **Tiantian Fund (天天基金)**: Real-time NAV estimation via JSONP API
- **efinance**: Historical NAV data and fund information

## Known Limitations

1. Real-time NAV is an estimation based on market data, not official NAV
2. Trading hours detection assumes Beijing time (no timezone conversion)
3. Fund search currently only searches tracked funds (not all available funds)
4. WebSocket reconnection has a maximum of 5 attempts

## Future Enhancements

- [ ] Add historical NAV charts with ECharts
- [ ] Implement portfolio management UI
- [ ] Add alert configuration UI
- [ ] Support for fund comparison
- [ ] Export portfolio data to Excel
- [ ] Mobile responsive design improvements
- [ ] Redis caching for production
- [ ] PostgreSQL database for production
- [ ] Docker deployment configuration
- [ ] User authentication and authorization

## Troubleshooting

### Backend won't start

- Check if port 8000 is already in use
- Verify all dependencies are installed: `pixi install`
- Check database file permissions

### Frontend won't start

- Check if port 5173 is already in use
- Verify all dependencies are installed: `npm install`
- Clear npm cache: `npm cache clean --force`

### WebSocket connection fails

- Ensure backend is running
- Check CORS configuration
- Verify WebSocket URL in frontend .env file

### No real-time updates

- Check if fund code is correct
- Verify trading hours (9:30-15:00 Beijing time)
- Check browser console for WebSocket errors

## License

MIT

## Author

Martin Zhang <mqj0712@outlook.com>
