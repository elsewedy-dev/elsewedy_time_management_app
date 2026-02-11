# Elsewedy Attendance System - Server Setup Guide

## 🖥️ Server Deployment Options

### Option 1: Direct Node.js Installation (Recommended for Company Server)

#### Prerequisites
- Windows Server or Windows 10/11 PC
- Node.js 18+ installed
- Network access to ZKTeco devices
- Static IP address for the server

#### Installation Steps

1. **Install Node.js on Server**
   ```bash
   # Download and install Node.js from nodejs.org
   # Verify installation
   node --version
   npm --version
   ```

2. **Deploy Backend Code**
   ```bash
   # Copy the backend folder to server
   # Example: C:\elsewedy-attendance\backend\
   cd C:\elsewedy-attendance\backend
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Copy and edit environment file
   copy config.env.example .env
   # Edit .env with server-specific settings
   ```

4. **Initialize Database**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Install as Windows Service**
   ```bash
   # Install PM2 for process management
   npm install -g pm2
   npm install -g pm2-windows-startup
   
   # Create PM2 ecosystem file
   # Start the application
   pm2 start server.js --name "elsewedy-backend"
   
   # Save PM2 configuration
   pm2 save
   pm2-startup install
   ```

### Option 2: Docker Deployment

#### Prerequisites
- Docker Desktop installed on server
- Docker Compose support

#### Installation Steps

1. **Install Docker Desktop**
   ```bash
   # Download from docker.com
   # Enable Windows containers if needed
   ```

2. **Deploy with Docker Compose**
   ```bash
   cd backend/deploy
   # Create .env file for Docker
   # Edit docker-compose.yml if needed
   docker-compose up -d
   ```

### Option 3: Windows Service (Manual)

1. **Install node-windows**
   ```bash
   npm install -g node-windows
   ```

2. **Configure and Install Service**
   ```bash
   cd backend/deploy
   node windows-service.js install
   ```

## 🌐 Network Configuration

### Server Network Settings

#### Static IP Configuration
```bash
# Configure static IP for the server
# Example: 192.168.1.10
# Ensure this IP is accessible by:
# - ZKTeco devices
# - Frontend clients
# - Admin workstations
```

#### Firewall Configuration
```bash
# Windows Firewall Rules
# Allow inbound connections on port 3001
# Allow outbound connections to device IPs
# Allow WebSocket connections on port 3001
```

### ZKTeco Device Network Setup

#### Device IP Configuration
```javascript
// In your .env file:
ZK_DEVICE_IP=192.168.1.100      // u270 device IP
ZK_DEVICE_PORT=4370
XFACE_DEVICE_IP=192.168.1.101   // XFace Pro device IP
XFACE_DEVICE_PORT=4370

// Ensure devices are on same network as server
// Test connectivity: ping 192.168.1.100
```

#### Network Connectivity Test
```bash
# Test device connectivity from server
telnet 192.168.1.100 4370
telnet 192.168.1.101 4370

# Test WebSocket connectivity
# Open browser to: http://server-ip:3001/health
```

## 📁 Directory Structure on Server

```
C:\elsewedy-attendance\
├── backend\
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── ...
├── database\
│   └── attendance.db
├── logs\
│   ├── app.log
│   ├── error.log
│   └── ...
├── exports\
│   ├── reports\
│   └── ...
└── frontend\
    └── (your React app)
```

## ⚙️ Production Configuration

### Environment Variables (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DB_PATH=C:\elsewedy-attendance\database\attendance.db

# Security
JWT_SECRET=your-super-secure-secret-key-here
JWT_EXPIRES_IN=24h

# ZKTeco Devices
ZK_DEVICE_IP=192.168.1.100
ZK_DEVICE_PORT=4370
ZK_DEVICE_PASSWORD=0
ZK_DEVICE_TIMEOUT=5000

XFACE_DEVICE_IP=192.168.1.101
XFACE_DEVICE_PORT=4370
XFACE_DEVICE_PASSWORD=0

# Attendance Settings
WORK_START_TIME=08:00
WORK_END_TIME=17:00
LATE_THRESHOLD_MINUTES=15
OVERTIME_THRESHOLD_MINUTES=30

# Logging
LOG_LEVEL=info
LOG_FILE=C:\elsewedy-attendance\logs\app.log

# CORS (allow frontend access)
CORS_ORIGIN=http://192.168.1.10:5175
```

### SSL/HTTPS Configuration (Optional)
```bash
# For production, consider using HTTPS
# Install certificates or use reverse proxy
# Update CORS_ORIGIN to use https://
```

## 🔧 Service Management

### PM2 Commands
```bash
# Start service
pm2 start elsewedy-backend

# Stop service
pm2 stop elsewedy-backend

# Restart service
pm2 restart elsewedy-backend

# View logs
pm2 logs elsewedy-backend

# Monitor service
pm2 monit

# Auto-start on boot
pm2 save
pm2-startup install
```

### Windows Service Commands
```bash
# Start service
net start "Elsewedy Attendance Backend"

# Stop service
net stop "Elsewedy Attendance Backend"

# Check service status
sc query "Elsewedy Attendance Backend"
```

## 🔍 Monitoring and Maintenance

### Health Checks
```bash
# Check if service is running
curl http://localhost:3001/health

# Check device connectivity
curl http://localhost:3001/api/devices/stats/overview

# Check database status
# Look for attendance.db file in database directory
```

### Log Monitoring
```bash
# View application logs
tail -f C:\elsewedy-attendance\logs\app.log

# View error logs
tail -f C:\elsewedy-attendance\logs\error.log

# Check PM2 logs
pm2 logs elsewedy-backend
```

### Backup Strategy
```bash
# Backup database
copy C:\elsewedy-attendance\database\attendance.db C:\backups\attendance-$(date).db

# Backup logs (optional)
copy C:\elsewedy-attendance\logs C:\backups\logs-$(date)

# Schedule automatic backups using Windows Task Scheduler
```

## 🚨 Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   # Check Node.js installation
   node --version
   
   # Check port availability
   netstat -an | findstr :3001
   
   # Check logs for errors
   pm2 logs elsewedy-backend
   ```

2. **Device Connection Issues**
   ```bash
   # Test network connectivity
   ping 192.168.1.100
   ping 192.168.1.101
   
   # Check firewall settings
   # Ensure port 4370 is accessible
   
   # Test device sync manually
   curl -X POST http://localhost:3001/api/devices/{device-id}/sync
   ```

3. **Database Issues**
   ```bash
   # Check database file permissions
   # Ensure database directory exists
   # Run database migration
   npm run migrate
   ```

4. **Frontend Connection Issues**
   ```bash
   # Check CORS configuration
   # Verify server IP and port
   # Test API endpoints
   curl http://server-ip:3001/api/health
   ```

### Performance Optimization

1. **Database Optimization**
   ```bash
   # Regular database maintenance
   # Monitor database size
   # Archive old attendance records if needed
   ```

2. **Memory Management**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Restart service if memory usage is high
   pm2 restart elsewedy-backend
   ```

3. **Network Optimization**
   ```bash
   # Optimize device sync intervals
   # Monitor network latency
   # Adjust timeout settings if needed
   ```

## 📞 Support and Maintenance

### Regular Maintenance Tasks
- [ ] Monitor service status daily
- [ ] Check device connectivity weekly
- [ ] Backup database weekly
- [ ] Review logs monthly
- [ ] Update dependencies quarterly

### Emergency Procedures
- [ ] Service restart procedures
- [ ] Database recovery steps
- [ ] Device reconnection process
- [ ] Contact information for technical support

## 🔐 Security Considerations

### Server Security
- [ ] Regular Windows updates
- [ ] Antivirus protection
- [ ] Firewall configuration
- [ ] User access controls
- [ ] Regular security audits

### Application Security
- [ ] Strong JWT secrets
- [ ] Regular password updates
- [ ] User role management
- [ ] API rate limiting
- [ ] Input validation

This setup guide will help you deploy the Elsewedy Attendance System on your company's server PC with proper configuration for production use.
