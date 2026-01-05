const express = require('express');
const cors = require('cors');
const ZKLib = require('zklib');

const app = express();
app.use(cors());
app.use(express.json());

const DEVICE_IP = '192.168.8.201';
const DEVICE_PORT = 4370;
const INPORT = 5201;

let zkInstance = null;
let lastRecordCount = 0;
let connectedClients = [];

// SSE endpoint for real-time updates
app.get('/api/attendance/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Add client to list
  connectedClients.push(res);
  console.log(`Client connected. Total clients: ${connectedClients.length}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to attendance stream' })}\n\n`);

  // Remove client on disconnect
  req.on('close', () => {
    connectedClients = connectedClients.filter(client => client !== res);
    console.log(`Client disconnected. Total clients: ${connectedClients.length}`);
  });
});

// Get all attendance records
app.get('/api/attendance', async (req, res) => {
  try {
    const zk = new ZKLib({
      ip: DEVICE_IP,
      port: DEVICE_PORT,
      inport: INPORT,
      timeout: 10000
    });

    zk.connect((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to connect to device', details: err.message });
      }

      zk.getAttendance((err, attendances) => {
        zk.disconnect();
        
        if (err) {
          return res.status(500).json({ error: 'Failed to get attendance', details: err.message });
        }

        // Format the data
        const formatted = attendances.map(record => ({
          userId: record.id,
          timestamp: record.timestamp,
          state: record.state,
          stateText: getStateText(record.state)
        }));

        res.json({ success: true, count: formatted.length, data: formatted });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get device info
app.get('/api/device/info', (req, res) => {
  const zk = new ZKLib({
    ip: DEVICE_IP,
    port: DEVICE_PORT,
    inport: INPORT,
    timeout: 10000
  });

  zk.connect((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to connect', details: err.message });
    }

    zk.serialNumber((err, serial) => {
      zk.version((err2, version) => {
        zk.getTime((err3, time) => {
          zk.disconnect();
          
          res.json({
            success: true,
            device: {
              ip: DEVICE_IP,
              serial: serial || 'Unknown',
              version: version || 'Unknown',
              time: time ? time.toString() : 'Unknown'
            }
          });
        });
      });
    });
  });
});

// Helper function
function getStateText(state) {
  const states = {
    0: 'Check-In',
    1: 'Check-Out',
    2: 'Break-Out',
    3: 'Break-In',
    4: 'OT-In',
    5: 'OT-Out',
    15: 'Face Recognition'
  };
  return states[state] || `State ${state}`;
}

// Broadcast to all connected clients
function broadcastToClients(data) {
  connectedClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Poll device for new records every 3 seconds
function startPolling() {
  setInterval(() => {
    if (connectedClients.length === 0) return; // Don't poll if no clients

    const zk = new ZKLib({
      ip: DEVICE_IP,
      port: DEVICE_PORT,
      inport: INPORT,
      timeout: 5000
    });

    zk.connect((err) => {
      if (err) {
        console.error('Polling error:', err.message);
        return;
      }

      zk.getAttendance((err, attendances) => {
        zk.disconnect();
        
        if (err) {
          console.error('Get attendance error:', err.message);
          return;
        }

        const currentCount = attendances.length;
        
        // Check if there are new records
        if (currentCount > lastRecordCount) {
          const newRecords = attendances.slice(lastRecordCount);
          console.log(`📊 New records detected: ${newRecords.length}`);
          
          // Broadcast new records to all clients
          newRecords.forEach(record => {
            const formatted = {
              type: 'new_attendance',
              data: {
                userId: record.id,
                timestamp: record.timestamp,
                state: record.state,
                stateText: getStateText(record.state)
              }
            };
            broadcastToClients(formatted);
          });
          
          lastRecordCount = currentCount;
        }
      });
    });
  }, 3000); // Poll every 3 seconds
}

// Initialize
const PORT = 3002;
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     ZKTeco Attendance Backend Server - RUNNING            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Device IP: ${DEVICE_IP}`);
  console.log(`✓ Real-time updates: http://localhost:${PORT}/api/attendance/stream`);
  console.log('\n📡 Starting real-time polling...\n');
  
  // Get initial count
  const zk = new ZKLib({
    ip: DEVICE_IP,
    port: DEVICE_PORT,
    inport: INPORT,
    timeout: 10000
  });

  zk.connect((err) => {
    if (err) {
      console.error('Initial connection failed:', err.message);
      return;
    }

    zk.getAttendance((err, attendances) => {
      zk.disconnect();
      if (!err) {
        lastRecordCount = attendances.length;
        console.log(`✓ Initial record count: ${lastRecordCount}\n`);
        console.log('👀 Watching for new attendance records...\n');
      }
    });
  });

  startPolling();
});
