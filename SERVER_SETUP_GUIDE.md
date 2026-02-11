# Elsewedy Attendance System - Server Setup Guide

## Prerequisites

Before deploying to the server, ensure the following are installed:

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **PostgreSQL** (v14 or higher)
   - Download: https://www.postgresql.org/download/
   - Create database: `elsewedy_attendance`

3. **PM2** (Process Manager)
   ```bash
   npm install -g pm2
   ```

## Quick Deployment

### Option 1: Automated Deployment (Windows)

1. Copy the entire project folder to the server
2. Double-click `deploy-to-server.bat`
3. Wait for deployment to complete
4. Access from any computer: `http://SERVER_IP:5175`

### Option 2: Manual Deployment

1. **Configure Database**
   ```bash
   # Edit backend/.env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=elsewedy_attendance
   DB_USER=postgres
   DB_PASSWORD=your_password
   
   # Device configuration
   DEVICE_IP=192.168.8.50
   DEVICE_PORT=4370
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ..
   npm install
   ```

3. **Initialize Database**
   ```bash
   cd backend
   node init-database.js
   ```

4. **Build Frontend**
   ```bash
   npm run build
   ```

5. **Start Services**
   ```bash
   # Backend
   cd backend
   pm2 start server.js --name attendance-backend
   
   # Frontend
   cd ..
   pm2 start npm --name attendance-frontend -- run preview
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

## Network Configuration

### Configure Device Connection

1. Ensure the fingerprint device is on the same network as the server
2. Note the device IP address (e.g., 192.168.8.50)
3. Update `backend/.env` with the device IP
4. Test connection: `ping DEVICE_IP`

### Allow Client Access

1. **Find Server IP Address**
   ```bash
   ipconfig  # Windows
   ifconfig  # Linux
   ```

2. **Configure Firewall**
   - Allow port 3001 (Backend)
   - Allow port 5175 (Frontend)

3. **Access from Client Computers**
   - Open browser: `http://SERVER_IP:5175`
   - Example: `http://192.168.1.100:5175`

## PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs attendance-backend
pm2 logs attendance-frontend

# Restart services
pm2 restart all
pm2 restart attendance-backend

# Stop services
pm2 stop all

# Delete services
pm2 delete all

# Monitor
pm2 monit
```

## Troubleshooting

### Backend won't start
```bash
cd backend
pm2 logs attendance-backend
# Check for database connection errors
```

### Can't access from other computers
1. Check firewall settings
2. Verify server IP address
3. Ensure services are running: `pm2 status`

### Device connection fails
1. Ping device: `ping DEVICE_IP`
2. Check device is on same network
3. Verify device IP in `backend/.env`

### Database errors
```bash
# Check PostgreSQL is running
# Verify credentials in backend/.env
# Re-initialize database
cd backend
node init-database.js
```

## Default Credentials

**Admin User:**
- Email: `admin@elsewedy.com`
- Password: `admin123`

**Important:** Change the admin password after first login!

## Maintenance

### Daily Backup
```bash
# Backup database
pg_dump elsewedy_attendance > backup_$(date +%Y%m%d).sql
```

### Clear Old Logs
```bash
pm2 flush  # Clear PM2 logs
```

### Update System
```bash
# Stop services
pm2 stop all

# Pull latest code (if using Git)
git pull

# Reinstall dependencies
cd backend && npm install
cd .. && npm install

# Rebuild frontend
npm run build

# Restart services
pm2 restart all
```

## Production Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created and initialized
- [ ] Device IP configured in `.env`
- [ ] Firewall ports opened (3001, 5175)
- [ ] PM2 services running
- [ ] Admin password changed
- [ ] Backup schedule configured
- [ ] Client computers can access system
- [ ] Device syncing successfully

## Support

For issues or questions, contact the system administrator.
