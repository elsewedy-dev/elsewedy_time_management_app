import express from 'express';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { Device } from '../models/Device.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Webhook endpoint for ZKTeco device to push attendance data
 * The device will send data to this endpoint in real-time
 */
router.post('/attendance/push', async (req, res) => {
  try {
    logger.info('Received attendance push from ZKTeco device');
    logger.info('Request body:', JSON.stringify(req.body, null, 2));
    
    // ZKTeco devices send data in different formats
    // We need to parse the incoming data
    const attendanceData = req.body;
    
    // Common fields from ZKTeco push:
    // - SN: Device serial number
    // - UserID: Employee biometric ID
    // - Time: Attendance timestamp
    // - Type: Verification type (fingerprint, face, etc.)
    
    const {
      SN,           // Serial number
      UserID,       // User/Employee ID
      Time,         // Timestamp
      Type,         // Verification type
      DeviceID,     // Device ID
      VerifyMode,   // Verification mode
    } = attendanceData;
    
    // Find device by serial number or IP
    const deviceIP = req.ip.replace('::ffff:', ''); // Clean IPv6 prefix
    const device = await Device.findOne({
      where: {
        serialNumber: SN || DeviceID
      }
    }) || await Device.findOne({
      where: {
        ipAddress: deviceIP
      }
    });
    
    if (!device) {
      logger.warn(`Device not found for SN: ${SN}, IP: ${deviceIP}`);
      return res.status(404).json({
        success: false,
        message: 'Device not registered'
      });
    }
    
    // Find employee by biometric ID
    const employee = await Employee.findOne({
      where: { biometricId: UserID }
    });
    
    if (!employee) {
      logger.warn(`Employee not found for biometric ID: ${UserID}`);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Parse timestamp
    const timestamp = new Date(Time);
    const dateOnly = timestamp.toISOString().split('T')[0];
    
    // Find or create attendance record
    let attendance = await Attendance.findOne({
      where: {
        employeeId: employee.id,
        date: dateOnly
      }
    });
    
    if (!attendance) {
      // Create new attendance record
      attendance = await Attendance.create({
        employeeId: employee.id,
        deviceId: device.id,
        date: dateOnly,
        checkInTime: timestamp,
        status: 'present',
        verificationMethod: getVerificationMethod(Type || VerifyMode),
        deviceLogId: UserID.toString(),
        rawLogData: attendanceData
      });
      
      logger.info(`Created new attendance for ${employee.firstName} ${employee.lastName}`);
    } else {
      // Update existing record
      if (!attendance.checkInTime) {
        attendance.checkInTime = timestamp;
        attendance.status = 'present';
      } else if (!attendance.checkOutTime) {
        attendance.checkOutTime = timestamp;
      }
      
      await attendance.save();
      logger.info(`Updated attendance for ${employee.firstName} ${employee.lastName}`);
    }
    
    // Send success response
    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        timestamp: timestamp,
        type: attendance.checkOutTime ? 'check-out' : 'check-in'
      }
    });
    
  } catch (error) {
    logger.error('Error processing attendance push:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Alternative endpoint for different ZKTeco push formats
 */
router.post('/iclock/cdata', async (req, res) => {
  try {
    logger.info('Received iClock format data from ZKTeco device');
    logger.info('Request body:', req.body);
    
    // iClock protocol format
    // Parse the data and process similar to above
    
    res.send('OK'); // iClock protocol expects simple OK response
    
  } catch (error) {
    logger.error('Error processing iClock data:', error);
    res.status(500).send('ERROR');
  }
});

/**
 * Health check endpoint for device
 */
router.get('/iclock/getrequest', (req, res) => {
  logger.info('Device health check received');
  res.send('OK');
});

/**
 * Map verification type to our format
 */
function getVerificationMethod(type) {
  const typeMap = {
    '0': 'password',
    '1': 'fingerprint',
    '2': 'card',
    '3': 'password',
    '4': 'fingerprint',
    '15': 'face',
    'FP': 'fingerprint',
    'Face': 'face',
    'Card': 'card',
    'Password': 'password'
  };
  return typeMap[type] || 'fingerprint';
}

export default router;
