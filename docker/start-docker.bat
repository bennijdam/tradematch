@echo off
echo Starting TradeMatch Docker Deployment...

cd %~dp0

if not exist "..\.env" (
    echo Warning: .env file not found in root directory!
)

echo Stopping existing containers...
docker-compose down 2>NUL

echo Building and starting containers...
docker-compose up -d --build

if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ Deployment started successfully!
    echo -----------------------------------
    echo 🌐 Web Frontend: http://localhost:8080
    echo 🔌 Backend API:  http://localhost:3000
    echo -----------------------------------
    echo To view logs, run: docker-compose logs -f
    echo To stop, run: docker-compose down
) else (
    echo ❌ Deployment failed! Please check docker-compose logs.
)
pause
