#!/bin/bash
# TradeMatch - One-Command Docker Start
echo "Starting TradeMatch Docker Deployment..."

# Navigate to the script's directory
cd "$(dirname "$0")"

# Ensure environment files exist
if [ ! -f "../.env" ]; then
    echo "Warning: .env file not found in root directory!"
    # fallback to .env.local or create empty
fi

# Stop existing containers if running
echo "Stopping existing containers..."
docker-compose down 2>/dev/null

# Start the docker containers in detached mode, forcing a rebuild
echo "Building and starting containers..."
docker-compose up -d --build

# Status report
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment started successfully!"
    echo "-----------------------------------"
    echo "🌐 Web Frontend: http://localhost:8080"
    echo "🔌 Backend API:  http://localhost:3000"
    echo "-----------------------------------"
    echo "To view logs, run: docker-compose logs -f"
    echo "To stop, run: docker-compose down"
else
    echo "❌ Deployment failed! Please check docker-compose logs."
fi
