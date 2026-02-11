import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { Device } from '../models/Device.js';
import { Op } from 'sequelize';
import { authMiddleware } from '../middleware/auth.js';
import { permissionMiddleware } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import moment from 'moment';

const router = express.Router();

// Get attendance records with filtering
router.get('/', [
  authMiddleware,
  permissionMiddleware('attendance.read'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('employeeId').optional().isUUID(),
  query('departmentId').optional().isUUID(),
  query('deviceId').optional().isUUID(),
  query('status').optional().isIn(['present', 'absent', 'late', 'early_leave', 'half_day']),
  query('verificationMethod').optional().isIn(['fingerprint', 'face', 'card', 'password', 'manual']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
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

    const {
      startDate,
      endDate,
      employeeId,
      departmentId,
      deviceId,
      status,
      verificationMethod,
      page = 1,
      limit = 50,
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }
    
    if (employeeId) whereClause.employeeId = employeeId;
    if (deviceId) whereClause.deviceId = deviceId;
    if (status) whereClause.status = status;
    if (verificationMethod) whereClause.verificationMethod = verificationMethod;

    // Build include clause
    const include = [
      {
        model: Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        ...(departmentId && { where: { departmentId } }),
      },
      {
        model: Device,
        attributes: ['id', 'name', 'type', 'location'],
      },
    ];

    const offset = (page - 1) * limit;

    const { count, rows } = await Attendance.findAndCountAll({
      where: whereClause,
      include,
      order: [['date', 'DESC'], ['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });

  } catch (error) {
    logger.error('Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get attendance summary for date range
router.get('/summary', [
  authMiddleware,
  permissionMiddleware('attendance.read'),
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('employeeId').optional().isUUID(),
  query('departmentId').optional().isUUID(),
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

    const { startDate, endDate, employeeId, departmentId } = req.query;

    let whereClause = {
      date: {
        [Op.between]: [startDate, endDate],
      },
    };

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    const include = [];
    if (departmentId) {
      include.push({
        model: Employee,
        where: { departmentId },
        attributes: ['id'],
      });
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include,
    });

    const summary = {
      totalRecords: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.isLate).length,
      earlyLeave: attendance.filter(a => a.isEarlyLeave).length,
      halfDay: attendance.filter(a => a.status === 'half_day').length,
      totalWorkingHours: attendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0),
      totalOvertimeHours: attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
      averageWorkingHours: 0,
      attendanceRate: 0,
    };

    if (summary.totalRecords > 0) {
      summary.averageWorkingHours = summary.totalWorkingHours / summary.totalRecords;
      summary.attendanceRate = (summary.present / summary.totalRecords) * 100;
    }

    res.json({
      success: true,
      data: summary,
    });

  } catch (error) {
    logger.error('Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get today's attendance (temporarily without auth for testing)
router.get('/today', async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    // Get all active employees count
    const totalActiveEmployees = await Employee.count({
      where: { isActive: true }
    });
    
    const attendance = await Attendance.findAll({
      where: { date: today },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        },
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'type', 'location'],
        },
      ],
      order: [['checkInTime', 'DESC']],
    });

    // Count employees who have checked in today (present)
    const presentToday = attendance.filter(a => a.checkInTime).length;
    
    const summary = {
      totalEmployees: totalActiveEmployees,
      present: presentToday,
      absent: totalActiveEmployees - presentToday,
      checkedIn: attendance.filter(a => a.checkInTime).length,
      checkedOut: attendance.filter(a => a.checkOutTime).length,
      late: attendance.filter(a => a.isLate).length,
      stillWorking: attendance.filter(a => a.checkInTime && !a.checkOutTime).length,
    };

    res.json({
      success: true,
      data: {
        attendance,
        summary,
      },
    });

  } catch (error) {
    logger.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get employee attendance history
router.get('/employee/:employeeId', [
  authMiddleware,
  permissionMiddleware('attendance.read'),
  param('employeeId').isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
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

    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const whereClause = { employeeId };
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: Device,
          attributes: ['id', 'name', 'type', 'location'],
        },
      ],
      order: [['date', 'DESC']],
    });

    // Get attendance summary
    const summary = await Attendance.getAttendanceSummary(
      employeeId,
      startDate || moment().subtract(30, 'days').format('YYYY-MM-DD'),
      endDate || moment().format('YYYY-MM-DD')
    );

    res.json({
      success: true,
      data: {
        attendance,
        summary,
      },
    });

  } catch (error) {
    logger.error('Error fetching employee attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Manual attendance entry
router.post('/manual', [
  authMiddleware,
  permissionMiddleware('attendance.update'),
  body('employeeId').isUUID(),
  body('date').isISO8601(),
  body('checkInTime').optional().isISO8601(),
  body('checkOutTime').optional().isISO8601(),
  body('status').isIn(['present', 'absent', 'late', 'early_leave', 'half_day']),
  body('verificationMethod').default('manual'),
  body('notes').optional().isString(),
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

    const {
      employeeId,
      date,
      checkInTime,
      checkOutTime,
      status,
      verificationMethod,
      notes,
    } = req.body;

    // Check if attendance record already exists
    const existingAttendance = await Attendance.findOne({
      where: { employeeId, date },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for this date',
      });
    }

    // Get default device for manual entries
    const device = await Device.findOne({
      where: { type: 'manual' },
    });

    const attendance = await Attendance.create({
      employeeId,
      deviceId: device?.id,
      date,
      checkInTime,
      checkOutTime,
      status,
      verificationMethod,
      notes,
      approvedBy: req.user.id,
      approvedAt: new Date(),
    });

    // Load with relationships
    const attendanceWithRelations = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId'],
        },
        {
          model: Device,
          attributes: ['id', 'name', 'type'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
      data: attendanceWithRelations,
    });

  } catch (error) {
    logger.error('Error creating manual attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update attendance record
router.put('/:id', [
  authMiddleware,
  permissionMiddleware('attendance.update'),
  param('id').isUUID(),
  body('checkInTime').optional().isISO8601(),
  body('checkOutTime').optional().isISO8601(),
  body('status').optional().isIn(['present', 'absent', 'late', 'early_leave', 'half_day']),
  body('notes').optional().isString(),
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

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    // Update the record
    await attendance.update({
      ...updates,
      approvedBy: req.user.id,
      approvedAt: new Date(),
    });

    // Load with relationships
    const updatedAttendance = await Attendance.findByPk(id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId'],
        },
        {
          model: Device,
          attributes: ['id', 'name', 'type'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: updatedAttendance,
    });

  } catch (error) {
    logger.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete attendance record
router.delete('/:id', [
  authMiddleware,
  permissionMiddleware('attendance.delete'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    await attendance.destroy();

    res.json({
      success: true,
      message: 'Attendance record deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Reset today's attendance (clear all records for today)
router.post('/reset-today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const deleted = await Attendance.destroy({
      where: {
        date: today
      }
    });
    
    logger.info(`Reset today's attendance: deleted ${deleted} records`);
    
    res.json({
      success: true,
      message: `Successfully reset today's attendance (${deleted} records cleared)`,
      data: { deletedCount: deleted }
    });
    
  } catch (error) {
    logger.error('Error resetting today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
