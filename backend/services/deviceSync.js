import { logger } from '../utils/logger.js';
import { zkService } from './zktecoService.js';
import { Device } from '../models/Device.js';
import cron from 'node-cron';

/**
 * Device Synchronization Service
 * Manages periodic synchronization with ZKTeco devices
 */
class DeviceSyncService {
  constructor() {
    this.isRunning = false;
    this.syncJobs = new Map();
    this.syncInterval = 5; // minutes
  }

  /**
   * Initialize device synchronization
   */
  async initialize() {
    try {
      logger.info('Initializing Device Sync Service...');
      
      // Start the main sync scheduler
      this.startMainScheduler();
      
      // Start individual device sync jobs
      await this.startDeviceSyncJobs();
      
      this.isRunning = true;
      logger.info('Device Sync Service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Device Sync Service:', error);
      throw error;
    }
  }

  /**
   * Start the main synchronization scheduler
   */
  startMainScheduler() {
    // Run every 5 minutes
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.performScheduledSync();
      } catch (error) {
        logger.error('Scheduled sync failed:', error);
      }
    }, {
      scheduled: false,
    });

    job.start();
    this.syncJobs.set('main', job);
    
    logger.info('Main sync scheduler started (every 5 minutes)');
  }

  /**
   * Start individual device sync jobs
   */
  async startDeviceSyncJobs() {
    try {
      const devices = await Device.getActiveDevices();
      
      for (const device of devices) {
        await this.startDeviceSyncJob(device);
      }
      
      logger.info(`Started sync jobs for ${devices.length} devices`);
      
    } catch (error) {
      logger.error('Failed to start device sync jobs:', error);
    }
  }

  /**
   * Start sync job for a specific device
   */
  async startDeviceSyncJob(device) {
    try {
      const jobName = `device_${device.id}`;
      
      // Stop existing job if any
      if (this.syncJobs.has(jobName)) {
        this.stopDeviceSyncJob(device.id);
      }
      
      // Create cron job based on device sync interval
      const cronExpression = this.getCronExpression(device.syncInterval);
      
      const job = cron.schedule(cronExpression, async () => {
        try {
          await this.syncDevice(device.id);
        } catch (error) {
          logger.error(`Device sync failed for ${device.name}:`, error);
        }
      }, {
        scheduled: false,
      });

      job.start();
      this.syncJobs.set(jobName, job);
      
      logger.info(`Started sync job for device: ${device.name} (${cronExpression})`);
      
    } catch (error) {
      logger.error(`Failed to start sync job for device ${device.id}:`, error);
    }
  }

  /**
   * Stop sync job for a specific device
   */
  stopDeviceSyncJob(deviceId) {
    const jobName = `device_${deviceId}`;
    const job = this.syncJobs.get(jobName);
    
    if (job) {
      job.stop();
      job.destroy();
      this.syncJobs.delete(jobName);
      logger.info(`Stopped sync job for device: ${deviceId}`);
    }
  }

  /**
   * Get cron expression for sync interval
   */
  getCronExpression(intervalMinutes) {
    if (intervalMinutes < 1) {
      return '* * * * *'; // Every minute
    } else if (intervalMinutes < 60) {
      return `*/${intervalMinutes} * * * *`; // Every N minutes
    } else {
      const hours = Math.floor(intervalMinutes / 60);
      return `0 */${hours} * * *`; // Every N hours
    }
  }

  /**
   * Perform scheduled synchronization
   */
  async performScheduledSync() {
    try {
      logger.info('Starting scheduled device synchronization...');
      
      const devices = await Device.getDevicesNeedingSync();
      
      if (devices.length === 0) {
        logger.debug('No devices need synchronization');
        return;
      }
      
      logger.info(`Syncing ${devices.length} devices...`);
      
      // Sync devices in parallel with concurrency limit
      const concurrencyLimit = 3;
      const chunks = this.chunkArray(devices, concurrencyLimit);
      
      for (const chunk of chunks) {
        await Promise.allSettled(
          chunk.map(device => this.syncDevice(device.id))
        );
      }
      
      logger.info('Scheduled synchronization completed');
      
    } catch (error) {
      logger.error('Scheduled synchronization failed:', error);
    }
  }

  /**
   * Sync a specific device
   */
  async syncDevice(deviceId) {
    try {
      const device = await Device.findByPk(deviceId);
      if (!device || !device.isActive) {
        logger.warn(`Device ${deviceId} not found or inactive`);
        return;
      }

      logger.debug(`Syncing device: ${device.name}`);
      
      // Update sync status to pending
      await device.update({
        lastSyncStatus: 'pending',
        lastSyncError: null,
      });

      // Perform actual sync using ZKTeco service
      await zkService.syncDeviceLogs(deviceId);
      
      logger.info(`Successfully synced device: ${device.name}`);
      
    } catch (error) {
      logger.error(`Failed to sync device ${deviceId}:`, error);
      
      // Update device with error status
      const device = await Device.findByPk(deviceId);
      if (device) {
        await device.update({
          lastSyncStatus: 'failed',
          lastSyncError: error.message,
        });
      }
    }
  }

  /**
   * Force sync all devices
   */
  async forceSyncAll() {
    try {
      logger.info('Starting force sync of all devices...');
      
      const devices = await Device.getActiveDevices();
      
      const results = await Promise.allSettled(
        devices.map(device => this.syncDevice(device.id))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      logger.info(`Force sync completed: ${successful} successful, ${failed} failed`);
      
      return {
        total: devices.length,
        successful,
        failed,
      };
      
    } catch (error) {
      logger.error('Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status for all devices
   */
  async getSyncStatus() {
    try {
      const devices = await Device.getActiveDevices();
      
      const status = devices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        ipAddress: device.ipAddress,
        lastSyncTime: device.lastSyncTime,
        lastSyncStatus: device.lastSyncStatus,
        lastSyncError: device.lastSyncError,
        syncInterval: device.syncInterval,
        canSync: device.canSync(),
        syncStatus: device.getSyncStatus(),
      }));
      
      return status;
      
    } catch (error) {
      logger.error('Failed to get sync status:', error);
      throw error;
    }
  }

  /**
   * Update device sync interval
   */
  async updateDeviceSyncInterval(deviceId, intervalMinutes) {
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      // Update device sync interval
      await device.update({ syncInterval: intervalMinutes });
      
      // Restart sync job with new interval
      await this.startDeviceSyncJob(device);
      
      logger.info(`Updated sync interval for device ${device.name} to ${intervalMinutes} minutes`);
      
    } catch (error) {
      logger.error(`Failed to update sync interval for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Utility function to chunk array
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Shutdown the sync service
   */
  shutdown() {
    logger.info('Shutting down Device Sync Service...');
    
    // Stop all cron jobs
    for (const [name, job] of this.syncJobs) {
      job.stop();
      job.destroy();
    }
    this.syncJobs.clear();
    
    this.isRunning = false;
    logger.info('Device Sync Service shutdown complete');
  }
}

// Export singleton instance
export const deviceSyncService = new DeviceSyncService();

/**
 * Initialize device synchronization
 */
export async function initializeDeviceSync() {
  await deviceSyncService.initialize();
}

export default deviceSyncService;
