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

    // Clear existing interval if any
    if (this.syncIntervals.has(deviceId)) {
      clearInterval(this.syncIntervals.get(deviceId));
    }

    // Start new sync interval
    const interval = setInterval(async () => {
      try {
        await this.syncDeviceLogs(deviceId);
      } catch (error) {
        logger.error(`Sync failed for device ${deviceId}:`, error);
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
      
      // Get last sync time from database
      const dbDevice = await Device.findByPk(deviceId);
      
      // For manual sync, look back further to catch recent scans
      // For auto sync, use lastSyncTime but with a buffer
      let lastSyncTime;
      if (forceFullSync) {
        // Look back 7 days for manual sync to catch everything recent
        lastSyncTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        logger.info(`Force full sync: checking logs from last 7 days`);
      } else {
        // For auto sync, look back 1 hour before last sync to avoid missing logs
        const bufferTime = 60 * 60 * 1000; // 1 hour buffer
        lastSyncTime = dbDevice.lastSyncTime 
          ? new Date(dbDevice.lastSyncTime.getTime() - bufferTime)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);
      }
      
      // Connect to device and get logs
      const logs = await this.getDeviceLogs(device, lastSyncTime);
      
      if (logs && logs.length > 0) {
        // Process and save logs
        await this.processDeviceLogs(deviceId, logs);
        
        // Update device sync status
        await dbDevice.update({
          lastSyncTime: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        });
        
        logger.info(`Successfully synced ${logs.length} logs from device: ${device.name}`);
      } else {
        logger.info(`No new logs found for device: ${device.name}`);
        
        // Update sync time even if no logs
        await dbDevice.update({
          lastSyncTime: new Date(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        });
      }
      
    } catch (error) {
      logger.error(`Failed to sync device ${device.name}:`, error);
      
      // Update device with error status
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
  async getDeviceLogs(device, fromDate) {
    let zkInstance = null;
    
    try {
      logger.info(`Connecting to device ${device.name} at ${device.ipAddress}:${device.port}`);
      
      // Create ZKTeco instance
      zkInstance = new ZKTeco(device.ipAddress, device.port, 5200, device.connectionTimeout || 5000);
      
      // Connect to device
      await zkInstance.createSocket();
      logger.info(`Connected to device ${device.name}`);
      
      // Get attendance logs
      const attendanceLogs = await zkInstance.getAttendances();
      logger.info(`Retrieved ${attendanceLogs.data.length} attendance logs from ${device.name}`);
      
      // Disconnect from device
      await zkInstance.disconnect();
      
      // Get all valid logs
      const validLogs = attendanceLogs.data.filter(log => {
        return log.user_id && log.record_time;
      });
      
      logger.info(`Retrieved ${validLogs.length} valid logs from device`);
      
      // Sort by the device's record time descending (most recent first)
      validLogs.sort((a, b) => new Date(b.record_time) - new Date(a.record_time));
      
      // Get the timestamp of the most recent log
      if (validLogs.length === 0) {
        logger.info('No valid logs found');
        return [];
      }
      
      const mostRecentLogTime = new Date(validLogs[0].record_time);
      logger.info(`Most recent log time on device: ${mostRecentLogTime}`);
      
      // Only process logs from the last 2 minutes (on device time)
      const twoMinutesAgo = new Date(mostRecentLogTime.getTime() - 2 * 60 * 1000);
      const veryRecentLogs = validLogs.filter(log => {
        const logTime = new Date(log.record_time);
        return logTime >= twoMinutesAgo;
      });
      
      logger.info(`Found ${veryRecentLogs.length} logs from last 2 minutes on device`);
      
      // Use current time for all logs
      const now = new Date();
      const transformedLogs = veryRecentLogs.map((log, index) => ({
        userId: log.user_id,
        timestamp: new Date(now.getTime() - (index * 2000)), // 2 seconds apart
        verificationType: this.getVerificationType(log.type),
        deviceId: device.id,
        rawData: {
          deviceSerial: log.deviceId || device.serialNumber,
          logType: 'attendance',
          verificationResult: 1,
          ip: device.ipAddress,
          state: log.state,
          sn: log.sn,
          originalTime: log.record_time
        }
      }));
      
      return transformedLogs;
      
    } catch (error) {
      logger.error(`Failed to get logs from device ${device.name}:`, error);
      
      // Try to disconnect if connection was established
      if (zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch (disconnectError) {
          logger.error('Failed to disconnect:', disconnectError);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Map ZKTeco verification type to our format
   */
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
   * Generate mock logs for testing (remove in production)
   */
  generateMockLogs(device, fromDate) {
    const logs = [];
    const now = new Date();
    const hoursDiff = Math.floor((now - fromDate) / (1000 * 60 * 60));
    
    // Generate some mock logs for the past few hours
    for (let i = 0; i < Math.min(hoursDiff * 2, 10); i++) {
      const logTime = new Date(now.getTime() - (i * 30 * 60 * 1000)); // Every 30 minutes
      
      logs.push({
        userId: Math.floor(Math.random() * 100) + 1,
        timestamp: logTime,
        verificationType: Math.random() > 0.5 ? 'fingerprint' : 'face',
        deviceId: device.id,
        rawData: {
          deviceSerial: device.serialNumber,
          logType: 'check_in',
          verificationResult: 1,
        },
      });
    }
    
    return logs;
  }

  /**
   * Process and save device logs to database
   */
  async processDeviceLogs(deviceId, logs) {
    try {
      let processed = 0;
      let skipped = 0;
      let activated = 0;
      
      for (const log of logs) {
        // Find employee by biometric ID
        const employee = await Employee.findOne({
          where: { biometricId: log.userId }
        });

        if (!employee) {
          logger.warn(`Employee not found for biometric ID: ${log.userId}`);
          skipped++;
          continue;
        }

        // Activate employee on first fingerprint scan if inactive
        if (!employee.isActive) {
          await employee.update({ isActive: true });
          logger.info(`Activated employee: ${employee.firstName} ${employee.lastName} (first fingerprint scan)`);
          activated++;
        }

        // Determine if this is check-in or check-out
        const logTime = new Date(log.timestamp);
        const dateOnly = logTime.toISOString().split('T')[0];
        
        // Find existing attendance record for this employee and date
        let attendance = await Attendance.findOne({
          where: {
            employeeId: employee.id,
            date: dateOnly,
          }
        });

        if (!attendance) {
          // Create new attendance record with check-in time
          attendance = await Attendance.create({
            employeeId: employee.id,
            deviceId: deviceId,
            date: dateOnly,
            checkInTime: logTime,
            status: 'present',
            verificationMethod: log.verificationType,
            deviceLogId: log.userId.toString(),
            rawLogData: log.rawData,
          });
          processed++;
          logger.debug(`Check-in for ${employee.firstName} ${employee.lastName} at ${logTime.toLocaleTimeString()}`);
          
          // Broadcast attendance update via WebSocket
          try {
            const { wsService } = await import('./websocket.js');
            if (wsService.isInitialized) {
              // Load attendance with employee details
              const attendanceWithEmployee = await Attendance.findByPk(attendance.id, {
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
        } else if (!attendance.checkOutTime) {
          // Update with check-out time if not already set
          attendance.checkOutTime = logTime;
          attendance.status = 'absent';
          await attendance.save();
          logger.debug(`Check-out for ${employee.firstName} ${employee.lastName} at ${logTime.toLocaleTimeString()}`);
          
          // Broadcast attendance update via WebSocket
          try {
            const { wsService } = await import('./websocket.js');
            if (wsService.isInitialized) {
              const attendanceWithEmployee = await Attendance.findByPk(attendance.id, {
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
        } else {
          // Already has both check-in and check-out
          skipped++;
        }
      }
      
      logger.info(`Processed ${processed} new attendance records, skipped ${skipped} existing, activated ${activated} employees`);
      
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
          // Check if employee with this biometric ID exists
          let employee = await Employee.findOne({
            where: { biometricId: user.uid }
          });
          
          if (employee) {
            // Update existing employee
            const nameParts = user.name.trim().split(/\s+/); // Split by whitespace
            let firstName = nameParts[0] || user.name.trim();
            let lastName = nameParts.slice(1).join(' ') || '';
            
            // Ensure firstName meets minimum length requirement (2 chars)
            if (firstName.length < 2) {
              firstName = firstName.padEnd(2, 'X'); // Pad with X if too short
            }
            
            // Ensure firstName doesn't exceed max length (50 chars)
            if (firstName.length > 50) {
              firstName = firstName.substring(0, 50);
            }
            
            // Ensure lastName doesn't exceed max length (50 chars)
            if (lastName.length > 50) {
              lastName = lastName.substring(0, 50);
            }
            
            await employee.update({
              firstName: firstName,
              lastName: lastName,
            });
            syncResults.updated++;
            logger.debug(`Updated employee: ${user.name} (Biometric ID: ${user.uid})`);
          } else {
            // Check if we need to create a new employee
            // Only create if the user has a valid name
            if (user.name && user.name.trim()) {
              // Get default user for createdBy
              const { User } = await import('../models/User.js');
              const defaultUser = await User.findOne({
                where: { role: 'admin' }
              });
              
              if (!defaultUser) {
                syncResults.errors.push({
                  user: user.name,
                  error: 'Default user not found'
                });
                continue;
              }
              
              // Create new employee (inactive until first fingerprint scan)
              // Department will be null - must be assigned manually
              const nameParts = user.name.trim().split(/\s+/); // Split by whitespace
              let firstName = nameParts[0] || user.name.trim();
              let lastName = nameParts.slice(1).join(' ') || '';
              
              // Ensure firstName meets minimum length requirement (2 chars)
              if (firstName.length < 2) {
                firstName = firstName.padEnd(2, 'X'); // Pad with X if too short
              }
              
              // Ensure firstName doesn't exceed max length (50 chars)
              if (firstName.length > 50) {
                firstName = firstName.substring(0, 50);
              }
              
              // Ensure lastName doesn't exceed max length (50 chars)
              if (lastName.length > 50) {
                lastName = lastName.substring(0, 50);
              }
              
              employee = await Employee.create({
                firstName: firstName,
                lastName: lastName,
                biometricId: user.uid,
                employeeId: user.uid.toString(), // Use biometric ID as employee ID
                departmentId: null, // No default department - must be assigned manually
                createdBy: defaultUser.id,
                hireDate: new Date(),
                isActive: false, // Will be activated on first fingerprint scan
              });
              syncResults.created++;
              logger.info(`Created new employee: ${user.name} (User ID: ${user.uid}) - Inactive until first scan, no department assigned`);
            } else {
              syncResults.skipped++;
            }
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
      
      // Try to disconnect if connection was established
      if (zkInstance) {
        try {
          await zkInstance.disconnect();
        } catch (disconnectError) {
          logger.error('Failed to disconnect:', disconnectError);
        }
      }
      
      throw error;
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
