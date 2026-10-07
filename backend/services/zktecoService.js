import { logger } from '../utils/logger.js';
import { Device } from '../models/Device.js';
import { Employee } from '../models/Employee.js';
import { Attendance } from '../models/Attendance.js';
import { sequelize } from '../config/database.js';
import ZKTeco from 'zkteco-js';

/**
 * ZKTeco Device Service
 * Handles communication with ZKTeco devices (u270, XFace Pro)
 */
class ZKTecoService {
  constructor() {
    this.devices = new Map();
    this.syncIntervals = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the ZKTeco service
   */
  async initialize() {
    try {
      logger.info('Initializing ZKTeco Service...');
      
      // Load devices from database
      const devices = await Device.getActiveDevices();
      
      for (const device of devices) {
        await this.registerDevice(device);
      }
      
      this.isInitialized = true;
      logger.info(`ZKTeco Service initialized with ${devices.length} devices`);
      
    } catch (error) {
      logger.error('Failed to initialize ZKTeco Service:', error);
      throw error;
    }
  }

  /**
   * Register a device for monitoring and syncing
   */
  async registerDevice(device) {
    try {
      const deviceInfo = {
        id: device.id,
        name: device.name,
        model: device.model,
        type: device.type,
        ipAddress: device.ipAddress,
        port: device.port,
        password: device.password,
        syncInterval: device.syncInterval,
        connectionTimeout: device.connectionTimeout,
      };

      this.devices.set(device.id, deviceInfo);
      
      // Start sync interval for this device
      this.startDeviceSync(device.id);
      
      logger.info(`Device registered: ${device.name} (${device.type}) at ${device.ipAddress}:${device.port}`);
      
    } catch (error) {
      logger.error(`Failed to register device ${device.id}:`, error);
      throw error;
    }
  }

  /**
   * Start periodic sync for a device
   */
  startDeviceSync(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return;

    if (this.syncIntervals.has(deviceId)) {
      clearInterval(this.syncIntervals.get(deviceId));
    }

    // Delay first sync by 30 seconds to let the server fully initialize
    const interval = setInterval(async () => {
      try {
        await this.syncDeviceLogs(deviceId);
      } catch (error) {
        logger.error(`Sync failed for device ${deviceId}:`, error.message);
      }
    }, device.syncInterval * 1000);

    this.syncIntervals.set(deviceId, interval);
    logger.info(`Started sync interval for device ${deviceId} (${device.syncInterval}s)`);
  }

  /**
   * Sync attendance logs from a specific device
   */
  async syncDeviceLogs(deviceId, forceFullSync = false) {
    const device = this.devices.get(deviceId);
    if (!device) {
      logger.warn(`Device ${deviceId} not found for sync`);
      return;
    }

    try {
      logger.info(`Syncing logs from device: ${device.name}`);
      const dbDevice = await Device.findByPk(deviceId);

      // Connect to device and get ALL logs (no date filter — device clock may be wrong)
      const logs = await this.getDeviceLogs(device);

      if (logs && logs.length > 0) {
        await this.processDeviceLogs(deviceId, logs);
        await dbDevice.update({
          lastSyncTime: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        });
        logger.info(`Successfully synced ${logs.length} logs from device: ${device.name}`);
      } else {
        logger.info(`No logs found on device: ${device.name}`);
        await dbDevice.update({
          lastSyncTime: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        });
      }

    } catch (error) {
      logger.error(`Failed to sync device ${device.name}:`, error);
      const dbDevice = await Device.findByPk(deviceId);
      if (dbDevice) {
        await dbDevice.update({
          lastSyncTime: new Date(),
          lastSyncStatus: 'failed',
          lastSyncError: error.message,
        });
      }
    }
  }

  /**
   * Get logs from a ZKTeco device using zkteco-js SDK
   */
  async getDeviceLogs(device) {
    let zkInstance = null;

    try {
      logger.info(`Connecting to device ${device.name} at ${device.ipAddress}:${device.port}`);

      zkInstance = new ZKTeco(device.ipAddress, device.port, 5200, 15000);

      // Catch socket-level errors so they don't crash the process
      if (zkInstance.socket) {
        zkInstance.socket.on('error', (err) => {
          logger.error(`ZKTeco socket error: ${err.message}`);
        });
      }

      await zkInstance.createSocket();

      // Re-attach socket error handler after socket is created
      if (zkInstance.socket) {
        zkInstance.socket.on('error', (err) => {
          logger.error(`ZKTeco socket error after connect: ${err.message}`);
        });
      }

      logger.info(`Connected to device ${device.name}`);

      const attendanceLogs = await zkInstance.getAttendances();
      logger.info(`Retrieved ${attendanceLogs.data.length} attendance logs from ${device.name}`);

      try { await zkInstance.disconnect(); } catch (_) {}

      const validLogs = attendanceLogs.data.filter(log => log.user_id && log.record_time);
      logger.info(`${validLogs.length} valid logs found on device`);

      if (validLogs.length === 0) return [];

      validLogs.sort((a, b) => new Date(a.record_time) - new Date(b.record_time));

      return validLogs.map(log => ({
        userId: log.user_id,
        timestamp: new Date(log.record_time),
        verificationType: this.getVerificationType(log.type),
        deviceId: device.id,
        rawData: {
          deviceSerial: device.serialNumber,
          logType: 'attendance',
          verificationResult: 1,
          ip: device.ipAddress,
          state: log.state,
          sn: log.sn,
          originalTime: log.record_time,
        }
      }));

    } catch (error) {
      logger.error(`Failed to get logs from device ${device.name}:`, error);
      if (zkInstance) {
        try { await zkInstance.disconnect(); } catch (_) {}
      }
      const dbDevice = await Device.findByPk(device.id);
      if (dbDevice) {
        await dbDevice.update({
          lastSyncTime: new Date(),
          lastSyncStatus: 'failed',
          lastSyncError: `Cannot reach device at ${device.ipAddress}:${device.port} — ${error.message || 'Timeout'}`,
        });
      }
      throw new Error(`Could not connect to device "${device.name}" at ${device.ipAddress}:${device.port}. ${error.message || 'Timeout'}`);
    }
  }

  getVerificationType(verifyType) {
    const typeMap = {
      0: 'password',
      1: 'fingerprint',
      2: 'card',
      3: 'password',
      4: 'fingerprint',
      15: 'face',
    };
    return typeMap[verifyType] || 'fingerprint';
  }

  /**
   * Process and save device logs to database
   * Strategy: first scan of the day = check-in, last scan of the day = check-out
   * Uses sn (sequence number) as unique log identifier to avoid duplicates
   */
  async processDeviceLogs(deviceId, logs) {
    try {
      let processed = 0;
      let skipped = 0;

      // Group logs by employeeId + date so we can pick first/last per day
      const grouped = {};
      for (const log of logs) {
        const logTime = new Date(log.timestamp);
        const dateOnly = logTime.toISOString().split('T')[0];
        const key = `${log.userId}__${dateOnly}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(log);
      }

      for (const [key, dayLogs] of Object.entries(grouped)) {
        // Sort ascending — earliest is check-in, latest is check-out
        dayLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const firstLog = dayLogs[0];
        const lastLog  = dayLogs[dayLogs.length - 1];
        const checkInTime  = new Date(firstLog.timestamp);
        const checkOutTime = new Date(lastLog.timestamp);
        const dateOnly = checkInTime.toISOString().split('T')[0];
        const userId   = firstLog.userId.toString();

        // Find the employee by employeeId (company ID from device)
        // Attendance logs contain userId (company ID), NOT uid (internal slot)
        // Do NOT fall back to biometricId — that causes mismatches when
        // one person's company ID equals another person's slot number
        let employee = await Employee.findOne({ where: { employeeId: userId } });
        if (!employee) {
          logger.warn(`Employee not found for user_id (company ID): ${userId} — skipping to avoid mismatch`);
          skipped++;
          continue;
        }

        // Activate if inactive
        if (!employee.isActive) {
          await employee.update({ isActive: true });
        }

        // Determine status
        // If only one scan and it happened recently (within last 2 hours), consider still IN
        const now = new Date();
        const minutesSinceLastScan = (now - checkOutTime) / 60000;
        const hasMultipleScans = dayLogs.length > 1;
        const sameInOut = checkInTime.getTime() === checkOutTime.getTime();

        // Status logic:
        // - One scan only → present (still in, no checkout yet)
        // - Multiple scans → use first as check-in, last as check-out → present
        // - Only mark checkout if there are actually 2+ distinct scan times
        const status = 'present';
        const finalCheckOut = (hasMultipleScans && !sameInOut) ? checkOutTime : null;

        // Upsert the attendance record for this employee+date
        const existing = await Attendance.findOne({
          where: { employeeId: employee.id, date: dateOnly }
        });

        if (!existing) {
          await Attendance.create({
            employeeId: employee.id,
            deviceId: deviceId,
            date: dateOnly,
            checkInTime: checkInTime,
            checkOutTime: finalCheckOut,
            status: status,
            verificationMethod: firstLog.verificationType,
            deviceLogId: userId,
            rawLogData: firstLog.rawData,
          });
          processed++;
          logger.debug(`Attendance created: ${employee.firstName} ${employee.lastName} on ${dateOnly}`);
        } else {
          // Always update with latest data — keep earliest check-in, latest check-out
          const updatedCheckIn = existing.checkInTime && existing.checkInTime < checkInTime
            ? existing.checkInTime
            : checkInTime;
          const updatedCheckOut = finalCheckOut
            ? (existing.checkOutTime && existing.checkOutTime > finalCheckOut
                ? existing.checkOutTime
                : finalCheckOut)
            : existing.checkOutTime;

          await existing.update({
            checkInTime: updatedCheckIn,
            checkOutTime: updatedCheckOut,
            status: status,
          });
          logger.debug(`Attendance updated: ${employee.firstName} ${employee.lastName} on ${dateOnly}`);
          skipped++;
        }

        // Broadcast via WebSocket
        try {
          const { wsService } = await import('./websocket.js');
          if (wsService.isInitialized) {
            const attendanceWithEmployee = await Attendance.findOne({
              where: { employeeId: employee.id, date: dateOnly },
              include: [{
                model: Employee,
                as: 'employee',
                attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId']
              }]
            });
            wsService.broadcastAttendanceUpdate(attendanceWithEmployee);
          }
        } catch (wsError) {
          logger.error('Failed to broadcast attendance update:', wsError);
        }
      }

      logger.info(`Processed ${processed} new attendance records, updated/skipped ${skipped}`);

    } catch (error) {
      logger.error('Failed to process device logs:', error);
      throw error;
    }
  }

  /**
   * Sync users/employees from device to database
   */
  async syncUsersFromDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    let zkInstance = null;
    
    try {
      logger.info(`Syncing users from device: ${device.name}`);
      
      // Create ZKTeco instance
      zkInstance = new ZKTeco(device.ipAddress, device.port, 5200, device.connectionTimeout || 5000);
      
      // Connect to device
      await zkInstance.createSocket();
      logger.info(`Connected to device ${device.name}`);
      
      // Get all users from device
      const users = await zkInstance.getUsers();
      logger.info(`Retrieved ${users.data.length} users from ${device.name}`);
      
      // Disconnect from device
      await zkInstance.disconnect();
      
      // Process and save users to database
      const syncResults = {
        total: users.data.length,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };
      
      for (const user of users.data) {
        try {
          // uid  = internal slot (attendance logs reference this)
          // userId = real company ID set during enrollment
          const biometricId = user.uid;
          const employeeId = user.userId?.toString().trim() || user.uid.toString();

          // Parse name
          const rawName = user.name?.trim() || '';
          const nameParts = rawName.split(/\s+/);
          let firstName = nameParts[0] || rawName;
          let lastName = nameParts.slice(1).join(' ') || '';
          if (firstName.length < 2) firstName = firstName.padEnd(2, 'X');
          if (firstName.length > 50) firstName = firstName.substring(0, 50);
          if (lastName.length > 50) lastName = lastName.substring(0, 50);

          // Find employee by biometricId (uid from this device) OR by employeeId (userId)
          // The same person can have different uids on different devices, so check both
          let employee = await Employee.findOne({ where: { biometricId } });
          if (!employee) {
            // Not found by biometricId — check by employeeId (company ID from device)
            // This prevents creating duplicate employees when syncing from a second device
            employee = await Employee.findOne({ where: { employeeId } });
          }

          if (employee) {
            // Only overwrite the name if:
            // 1. The employee has no real name yet (numeric/empty), OR
            // 2. The device name is not numeric/garbage AND matches the employee's current name
            // This prevents a secondary device from overwriting a correct name with a wrong one
            const currentNameIsReal = employee.firstName && !/^\d+$/.test(employee.firstName);
            const deviceNameIsReal = firstName && !/^\d+$/.test(firstName);
            const shouldUpdateName = !currentNameIsReal || !deviceNameIsReal
              ? deviceNameIsReal  // only update if device has a real name and current doesn't
              : employee.firstName.toLowerCase() === firstName.toLowerCase(); // same person confirmed

            const updateData = { employeeId };
            if (shouldUpdateName) {
              updateData.firstName = firstName;
              updateData.lastName = lastName;
            }

            try {
              await employee.update(updateData);
            } catch (dupErr) {
              // employeeId conflict — just update name if needed
              if (shouldUpdateName) await employee.update({ firstName, lastName });
              logger.warn(`Duplicate employeeId=${employeeId} for uid=${biometricId} (${rawName}), kept existing ID`);
            }
            syncResults.updated++;
            logger.debug(`Updated employee: ${rawName} (uid=${biometricId}, employeeId=${employeeId})`);
          } else {
            if (!rawName) { syncResults.skipped++; continue; }

            employee = await Employee.create({
              firstName,
              lastName,
              biometricId,
              employeeId,
              departmentId: null,
              hireDate: new Date(),
              isActive: true,
            });
            syncResults.created++;
            logger.info(`Created employee: ${rawName} (uid=${biometricId}, employeeId=${employeeId})`);
          }
        } catch (error) {
          logger.error(`Failed to process user ${user.name}:`, error);
          syncResults.errors.push({
            user: user.name,
            error: error.message
          });
        }
      }
      
      logger.info(`User sync completed: ${syncResults.created} created, ${syncResults.updated} updated, ${syncResults.skipped} skipped, ${syncResults.errors.length} errors`);
      
      return syncResults;
      
    } catch (error) {
      logger.error(`Failed to sync users from device ${device.name}:`, error);
      
      if (zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch (disconnectError) {
          logger.error('Failed to disconnect:', disconnectError);
        }
      }

      const dbDevice = await Device.findByPk(device.id);
      if (dbDevice) {
        await dbDevice.update({
          lastSyncTime: new Date(),
          lastSyncStatus: 'failed',
          lastSyncError: `Cannot reach device at ${device.ipAddress}:${device.port} — ${error.message || 'Timeout'}`,
        });
      }
      throw new Error(`Could not connect to device "${device.name}" at ${device.ipAddress}:${device.port}. ${error.message || 'Timeout'}`);
    }
  }

  /**
   * Test device connectivity using zkteco-js SDK
   */
  async testDeviceConnection(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    let zkInstance = null;
    
    try {
      logger.info(`Testing connection to device: ${device.name}`);
      
      // Create ZKTeco instance
      zkInstance = new ZKTeco(device.ipAddress, device.port, 5200, device.connectionTimeout || 5000);
      
      // Try to connect
      await zkInstance.createSocket();
      logger.info(`Successfully connected to ${device.name}`);
      
      // Get device info
      const deviceInfo = await zkInstance.getInfo();
      
      // Disconnect
      await zkInstance.disconnect();
      
      return {
        success: true,
        message: 'Device connection successful',
        deviceInfo: {
          ...device,
          firmwareVersion: deviceInfo.fwVersion || 'N/A',
          serialNumber: deviceInfo.serialNumber || device.serialNumber,
          platform: deviceInfo.platform || 'N/A',
          deviceName: deviceInfo.deviceName || device.name,
        },
      };
      
    } catch (error) {
      logger.error(`Device connection test failed for ${device.name}:`, error);
      
      // Try to disconnect if connection was established
      if (zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch (disconnectError) {
          logger.error('Failed to disconnect:', disconnectError);
        }
      }
      
      return {
        success: false,
        message: error.message,
        deviceInfo: device,
      };
    }
  }

  /**
   * Get device status and statistics
   */
  async getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const dbDevice = await Device.findByPk(deviceId);
    if (!dbDevice) {
      throw new Error('Device not found in database');
    }

    return {
      ...device,
      syncStatus: dbDevice.getSyncStatus(),
      isOnline: await dbDevice.isOnline(),
      lastSyncTime: dbDevice.lastSyncTime,
      lastSyncStatus: dbDevice.lastSyncStatus,
      lastSyncError: dbDevice.lastSyncError,
    };
  }

  /**
   * Stop device sync
   */
  stopDeviceSync(deviceId) {
    if (this.syncIntervals.has(deviceId)) {
      clearInterval(this.syncIntervals.get(deviceId));
      this.syncIntervals.delete(deviceId);
      logger.info(`Stopped sync for device: ${deviceId}`);
    }
  }

  /**
   * Shutdown the service
   */
  shutdown() {
    logger.info('Shutting down ZKTeco Service...');
    
    // Stop all sync intervals
    for (const [deviceId, interval] of this.syncIntervals) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();
    
    this.devices.clear();
    this.isInitialized = false;
    
    logger.info('ZKTeco Service shutdown complete');
  }
}

// Export singleton instance
export const zkService = new ZKTecoService();
export default zkService;
