# ZKTeco Cloud Server Configuration Guide

## 📋 Overview
This guide explains how to configure your ZKTeco XFace Pro device to push attendance data to your backend server in real-time.

## 🌐 Network Configuration

### Your Network Setup:
```
Computer IP:     192.168.43.139
Backend Server:  192.168.43.139:3001
ZKTeco Device:   192.168.43.201:4370
Gateway:         192.168.43.1
```

## ⚙️ ZKTeco Device Configuration

### Step 1: Access Device Settings
1. On the ZKTeco device, press **Menu**
2. Enter admin password if prompted
3. Navigate to: **Communication** → **Cloud Server** (or **Server Settings**)

### Step 2: Configure Cloud Server

Enter the following settings:

| Setting | Value | Description |
|---------|-------|-------------|
| **Server Address** | `192.168.43.139` | Your computer's IP address |
| **Server Port** | `3001` | Backend server port |
| **Protocol** | `HTTP` or `TCP` | Choose HTTP if available |
| **Push Interval** | `60` seconds | How often to send data |
| **Enable Push** | `Yes` / `Enabled` | Activate the feature |

### Step 3: Save and Test
1. Save the settings
2. Restart the device if prompted
3. Scan a fingerprint to test

## 📡 Backend Endpoints

The backend now has these endpoints to receive data from the device:

### 1. Standard Push Endpoint
```
POST http://192.168.43.139:3001/zkteco/attendance/push
```
- Receives attendance data in JSON format
- Automatically creates/updates attendance records

### 2. iClock Protocol Endpoint
```
POST http://192.168.43.139:3001/zkteco/iclock/cdata
```
- For devices using iClock protocol
- Common in older ZKTeco models

### 3. Health Check
```
GET http://192.168.43.139:3001/zkteco/iclock/getrequest
```
- Device uses this to check if server is online

## 🔄 Two Sync Methods

### Method 1: Cloud Push (Real-time) ⚡
**How it works:**
- Device pushes data to backend immediately when fingerprint is scanned
- Fastest method (instant updates)
- Requires cloud server configuration on device

**Configuration:**
- Set on ZKTeco device as shown above
- Backend endpoint: `/zkteco/attendance/push`

### Method 2: Polling (Scheduled) 🔁
**How it works:**
- Backend pulls data from device every 5 minutes
- Works even if cloud push is not configured
- Already implemented in the code

**Configuration:**
- No device configuration needed
- Backend automatically syncs every 5 minutes
- Uses ZKTeco SDK to connect to device

## ✅ Recommended Setup

**Use BOTH methods for reliability:**

1. **Enable Cloud Push** on device for real-time updates
2. **Keep Polling enabled** as backup (already configured)

This ensures:
- ✅ Real-time updates when cloud push works
- ✅ Backup sync every 5 minutes if push fails
- ✅ No data loss

## 🧪 Testing

### Test Cloud Push:
1. Configure device with cloud server settings
2. Restart backend server: `npm start`
3. Scan fingerprint on device
4. Check backend logs for: "Received attendance push from ZKTeco device"
5. Check dashboard for immediate update

### Test Polling:
1. Make sure device is online at `192.168.43.201`
2. Backend automatically syncs every 5 minutes
3. Check logs for: "Syncing logs from device"

## 🔍 Troubleshooting

### Device Can't Connect to Server
**Check:**
- ✅ Backend server is running (`npm start`)
- ✅ Computer IP is correct: `192.168.43.139`
- ✅ Port 3001 is not blocked by firewall
- ✅ Device and computer are on same network

**Test connection from device:**
```bash
# On your computer, check if server is accessible
curl http://192.168.43.139:3001/health
```

### No Data Received
**Check:**
- ✅ Employee biometric ID matches device user ID
- ✅ Device has correct server address
- ✅ Backend logs show incoming requests
- ✅ Firewall allows incoming connections on port 3001

### Firewall Configuration
**Windows Firewall:**
```powershell
# Allow incoming connections on port 3001
New-NetFirewallRule -DisplayName "Elsewedy Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

## 📊 Monitoring

### Check Backend Logs:
```bash
# View real-time logs
npm start

# Look for these messages:
# ✅ "Received attendance push from ZKTeco device"
# ✅ "Created new attendance for [Employee Name]"
# ✅ "Updated attendance for [Employee Name]"
```

### Check Device Status:
- Go to device menu → Communication → Connection Status
- Should show "Connected" or "Online"

## 🎯 Summary

**Device Configuration:**
```
Server Address: 192.168.43.139
Server Port:    3001
Protocol:       HTTP
Push Interval:  60 seconds
Enable:         Yes
```

**Endpoints:**
- Push: `http://192.168.43.139:3001/zkteco/attendance/push`
- iClock: `http://192.168.43.139:3001/zkteco/iclock/cdata`
- Health: `http://192.168.43.139:3001/zkteco/iclock/getrequest`

**Benefits:**
- ⚡ Real-time attendance updates
- 🔄 Automatic backup sync every 5 minutes
- 📊 Immediate dashboard updates
- 🔒 Secure local network communication

---

**Need Help?**
- Check backend logs for errors
- Verify network connectivity
- Test with manual sync first
- Contact support if issues persist
