# Quick Start Guide

## Current Status

✅ Backend server running on http://localhost:8000
✅ Frontend server running on http://localhost:5173
✅ Database initialized with SQLite
✅ One test fund added (001186 - 富国文体健康股票)

## Access the Application

1. **Frontend Dashboard**: http://localhost:5173
   - View tracked funds with real-time NAV updates
   - Add new funds to track
   - Delete funds from tracking

2. **Backend API Documentation**: http://localhost:8000/docs
   - Interactive Swagger UI
   - Test all API endpoints
   - View request/response schemas

3. **Health Check**: http://localhost:8000/health

## Quick Test

### Add a Fund via API
```bash
curl -X POST http://localhost:8000/api/v1/funds \
  -H "Content-Type: application/json" \
  -d '{"code": "110022", "name": "易方达消费行业股票", "type": "股票型", "company": "易方达基金"}'
```

### Get Real-time NAV
```bash
curl http://localhost:8000/api/v1/funds/001186/nav/realtime
```

### List All Funds
```bash
curl http://localhost:8000/api/v1/funds
```

## WebSocket Test

Open browser console and run:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/realtime/001186');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Received:', JSON.parse(e.data));
ws.onerror = (e) => console.error('Error:', e);
```

## Stop Servers

### Stop Backend
```bash
pkill -f "uvicorn app.main:app"
```

### Stop Frontend
```bash
pkill -f "vite"
```

## Restart Servers

### Backend
```bash
cd backend
pixi run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm run dev
```

## Database Location

SQLite database: `backend/fund.db`

To view database:
```bash
sqlite3 backend/fund.db
.tables
SELECT * FROM funds;
.quit
```

## Logs

Backend logs: Check terminal where uvicorn is running
Frontend logs: Check browser console (F12)

## Next Steps

1. Open http://localhost:5173 in your browser
2. Click "Add Fund" to add more funds
3. Watch real-time NAV updates on the dashboard
4. Explore the API documentation at http://localhost:8000/docs

## Implemented Features

✅ Fund tracking (add/delete/list)
✅ Real-time NAV estimation via WebSocket
✅ Historical NAV data fetching
✅ Responsive dashboard UI
✅ Background data sync (every 30 minutes)
✅ Alert checking (every 60 seconds)
✅ Cache management
✅ API documentation

## Features to Implement

- [ ] Historical NAV charts with ECharts
- [ ] Portfolio management UI
- [ ] Alert configuration UI
- [ ] Fund search from external API
- [ ] Portfolio performance tracking
- [ ] Alert notifications in UI

## Troubleshooting

### Port Already in Use

Backend (8000):
```bash
lsof -ti:8000 | xargs kill -9
```

Frontend (5173):
```bash
lsof -ti:5173 | xargs kill -9
```

### Database Locked

```bash
rm backend/fund.db
# Restart backend to recreate database
```

### WebSocket Not Connecting

1. Check backend is running: `curl http://localhost:8000/health`
2. Check CORS settings in `backend/app/config.py`
3. Check browser console for errors
