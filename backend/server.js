// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Prevent unhandled errors from crashing the server (especially from zkteco-js socket errors)
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Caught unhandled error — server kept alive:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Caught unhandled rejection — server kept alive:', reason);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import deviceRoutes from './routes/devices.js';
import reportRoutes from './routes/reports.js';
import overtimeRoutes from './routes/overtime.js';
import shiftRoutes from './routes/shifts.js';
import departmentRoutes from './routes/departments.js';
import holidayRoutes from './routes/holidays.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { initializeDatabase } from './config/database.js';
import { initializeWebSocket } from './services/websocket.js';
import { initializeDeviceSync } from './services/deviceSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5175').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (device pushes, curl)
    if (!origin) return callback(null, true);
    // Allow any machine on the 10.201.x.x network
    if (/^http:\/\/10\.201\.\d+\.\d+(:\d+)?$/.test(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Static files for exports
app.use('/exports', express.static(join(__dirname, 'exports')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Import ZKTeco webhook routes
import zktecoWebhookRoutes from './routes/zktecoWebhook.js';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/holidays', holidayRoutes);

// ZKTeco webhook routes (no /api prefix for device compatibility)
app.use('/zkteco', zktecoWebhookRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// Initialize application
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Elsewedy Attendance System Backend running on http://${HOST}:${PORT}`);
      logger.info(`📊 Health check: http://${HOST}:${PORT}/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use by another process. Please terminate the conflicting process or change PORT in .env.`);
        process.exit(1);
      } else {
        logger.error('Server execution error:', err);
      }
    });

    // Initialize WebSocket server (after HTTP server starts)
    initializeWebSocket(server);
    logger.info('WebSocket server initialized');

    // Initialize device synchronization
    await initializeDeviceSync();
    logger.info('Device synchronization initialized');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;

