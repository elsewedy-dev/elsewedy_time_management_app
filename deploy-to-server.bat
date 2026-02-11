@echo off
echo ========================================
echo Elsewedy Attendance System Deployment
echo ========================================
echo.

echo [1/6] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Backend installation failed
    pause
    exit /b 1
)

echo.
echo [2/6] Installing frontend dependencies...
cd ..
call npm install
if errorlevel 1 (
    echo ERROR: Frontend installation failed
    pause
    exit /b 1
)

echo.
echo [3/6] Building frontend for production...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

echo.
echo [4/6] Initializing database...
cd backend
call node init-database.js
if errorlevel 1 (
    echo WARNING: Database initialization had issues
)

echo.
echo [5/6] Starting backend with PM2...
call pm2 delete attendance-backend 2>nul
call pm2 start server.js --name attendance-backend
if errorlevel 1 (
    echo ERROR: Failed to start backend
    pause
    exit /b 1
)

echo.
echo [6/6] Starting frontend with PM2...
cd ..
call pm2 delete attendance-frontend 2>nul
call pm2 start npm --name attendance-frontend -- run preview
if errorlevel 1 (
    echo ERROR: Failed to start frontend
    pause
    exit /b 1
)

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Backend running on: http://localhost:3001
echo Frontend running on: http://localhost:5175
echo.
echo To access from other computers:
echo http://SERVER_IP:5175
echo.
echo Useful PM2 commands:
echo   pm2 status          - Check status
echo   pm2 logs            - View logs
echo   pm2 restart all     - Restart services
echo   pm2 stop all        - Stop services
echo.
pause
