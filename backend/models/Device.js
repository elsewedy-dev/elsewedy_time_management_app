import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  type: {
    type: DataTypes.ENUM('u270', 'xface_pro', 'fingerprint', 'face_recognition', 'card_reader'),
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIP: true,
    },
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4370,
    validate: {
      min: 1,
      max: 65535,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '0',
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastSyncTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastSyncStatus: {
    type: DataTypes.ENUM('success', 'failed', 'pending'),
    defaultValue: 'pending',
  },
  lastSyncError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  firmwareVersion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  supportedFeatures: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  syncInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 300, // 5 minutes in seconds
  },
  maxLogsPerSync: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
  },
  deviceSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  connectionTimeout: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5000, // 5 seconds in milliseconds
  },
}, {
  tableName: 'devices',
  indexes: [
    {
      unique: true,
      fields: ['serial_number'],
    },
    {
      fields: ['ip_address'],
    },
    {
      fields: ['type'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['last_sync_status'],
    },
  ],
  hooks: {
    beforeValidate: (device) => {
      // Set default supported features based on device type
      if (!device.supportedFeatures) {
        switch (device.type) {
          case 'u270':
            device.supportedFeatures = {
              fingerprint: true,
              face_recognition: false,
              card_reader: true,
              password: true,
            };
            break;
          case 'xface_pro':
            device.supportedFeatures = {
              fingerprint: true,
              face_recognition: true,
              card_reader: true,
              password: true,
            };
            break;
          default:
            device.supportedFeatures = {
              fingerprint: false,
              face_recognition: false,
              card_reader: true,
              password: true,
            };
        }
      }
    },
  },
});

// Instance methods
Device.prototype.isOnline = async function() {
  try {
    // This would implement actual device connectivity check
    // For now, we'll check if last sync was successful and recent
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastSyncStatus === 'success' && 
           this.lastSyncTime && 
           this.lastSyncTime > fiveMinutesAgo;
  } catch (error) {
    return false;
  }
};

Device.prototype.getSyncStatus = function() {
  if (!this.lastSyncTime) {
    return { status: 'never_synced', message: 'Device has never been synced' };
  }
  
  const now = new Date();
  const timeDiff = now - this.lastSyncTime;
  const minutesDiff = Math.floor(timeDiff / (1000 * 60));
  
  if (this.lastSyncStatus === 'success') {
    if (minutesDiff < 5) {
      return { status: 'online', message: 'Device is online and synced' };
    } else if (minutesDiff < 60) {
      return { status: 'recent', message: `Last sync ${minutesDiff} minutes ago` };
    } else {
      return { status: 'stale', message: `Last sync ${Math.floor(minutesDiff / 60)} hours ago` };
    }
  } else {
    return { status: 'error', message: this.lastSyncError || 'Sync failed' };
  }
};

Device.prototype.canSync = function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  const lastSync = this.lastSyncTime || new Date(0);
  const timeSinceLastSync = now - lastSync;
  const syncIntervalMs = this.syncInterval * 1000;
  
  return timeSinceLastSync >= syncIntervalMs;
};

Device.prototype.getDeviceInfo = function() {
  return {
    id: this.id,
    name: this.name,
    model: this.model,
    type: this.type,
    ipAddress: this.ipAddress,
    port: this.port,
    location: this.location,
    isActive: this.isActive,
    syncStatus: this.getSyncStatus(),
    supportedFeatures: this.supportedFeatures,
    firmwareVersion: this.firmwareVersion,
  };
};

// Class methods
Device.getActiveDevices = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
};

Device.getDevicesByType = async function(type) {
  return await this.findAll({
    where: { type, isActive: true },
    order: [['name', 'ASC']],
  });
};

Device.getDevicesNeedingSync = async function() {
  const devices = await this.findAll({
    where: { isActive: true },
  });
  
  return devices.filter(device => device.canSync());
};

Device.getOnlineDevices = async function() {
  const devices = await this.findAll({
    where: { isActive: true },
  });
  
  const onlineDevices = [];
  for (const device of devices) {
    if (await device.isOnline()) {
      onlineDevices.push(device);
    }
  }
  
  return onlineDevices;
};

Device.getDeviceStatistics = async function() {
  const total = await this.count();
  const active = await this.count({ where: { isActive: true } });
  const online = (await this.getOnlineDevices()).length;
  
  const byType = {};
  const types = ['u270', 'xface_pro', 'fingerprint', 'face_recognition', 'card_reader'];
  
  for (const type of types) {
    byType[type] = await this.count({ where: { type, isActive: true } });
  }
  
  return {
    total,
    active,
    online,
    offline: active - online,
    byType,
  };
};
