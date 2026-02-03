cd backend

nohup pixi run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload >/dev/null 2>&1 &

cd ../frontend

nohup npm run dev >/dev/null 2>&1 &
