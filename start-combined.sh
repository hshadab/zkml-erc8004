#!/bin/bash

# Combined startup script for news-service and UI
# Runs both services for Render deployment

echo "════════════════════════════════════════════════════════"
echo "  zkML ERC-8004 Combined Service"
echo "════════════════════════════════════════════════════════"
echo ""

# Create logs directory
mkdir -p logs

# Trap to handle graceful shutdown
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $NEWS_PID $UI_PID 2>/dev/null
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start news service in background
echo "🚀 Starting News Service (backend API + autonomous oracle)..."
cd news-service && node src/index.js > ../logs/news-service.log 2>&1 &
NEWS_PID=$!
echo "   News Service PID: $NEWS_PID"
cd ..

# Wait for news service to start
sleep 3

# Start UI server in background
echo "🌐 Starting UI Server (frontend dashboard)..."
cd ui && node server.js > ../logs/ui-server.log 2>&1 &
UI_PID=$!
echo "   UI Server PID: $UI_PID"
cd ..

# Wait for UI to start
sleep 3

echo ""
echo "✅ Both services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "   Backend API: http://localhost:3000"
echo "   Frontend UI: http://localhost:3001"
echo ""
echo "📝 Logs:"
echo "   News Service: logs/news-service.log"
echo "   UI Server:    logs/ui-server.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo "════════════════════════════════════════════════════════"
echo ""

# Tail both logs in the foreground so Render can monitor
tail -f logs/news-service.log logs/ui-server.log &
TAIL_PID=$!

# Wait for background processes
wait $NEWS_PID $UI_PID
