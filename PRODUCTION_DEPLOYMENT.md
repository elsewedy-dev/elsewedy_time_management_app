# Production Deployment Checklist

## Before Deployment

### 1. Configure Production Environment

**Frontend (.env.production):**
```bash
# Replace SERVER_IP with actual server IP
VITE_API_URL=http://192.168.1.100:3001/api
```

**Backend (backend/.env.production):**
```bash
# Copy backend/.env.production to backend/.env
# Update these critical values:
- DB_PASSWORD: Set PostgreSQL password
- JWT_SECRET: Generate random string (use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
- ZK_DEVICE_IP: Set actual device IP address
- XFACE_DEVICE_IP: Set actual device IP address
```

### 2. Build Frontend
```bash
npm run build
```
This creates optimized production files in `dist/` folder.

### 3. Test Before Deployment
```bash
# Test backend
cd backend
npm start

# Test frontend build
npm run preview
```

## Deployment Steps

### Option A: Using PM2 (Recommended)

1. **Install PM2 globally:**
```bash
npm install -g pm2
```

2. **Start Backend:**
```bash
cd backend
pm2 start server.js --name attendance-backend --env production
```

3. **Serve Frontend:**
```bash
# Install serve globally
npm install -g serve

# Start frontend
pm2 start serve --name attendance-frontend -- dist -l 5175
```

4. **Save PM2 Configuration:**
```bash
pm2 save
pm2 startup
```

### Option B: Using Docker

```bash
cd backend/deploy
docker-compose up -d
```

## Post-Deployment Verification

### 1. Check Services Running
```bash
pm2 status
```

### 2. Test Backend Health
```bash
curl http://localhost:3001/health
```

### 3. Test from Client Computer
Open browser: `http://SERVER_IP:5175`

### 4. Test Device Connection
- Go to Settings > Devices
- Click "Test Connection" on each device
- Click "Sync Now" to pull attendance data

## Firewall Configuration

**Windows Firewall:**
```bash
# Allow port 3001 (Backend)
netsh advfirewall firewall add rule name="Attendance Backend" dir=in action=allow protocol=TCP localport=3001

# Allow port 5175 (Frontend)
netsh advfirewall firewall add rule name="Attendance Frontend" dir=in action=allow protocol=TCP localport=5175
```

**Linux (ufw):**
```bash
sudo ufw allow 3001/tcp
sudo ufw allow 5175/tcp
```

## Common Issues & Solutions

### Issue: Can't access from other computers
**Solution:**
1. Check firewall allows ports 3001 and 5175
2. Verify server IP address: `ipconfig` (Windows) or `ifconfig` (Linux)
3. Ensure backend HOST is set to `0.0.0.0` not `localhost`

### Issue: API calls fail (CORS errors)
**Solution:**
1. Check `.env.production` has correct `VITE_API_URL`
2. Rebuild frontend: `npm run build`
3. Restart PM2: `pm2 restart all`

### Issue: Device won't connect
**Solution:**
1. Ping device: `ping DEVICE_IP`
2. Ensure device and server on same network
3. Check device IP in `backend/.env`
4. Verify device port (usually 4370)

### Issue: Database connection fails
**Solution:**
1. Check PostgreSQL is running
2. Verify credentials in `backend/.env`
3. Initialize database: `node backend/init-database.js`

## Security Recommendations

1. **Change default admin password** immediately after first login
2. **Use strong JWT_SECRET** (32+ random characters)
3. **Set strong database password**
4. **Enable HTTPS** with SSL certificate (recommended for production)
5. **Restrict CORS_ORIGIN** to specific IPs if possible
6. **Regular backups** of PostgreSQL database

## Maintenance Commands

```bash
# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Monitor resources
pm2 monit

# Backup database
pg_dump elsewedy_attendance > backup_$(date +%Y%m%d).sql
```

## Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check backend logs: `backend/logs/error.log`
3. Verify all environment variables are set correctly
4. Ensure all services are running: `pm2 status`
