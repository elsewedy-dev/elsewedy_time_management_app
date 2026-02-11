@echo off
echo ========================================
echo Elsewedy Attendance System - Local Test
echo ========================================
echo.

echo Starting backend server...
start "Backend Server" cmd /k "cd backend && node simple-server.js"

echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting frontend...
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5175 (or 5176)
echo.
echo Test the integration:
echo 1. Open your browser to the frontend URL
echo 2. Click on "API Test" in the sidebar
echo 3. Click on each test card to verify backend connection
echo.
echo Press any key to exit...
pause >nul
