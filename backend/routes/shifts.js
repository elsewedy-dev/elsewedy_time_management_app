import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { Shift } from '../models/Shift.js';
import { Employee } from '../models/Employee.js';
import { Department } from '../models/Department.js';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';

const router = express.Router();

// ── GET all shifts ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      order: [['startTime', 'ASC']],
    });

    // Attach employee count to each shift
    const shiftsWithCount = await Promise.all(
      shifts.map(async (shift) => {
        const employeeCount = await Employee.count({
          where: { shiftId: shift.id, isActive: true },
        });
        return { ...shift.toJSON(), employeeCount };
      })
    );

    res.json({ success: true, data: shiftsWithCount });
  } catch (error) {
    logger.error('Error fetching shifts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── GET single shift with assigned employees ──────────────────────────────────
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    const employees = await Employee.findAll({
      where: { shiftId: shift.id, isActive: true },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      order: [['firstName', 'ASC']],
      attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
    });

    res.json({ success: true, data: { ...shift.toJSON(), employees } });
  } catch (error) {
    logger.error('Error fetching shift:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── CREATE shift ──────────────────────────────────────────────────────────────
router.post('/', [
  body('name').notEmpty().withMessage('Shift name is required'),
  body('startTime').notEmpty().withMessage('Start time is required')
    .matches(/^\d{2}:\d{2}$/).withMessage('Start time must be HH:MM'),
  body('endTime').notEmpty().withMessage('End time is required')
    .matches(/^\d{2}:\d{2}$/).withMessage('End time must be HH:MM'),
  body('breakDuration').optional().isInt({ min: 0, max: 480 }),
  body('workingDays').optional().isArray(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('description').optional().isString(),
  body('lateThreshold').optional().isInt({ min: 0 }),
  body('overtimeThreshold').optional().isInt({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const existing = await Shift.findOne({ where: { name: req.body.name } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A shift with this name already exists' });
    }

    const shift = await Shift.create(req.body);
    res.status(201).json({ success: true, message: 'Shift created successfully', data: shift });
  } catch (error) {
    logger.error('Error creating shift:', error);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
});

// ── UPDATE shift ──────────────────────────────────────────────────────────────
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().notEmpty(),
  body('startTime').optional().matches(/^\d{2}:\d{2}$/),
  body('endTime').optional().matches(/^\d{2}:\d{2}$/),
  body('breakDuration').optional().isInt({ min: 0, max: 480 }),
  body('workingDays').optional().isArray(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('lateThreshold').optional().isInt({ min: 0 }),
  body('overtimeThreshold').optional().isInt({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    // Check name uniqueness if name is being changed
    if (req.body.name && req.body.name !== shift.name) {
      const existing = await Shift.findOne({ where: { name: req.body.name } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'A shift with this name already exists' });
      }
    }

    await shift.update(req.body);
    res.json({ success: true, message: 'Shift updated successfully', data: shift });
  } catch (error) {
    logger.error('Error updating shift:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── DELETE shift ──────────────────────────────────────────────────────────────
router.delete('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    // Unassign all employees from this shift before deleting
    await Employee.update({ shiftId: null }, { where: { shiftId: shift.id } });
    await shift.destroy();

    res.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error) {
    logger.error('Error deleting shift:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── GET employees assigned to a shift ────────────────────────────────────────
router.get('/:id/employees', [param('id').isUUID()], async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    const employees = await Employee.findAll({
      where: { shiftId: shift.id, isActive: true },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      order: [['firstName', 'ASC']],
    });

    res.json({ success: true, data: employees });
  } catch (error) {
    logger.error('Error fetching shift employees:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── ASSIGN employees to a shift ───────────────────────────────────────────────
router.post('/:id/assign', [
  param('id').isUUID(),
  body('employeeIds').isArray({ min: 1 }).withMessage('employeeIds must be a non-empty array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });

    const { employeeIds } = req.body;

    const [updated] = await Employee.update(
      { shiftId: shift.id },
      { where: { id: { [Op.in]: employeeIds } } }
    );

    res.json({
      success: true,
      message: `${updated} employee(s) assigned to ${shift.name}`,
      data: { assigned: updated },
    });
  } catch (error) {
    logger.error('Error assigning employees to shift:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── REMOVE employees from a shift ────────────────────────────────────────────
router.post('/:id/unassign', [
  param('id').isUUID(),
  body('employeeIds').isArray({ min: 1 }).withMessage('employeeIds must be a non-empty array'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { employeeIds } = req.body;
    const [updated] = await Employee.update(
      { shiftId: null },
      { where: { id: { [Op.in]: employeeIds }, shiftId: req.params.id } }
    );

    res.json({
      success: true,
      message: `${updated} employee(s) removed from shift`,
      data: { removed: updated },
    });
  } catch (error) {
    logger.error('Error unassigning employees from shift:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
