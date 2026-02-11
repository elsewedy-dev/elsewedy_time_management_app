import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Overtime } from '../models/Overtime.js';
import { Employee } from '../models/Employee.js';
import { authMiddleware } from '../middleware/auth.js';
import { permissionMiddleware } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';
import moment from 'moment';

const router = express.Router();

// Get overtime records with filtering
router.get('/', [
  authMiddleware,
  permissionMiddleware('overtime.read'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('employeeId').optional().isUUID(),
  query('departmentId').optional().isUUID(),
  query('status').optional().isIn(['pending', 'approved', 'rejected']),
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
      status,
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
    if (status) whereClause.status = status;

    // Build include clause
    const include = [
      {
        model: Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId', 'hourlyRate', 'overtimeRate'],
        ...(departmentId && { where: { departmentId } }),
      },
    ];

    const offset = (page - 1) * limit;

    const { count, rows } = await Overtime.findAndCountAll({
      where: whereClause,
      include,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
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
    logger.error('Error fetching overtime records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get overtime record by ID
router.get('/:id', [
  authMiddleware,
  permissionMiddleware('overtime.read'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const overtime = await Overtime.findByPk(id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        },
      ],
    });

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found',
      });
    }

    res.json({
      success: true,
      data: overtime,
    });

  } catch (error) {
    logger.error('Error fetching overtime record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Create overtime record
router.post('/', [
  authMiddleware,
  permissionMiddleware('overtime.create'),
  body('employeeId').isUUID(),
  body('date').isISO8601(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('hours').isFloat({ min: 0.1, max: 24 }),
  body('type').isIn(['before_shift', 'after_shift', 'weekend', 'holiday']),
  body('reason').optional().isString(),
  body('project').optional().isString(),
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
      startTime,
      endTime,
      hours,
      type,
      reason,
      project,
    } = req.body;

    // Check if employee exists
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Check if overtime record already exists for this date and time
    const existingOvertime = await Overtime.findOne({
      where: {
        employeeId,
        date,
        startTime: {
          [Op.between]: [startTime, endTime],
        },
      },
    });

    if (existingOvertime) {
      return res.status(409).json({
        success: false,
        message: 'Overtime record already exists for this time period',
      });
    }

    // Calculate overtime pay
    const overtimeRate = employee.overtimeRate || employee.hourlyRate * 1.5;
    const overtimePay = hours * overtimeRate;

    const overtime = await Overtime.create({
      employeeId,
      date,
      startTime,
      endTime,
      hours,
      type,
      reason,
      project,
      status: 'pending',
      overtimeRate,
      overtimePay,
      requestedBy: req.user.id,
    });

    // Load with relationships
    const overtimeWithRelations = await Overtime.findByPk(overtime.id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Overtime record created successfully',
      data: overtimeWithRelations,
    });

  } catch (error) {
    logger.error('Error creating overtime record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update overtime record
router.put('/:id', [
  authMiddleware,
  permissionMiddleware('overtime.update'),
  param('id').isUUID(),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('hours').optional().isFloat({ min: 0.1, max: 24 }),
  body('type').optional().isIn(['before_shift', 'after_shift', 'weekend', 'holiday']),
  body('reason').optional().isString(),
  body('project').optional().isString(),
  body('status').optional().isIn(['pending', 'approved', 'rejected']),
  body('approvedNotes').optional().isString(),
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

    const overtime = await Overtime.findByPk(id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'hourlyRate', 'overtimeRate'],
        },
      ],
    });

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found',
      });
    }

    // If hours are being updated, recalculate overtime pay
    if (updates.hours) {
      const employee = overtime.employee;
      const overtimeRate = employee.overtimeRate || employee.hourlyRate * 1.5;
      updates.overtimePay = updates.hours * overtimeRate;
    }

    // If status is being changed to approved/rejected, set approval info
    if (updates.status && ['approved', 'rejected'].includes(updates.status)) {
      updates.approvedBy = req.user.id;
      updates.approvedAt = new Date();
    }

    await overtime.update(updates);

    // Load with relationships
    const updatedOvertime = await Overtime.findByPk(id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Overtime record updated successfully',
      data: updatedOvertime,
    });

  } catch (error) {
    logger.error('Error updating overtime record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete overtime record
router.delete('/:id', [
  authMiddleware,
  permissionMiddleware('overtime.delete'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const overtime = await Overtime.findByPk(id);
    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found',
      });
    }

    await overtime.destroy();

    res.json({
      success: true,
      message: 'Overtime record deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting overtime record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Approve overtime record
router.post('/:id/approve', [
  authMiddleware,
  permissionMiddleware('overtime.approve'),
  param('id').isUUID(),
  body('approvedNotes').optional().isString(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedNotes } = req.body;

    const overtime = await Overtime.findByPk(id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId'],
        },
      ],
    });

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found',
      });
    }

    if (overtime.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Overtime record is not pending approval',
      });
    }

    await overtime.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      approvedNotes,
    });

    res.json({
      success: true,
      message: 'Overtime record approved successfully',
      data: overtime,
    });

  } catch (error) {
    logger.error('Error approving overtime record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Reject overtime record
router.post('/:id/reject', [
  authMiddleware,
  permissionMiddleware('overtime.approve'),
  param('id').isUUID(),
  body('approvedNotes').notEmpty().withMessage('Rejection reason is required'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedNotes } = req.body;

    const overtime = await Overtime.findByPk(id, {
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId'],
        },
      ],
    });

    if (!overtime) {
      return res.status(404).json({
        success: false,
        message: 'Overtime record not found',
      });
    }

    if (overtime.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Overtime record is not pending approval',
      });
    }

    await overtime.update({
      status: 'rejected',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      approvedNotes,
    });

    res.json({
      success: true,
      message: 'Overtime record rejected successfully',
      data: overtime,
    });

  } catch (error) {
    logger.error('Error rejecting overtime record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get overtime summary for employee
router.get('/employee/:employeeId/summary', [
  authMiddleware,
  permissionMiddleware('overtime.read'),
  param('employeeId').isUUID(),
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
], async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const overtime = await Overtime.findAll({
      where: {
        employeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['date', 'DESC']],
    });

    const summary = {
      totalHours: overtime.reduce((sum, record) => sum + record.hours, 0),
      approvedHours: overtime
        .filter(record => record.status === 'approved')
        .reduce((sum, record) => sum + record.hours, 0),
      pendingHours: overtime
        .filter(record => record.status === 'pending')
        .reduce((sum, record) => sum + record.hours, 0),
      rejectedHours: overtime
        .filter(record => record.status === 'rejected')
        .reduce((sum, record) => sum + record.hours, 0),
      totalPay: overtime
        .filter(record => record.status === 'approved')
        .reduce((sum, record) => sum + record.overtimePay, 0),
      records: overtime,
    };

    res.json({
      success: true,
      data: {
        employee,
        period: {
          start: startDate,
          end: endDate,
        },
        summary,
      },
    });

  } catch (error) {
    logger.error('Error fetching overtime summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get pending overtime approvals
router.get('/pending/approvals', [
  authMiddleware,
  permissionMiddleware('overtime.approve'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Overtime.findAndCountAll({
      where: { status: 'pending' },
      include: [
        {
          model: Employee,
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        },
      ],
      order: [['createdAt', 'ASC']],
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
    logger.error('Error fetching pending overtime approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
