@echo off
echo ========================================
echo Elsewedy Attendance System - Server Setup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available!
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

REM Create directory structure
echo Creating directory structure...
if not exist "C:\elsewedy-attendance" mkdir "C:\elsewedy-attendance"
if not exist "C:\elsewedy-attendance\database" mkdir "C:\elsewedy-attendance\database"
if not exist "C:\elsewedy-attendance\logs" mkdir "C:\elsewedy-attendance\logs"
if not exist "C:\elsewedy-attendance\exports" mkdir "C:\elsewedy-attendance\exports"
echo Directory structure created.
echo.

REM Copy backend files
echo Copying backend files...
xcopy /E /I /Y "%~dp0..\*" "C:\elsewedy-attendance\backend\"
echo Backend files copied.
echo.

REM Navigate to backend directory
cd "C:\elsewedy-attendance\backend"

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

REM Install PM2 globally
echo Installing PM2 process manager...
call npm install -g pm2
call npm install -g pm2-windows-startup
echo PM2 installed successfully.
echo.

REM Copy environment file
echo Setting up environment configuration...
if not exist ".env" (
    copy "config.env.example" ".env"
    echo Environment file created. Please edit .env with your settings.
    echo.
    echo IMPORTANT: Edit C:\elsewedy-attendance\backend\.env file with:
    echo - Your ZKTeco device IP addresses
    echo - Server IP address
    echo - JWT secret key
    echo - Database path
    echo.
    pause
)

REM Initialize database
echo Initializing database...
call npm run migrate
if %errorlevel% neq 0 (
    echo WARNING: Database migration failed. You may need to run it manually.
)

REM Seed default data
echo Seeding default data...
call npm run seed
if %errorlevel% neq 0 (
    echo WARNING: Database seeding failed. You may need to run it manually.
)

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Edit C:\elsewedy-attendance\backend\.env file with your settings
echo 2. Configure your ZKTeco devices with the correct IP addresses
echo 3. Start the service using: pm2 start ecosystem.config.js --env production
echo 4. Save PM2 configuration: pm2 save
echo 5. Setup auto-start: pm2-startup install
echo.
echo Service will be available at: http://localhost:3001
echo Health check: http://localhost:3001/health
echo.
echo For support, check the README.md file or contact the development team.
echo.
pause
