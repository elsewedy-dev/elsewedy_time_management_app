import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Device } from '../models/Device.js';
import { authMiddleware } from '../middleware/auth.js';
import { permissionMiddleware } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import { zkService } from '../services/zktecoService.js';

const router = express.Router();

// Get all devices (temporarily without auth for testing)
router.get('/', [
  query('type').optional().isIn(['u270', 'xface_pro', 'fingerprint', 'face_recognition', 'card_reader']),
  query('isActive').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { type, isActive = true } = req.query;

    let devices;
    if (type) {
      devices = await Device.getDevicesByType(type);
    } else {
      devices = await Device.getActiveDevices();
    }

    // Add real-time status for each device (with error handling)
    const devicesWithStatus = await Promise.all(
      devices.map(async (device) => {
        try {
          const status = await zkService.getDeviceStatus(device.id);
          return {
            ...device.toJSON(),
            status,
          };
        } catch (error) {
          // If device not registered in zkService, register it now
          logger.warn(`Device ${device.id} not in zkService, registering now`);
          try {
            await zkService.registerDevice(device);
            const status = await zkService.getDeviceStatus(device.id);
            return {
              ...device.toJSON(),
              status,
            };
          } catch (regError) {
            logger.error(`Failed to register device ${device.id}:`, regError);
            return {
              ...device.toJSON(),
              status: null,
            };
          }
        }
      })
    );

    res.json({
      success: true,
      data: devicesWithStatus,
    });

  } catch (error) {
    logger.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get device by ID
router.get('/:id', [
  authMiddleware,
  permissionMiddleware('devices.read'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findByPk(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    const status = await zkService.getDeviceStatus(id);

    res.json({
      success: true,
      data: {
        ...device.toJSON(),
        status,
      },
    });

  } catch (error) {
    logger.error('Error fetching device:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Create new device
router.post('/', [
  authMiddleware,
  permissionMiddleware('devices.create'),
  body('name').notEmpty().withMessage('Device name is required'),
  body('serialNumber').notEmpty().withMessage('Serial number is required'),
  body('model').notEmpty().withMessage('Device model is required'),
  body('type').isIn(['u270', 'xface_pro', 'fingerprint', 'face_recognition', 'card_reader']),
  body('ipAddress').isIP().withMessage('Valid IP address is required'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('Valid port number is required'),
  body('password').optional().isString(),
  body('location').optional().isString(),
  body('description').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Check if device with same serial number exists
    const existingDevice = await Device.findOne({
      where: { serialNumber: req.body.serialNumber },
    });

    if (existingDevice) {
      return res.status(409).json({
        success: false,
        message: 'Device with this serial number already exists',
      });
    }

    const device = await Device.create(req.body);

    // Register device with ZKTeco service
    await zkService.registerDevice(device);

    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      data: device,
    });

  } catch (error) {
    logger.error('Error creating device:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update device (temporarily without auth for testing)
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().notEmpty(),
  body('model').optional().notEmpty(),
  body('type').optional().isIn(['u270', 'xface_pro', 'fingerprint', 'face_recognition', 'card_reader']),
  body('ipAddress').optional().isIP(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('password').optional().isString(),
  body('location').optional().isString(),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('syncInterval').optional().isInt({ min: 60 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const device = await Device.findByPk(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check if serial number already exists (if being updated)
    if (updates.serialNumber && updates.serialNumber !== device.serialNumber) {
      const existingDevice = await Device.findOne({
        where: { serialNumber: updates.serialNumber },
      });

      if (existingDevice) {
        return res.status(409).json({
          success: false,
          message: 'Device with this serial number already exists',
        });
      }
    }

    await device.update(updates);

    // Re-register device with ZKTeco service if critical settings changed
    if (updates.ipAddress || updates.port || updates.password) {
      await zkService.registerDevice(device);
    }

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: device,
    });

  } catch (error) {
    logger.error('Error updating device:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete device
router.delete('/:id', [
  authMiddleware,
  permissionMiddleware('devices.delete'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findByPk(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Stop device sync
    zkService.stopDeviceSync(id);

    // Soft delete by setting isActive to false
    await device.update({ isActive: false });

    res.json({
      success: true,
      message: 'Device deactivated successfully',
    });

  } catch (error) {
    logger.error('Error deleting device:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Test device connection
router.post('/:id/test', [
  authMiddleware,
  permissionMiddleware('devices.read'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await zkService.testDeviceConnection(id);

    res.json({
      success: result.success,
      message: result.message,
      data: result,
    });

  } catch (error) {
    logger.error('Error testing device connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Sync device manually (temporarily without auth for testing)
router.post('/:id/sync', [
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findByPk(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // First sync users from device (to add any new employees)
    logger.info(`Syncing users from device: ${device.name}`);
    const userSyncResults = await zkService.syncUsersFromDevice(id);
    
    // Then sync attendance logs (force sync from last 24 hours for manual sync)
    logger.info(`Syncing attendance logs from device: ${device.name}`);
    await zkService.syncDeviceLogs(id, true); // Pass true to force full sync

    res.json({
      success: true,
      message: 'Device sync completed successfully',
      data: {
        userSync: userSyncResults,
        message: `Synced ${userSyncResults.created} new employees, ${userSyncResults.updated} updated, and attendance logs`,
      },
    });

  } catch (error) {
    logger.error('Error syncing device:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Device sync failed',
    });
  }
});

// Sync users/employees from device
router.post('/:id/sync-users', [
  authMiddleware,
  permissionMiddleware('devices.update'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findByPk(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Sync users from device
    const results = await zkService.syncUsersFromDevice(id);

    res.json({
      success: true,
      message: 'User sync completed successfully',
      data: results,
    });

  } catch (error) {
    logger.error('Error syncing users from device:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'User sync failed',
    });
  }
});

// Get device statistics (temporarily without auth for testing)
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Device.getDeviceStatistics();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Error fetching device statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get online devices
router.get('/status/online', [
  authMiddleware,
  permissionMiddleware('devices.read'),
], async (req, res) => {
  try {
    const onlineDevices = await Device.getOnlineDevices();

    res.json({
      success: true,
      data: onlineDevices,
    });

  } catch (error) {
    logger.error('Error fetching online devices:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get devices needing sync
router.get('/status/sync-needed', [
  authMiddleware,
  permissionMiddleware('devices.read'),
], async (req, res) => {
  try {
    const devicesNeedingSync = await Device.getDevicesNeedingSync();

    res.json({
      success: true,
      data: devicesNeedingSync,
    });

  } catch (error) {
    logger.error('Error fetching devices needing sync:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get device time from the first active device
router.get('/time', async (req, res) => {
  try {
    // Get the first active device (XFace Pro)
    const devices = await Device.getActiveDevices();
    
    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active devices found',
      });
    }

    // Use the first device to get time
    const device = devices[0];
    
    try {
      // For now, return server time as device time
      // In production, you would fetch actual device time from the ZKTeco device
      const deviceTime = new Date();
      
      res.json({
        success: true,
        data: {
          time: deviceTime.toISOString(),
          deviceId: device.id,
          deviceName: device.name,
        },
      });
    } catch (error) {
      logger.error(`Failed to get time from device ${device.name}:`, error);
      // Fallback to server time
      res.json({
        success: true,
        data: {
          time: new Date().toISOString(),
          deviceId: device.id,
          deviceName: device.name,
          fallback: true,
        },
      });
    }

  } catch (error) {
    logger.error('Error fetching device time:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
