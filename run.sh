#!/bin/bash

# Fund NAV Prediction Project Control Script
# Supports: start, stop, restart, status commands

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKEND_PID_FILE=".backend.pid"
FRONTEND_PID_FILE=".frontend.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a process is running
is_process_running() {
    if [ -f "$1" ]; then
        pid=$(cat "$1")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$1"
            return 1
        fi
    fi
    return 1
}

# Start backend service
start_backend() {
    if is_process_running "$BACKEND_PID_FILE"; then
        pid=$(cat "$BACKEND_PID_FILE")
        print_warn "Backend is already running (PID: $pid)"
        return 1
    fi

    print_info "Starting backend service..."

    cd "$BACKEND_DIR" || {
        print_error "Cannot change to backend directory"
        return 1
    }

    nohup pixi run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
        >../logs/backend.log 2>&1 &
    pid=$!
    echo $pid > "../$BACKEND_PID_FILE"

    cd .. || {
        print_error "Cannot return to root directory"
        return 1
    }

    # Check if backend started successfully
    sleep 3
    if ps -p "$pid" > /dev/null 2>&1; then
        print_info "Backend started successfully (PID: $pid)"
        return 0
    else
        print_error "Backend failed to start. Check logs/backend.log"
        rm -f "$BACKEND_PID_FILE"
        return 1
    fi
}

# Start frontend service
start_frontend() {
    if is_process_running "$FRONTEND_PID_FILE"; then
        pid=$(cat "$FRONTEND_PID_FILE")
        print_warn "Frontend is already running (PID: $pid)"
        return 1
    fi

    print_info "Starting frontend service..."

    cd "$FRONTEND_DIR" || {
        print_error "Cannot change to frontend directory"
        return 1
    }

    nohup npm run dev >../logs/frontend.log 2>&1 &
    pid=$!
    echo $pid > "../$FRONTEND_PID_FILE"

    cd .. || {
        print_error "Cannot return to root directory"
        return 1
    }

    # Check if frontend started successfully
    sleep 3
    if ps -p "$pid" > /dev/null 2>&1; then
        print_info "Frontend started successfully (PID: $pid)"
        return 0
    else
        print_error "Frontend failed to start. Check logs/frontend.log"
        rm -f "$FRONTEND_PID_FILE"
        return 1
    fi
}

# Stop backend service
stop_backend() {
    if is_process_running "$BACKEND_PID_FILE"; then
        pid=$(cat "$BACKEND_PID_FILE")
        print_info "Stopping backend service (PID: $pid)..."
        kill "$pid"
        sleep 2

        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warn "Force killing backend..."
            kill -9 "$pid"
        fi

        rm -f "$BACKEND_PID_FILE"
        print_info "Backend stopped"
    else
        print_warn "Backend is not running"
        return 1
    fi
}

# Stop frontend service
stop_frontend() {
    if is_process_running "$FRONTEND_PID_FILE"; then
        pid=$(cat "$FRONTEND_PID_FILE")
        print_info "Stopping frontend service (PID: $pid)..."
        kill "$pid"
        sleep 2

        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warn "Force killing frontend..."
            kill -9 "$pid"
        fi

        rm -f "$FRONTEND_PID_FILE"
        print_info "Frontend stopped"
    else
        print_warn "Frontend is not running"
        return 1
    fi
}

# Start all services
start() {
    print_info "Starting all services..."

    # Create logs directory if it doesn't exist
    mkdir -p logs

    backend_ok=false
    frontend_ok=false

    # Start backend
    start_backend && backend_ok=true

    # Start frontend
    start_frontend && frontend_ok=true

    echo
    if $backend_ok && $frontend_ok; then
        print_info "All services started successfully!"
        echo
        echo "Backend API: http://localhost:8000"
        echo "Frontend:   http://localhost:5173"
        echo
        echo "Logs:"
        echo "  Backend:  logs/backend.log"
        echo "  Frontend: logs/frontend.log"
        echo
        echo "Use './run.sh status' to check status"
        echo "Use './run.sh stop' to stop services"
    else
        print_error "Some services failed to start"
        return 1
    fi
}

# Stop all services
stop() {
    print_info "Stopping all services..."

    backend_ok=true
    frontend_ok=true

    stop_backend || backend_ok=false
    stop_frontend || frontend_ok=false

    echo
    if $backend_ok && $frontend_ok; then
        print_info "All services stopped"
    else
        print_warn "Some services were not running"
    fi
}

# Restart all services
restart() {
    print_info "Restarting all services..."
    stop
    sleep 2
    start
}

# Show service status
show_status() {
    echo "Service Status:"
    echo "==============="

    if is_process_running "$BACKEND_PID_FILE"; then
        pid=$(cat "$BACKEND_PID_FILE")
        echo "Backend:  Running (PID: $pid)"
    else
        echo "Backend:  Stopped"
    fi

    if is_process_running "$FRONTEND_PID_FILE"; then
        pid=$(cat "$FRONTEND_PID_FILE")
        echo "Frontend: Running (PID: $pid)"
    else
        echo "Frontend: Stopped"
    fi

    echo
    echo "API Endpoints:"
    echo "  Backend:  http://localhost:8000"
    echo "  Frontend: http://localhost:5173"
    echo "  API Docs: http://localhost:8000/docs"
}

# Show usage
show_usage() {
    echo "Usage: $0 {start|stop|restart|status}"
    echo
    echo "Commands:"
    echo "  start   - Start backend and frontend services (default)"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  status  - Show service status"
    echo
    echo "Examples:"
    echo "  $0           # Start services (default)"
    echo "  $0 start     # Start services"
    echo "  $0 stop      # Stop services"
    echo "  $0 restart   # Restart services"
    echo "  $0 status    # Show status"
}

# Main script logic
case "${1:-start}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        show_usage
        exit 1
        ;;
esac
