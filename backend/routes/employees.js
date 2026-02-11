import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Employee } from '../models/Employee.js';
import { Department } from '../models/Department.js';
import { Shift } from '../models/Shift.js';
import { authMiddleware } from '../middleware/auth.js';
import { permissionMiddleware } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get all employees with filtering and pagination (temporarily without auth for testing)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('departmentId').optional().isUUID(),
  query('shiftId').optional().isUUID(),
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

    const {
      page = 1,
      limit = 200,
      search,
      departmentId,
      shiftId,
      isActive,
    } = req.query;

    // Build where clause
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { employeeId: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (departmentId) whereClause.departmentId = departmentId;
    if (shiftId) whereClause.shiftId = shiftId;
    
    // Only filter by isActive if explicitly requested
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true' || isActive === true;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Employee.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Shift,
          as: 'shift',
          attributes: ['id', 'name', 'startTime', 'endTime'],
        },
      ],
      order: [['biometricId', 'ASC'], ['firstName', 'ASC'], ['lastName', 'ASC']],
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
    logger.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get employee by ID
router.get('/:id', [
  authMiddleware,
  permissionMiddleware('employees.read'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      include: [
        {
          model: Department,
          attributes: ['id', 'name', 'code', 'description'],
        },
        {
          model: Shift,
          attributes: ['id', 'name', 'startTime', 'endTime', 'workingDays'],
        },
      ],
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });

  } catch (error) {
    logger.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Clear IT department assignments
router.post('/clear-it-departments', async (req, res) => {
  try {
    // Find IT department
    const itDepartment = await Department.findOne({
      where: { name: 'IT' }
    });

    if (!itDepartment) {
      return res.json({
        success: true,
        message: 'IT department not found',
        data: {
          total: 0,
          updated: 0
        }
      });
    }

    // Find all employees assigned to IT department
    const itEmployees = await Employee.findAll({
      where: {
        departmentId: itDepartment.id
      }
    });

    logger.info(`Found ${itEmployees.length} employees assigned to IT department`);

    let updated = 0;
    let errors = [];

    for (const employee of itEmployees) {
      try {
        await employee.update({
          departmentId: null
        });

        logger.info(`Unassigned ${employee.firstName} ${employee.lastName} from IT department`);
        updated++;

      } catch (error) {
        errors.push({
          employee: `${employee.firstName} ${employee.lastName}`,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Cleared IT department assignments: ${updated} employees unassigned`,
      data: {
        total: itEmployees.length,
        updated,
        errors
      }
    });

  } catch (error) {
    logger.error('Error clearing IT departments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
    });
  }
});

// Fix employee IDs to use biometric ID
router.post('/fix-employee-ids', async (req, res) => {
  try {
    // Find all employees with biometric IDs
    const employees = await Employee.findAll({
      where: {
        biometricId: {
          [Op.ne]: null
        }
      }
    });

    logger.info(`Found ${employees.length} employees with biometric IDs`);

    let updated = 0;
    let skipped = 0;
    let errors = [];

    for (const employee of employees) {
      try {
        const oldEmployeeId = employee.employeeId;
        const newEmployeeId = employee.biometricId.toString();

        // Skip if already using biometric ID
        if (oldEmployeeId === newEmployeeId) {
          skipped++;
          continue;
        }

        // Check if the new employee ID already exists (conflict)
        const existingEmployee = await Employee.findOne({
          where: {
            employeeId: newEmployeeId,
            id: {
              [Op.ne]: employee.id
            }
          }
        });

        if (existingEmployee) {
          errors.push({
            employee: `${employee.firstName} ${employee.lastName}`,
            oldId: oldEmployeeId,
            newId: newEmployeeId,
            error: `Conflict: Employee ID ${newEmployeeId} already exists`
          });
          continue;
        }

        // Update employee ID to match biometric ID
        await employee.update({
          employeeId: newEmployeeId
        });

        logger.info(`Updated ${employee.firstName} ${employee.lastName}: ${oldEmployeeId} → ${newEmployeeId}`);
        updated++;

      } catch (error) {
        errors.push({
          employee: `${employee.firstName} ${employee.lastName}`,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Migration completed: ${updated} updated, ${skipped} skipped, ${errors.length} errors`,
      data: {
        total: employees.length,
        updated,
        skipped,
        errors
      }
    });

  } catch (error) {
    logger.error('Error fixing employee IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
    });
  }
});

// Fix employee surnames (remove "Employee" suffix)
router.post('/fix-surnames', async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: {
        lastName: 'Employee'
      }
    });
    
    logger.info(`Found ${employees.length} employees with lastName "Employee"`);
    
    const updated = [];
    for (const employee of employees) {
      await employee.update({ lastName: '' });
      updated.push({
        id: employee.id,
        name: `${employee.firstName}`,
        biometricId: employee.biometricId
      });
    }
    
    res.json({
      success: true,
      message: `Fixed ${updated.length} employees`,
      data: updated
    });
    
  } catch (error) {
    logger.error('Error fixing surnames:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Clear all employees and attendance (for testing)
router.post('/clear-all', async (req, res) => {
  try {
    const { Attendance } = await import('../models/Attendance.js');
    
    // Clear all attendance first (foreign key constraint)
    const deletedAttendance = await Attendance.destroy({
      where: {},
      truncate: true,
      cascade: true
    });
    
    // Clear all employees
    const deletedEmployees = await Employee.destroy({
      where: {},
      truncate: true,
      cascade: true
    });
    
    logger.info(`Cleared ${deletedEmployees} employees and ${deletedAttendance} attendance records`);
    
    res.json({
      success: true,
      message: `Database cleared: ${deletedEmployees} employees and ${deletedAttendance} attendance records deleted`,
      data: {
        deletedEmployees,
        deletedAttendance
      }
    });
    
  } catch (error) {
    logger.error('Error clearing database:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message,
    });
  }
});

// Create new employee
router.post('/', [
  authMiddleware,
  permissionMiddleware('employees.create'),
  body('firstName').notEmpty().isLength({ min: 2, max: 50 }),
  body('lastName').notEmpty().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail(),
  body('phone').optional().isLength({ min: 10, max: 15 }),
  body('dateOfBirth').optional().isISO8601(),
  body('hireDate').optional().isISO8601(),
  body('position').optional().isString(),
  body('salary').optional().isDecimal(),
  body('hourlyRate').optional().isDecimal(),
  body('departmentId').optional().isUUID(),
  body('shiftId').optional().isUUID(),
  body('address').optional().isString(),
  body('emergencyContact').optional().isObject(),
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

    // Check if department exists (if provided)
    if (req.body.departmentId) {
      const department = await Department.findByPk(req.body.departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department not found',
        });
      }
    }

    // Check if shift exists (if provided)
    if (req.body.shiftId) {
      const shift = await Shift.findByPk(req.body.shiftId);
      if (!shift) {
        return res.status(400).json({
          success: false,
          message: 'Shift not found',
        });
      }
    }

    // Check if employee ID already exists
    if (req.body.employeeId) {
      const existingEmployee = await Employee.findOne({
        where: { employeeId: req.body.employeeId },
      });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists',
        });
      }
    }

    const employee = await Employee.create({
      ...req.body,
      createdBy: req.user.id,
    });

    // Load with relationships
    const employeeWithRelations = await Employee.findByPk(employee.id, {
      include: [
        {
          model: Department,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Shift,
          attributes: ['id', 'name', 'startTime', 'endTime'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employeeWithRelations,
    });

  } catch (error) {
    logger.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update employee
router.put('/:id', [
  authMiddleware,
  permissionMiddleware('employees.update'),
  param('id').isUUID(),
  body('firstName').optional().isLength({ min: 2, max: 50 }),
  body('lastName').optional().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail(),
  body('phone').optional().isLength({ min: 10, max: 15 }),
  body('dateOfBirth').optional().isISO8601(),
  body('position').optional().isString(),
  body('salary').optional().isDecimal(),
  body('hourlyRate').optional().isDecimal(),
  body('departmentId').optional().isUUID(),
  body('shiftId').optional().isUUID(),
  body('isActive').optional().isBoolean(),
  body('address').optional().isString(),
  body('emergencyContact').optional().isObject(),
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

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Check if department exists (if provided)
    if (updates.departmentId) {
      const department = await Department.findByPk(updates.departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department not found',
        });
      }
    }

    // Check if shift exists (if provided)
    if (updates.shiftId) {
      const shift = await Shift.findByPk(updates.shiftId);
      if (!shift) {
        return res.status(400).json({
          success: false,
          message: 'Shift not found',
        });
      }
    }

    // Check if employee ID already exists (if provided)
    if (updates.employeeId && updates.employeeId !== employee.employeeId) {
      const existingEmployee = await Employee.findOne({
        where: { employeeId: updates.employeeId },
      });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists',
        });
      }
    }

    await employee.update(updates);

    // Load with relationships
    const updatedEmployee = await Employee.findByPk(id, {
      include: [
        {
          model: Department,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Shift,
          attributes: ['id', 'name', 'startTime', 'endTime'],
        },
      ],
    });

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee,
    });

  } catch (error) {
    logger.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete employee (soft delete)
router.delete('/:id', [
  authMiddleware,
  permissionMiddleware('employees.delete'),
  param('id').isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Soft delete by setting isActive to false
    await employee.update({ isActive: false });

    res.json({
      success: true,
      message: 'Employee deactivated successfully',
    });

  } catch (error) {
    logger.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get employee attendance summary
router.get('/:id/attendance', [
  authMiddleware,
  permissionMiddleware('attendance.read'),
  param('id').isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const summary = await employee.getAttendanceSummary(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate || new Date()
    );

    res.json({
      success: true,
      data: summary,
    });

  } catch (error) {
    logger.error('Error fetching employee attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get employee overtime summary
router.get('/:id/overtime', [
  authMiddleware,
  permissionMiddleware('overtime.read'),
  param('id').isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const overtimeHours = await employee.getTotalOvertimeHours(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate || new Date()
    );

    res.json({
      success: true,
      data: {
        totalOvertimeHours: overtimeHours,
        overtimeRate: employee.overtimeRate,
        estimatedOvertimePay: overtimeHours * (employee.overtimeRate || 0),
      },
    });

  } catch (error) {
    logger.error('Error fetching employee overtime summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Bulk import employees
router.post('/bulk-import', [
  authMiddleware,
  permissionMiddleware('employees.create'),
  body('employees').isArray({ min: 1 }),
  body('employees.*.firstName').notEmpty(),
  body('employees.*.lastName').notEmpty(),
  body('employees.*.departmentId').optional().isUUID(),
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

    const { employees } = req.body;
    const results = {
      successful: [],
      failed: [],
    };

    for (const empData of employees) {
      try {
        // Check if department exists (if provided)
        if (empData.departmentId) {
          const department = await Department.findByPk(empData.departmentId);
          if (!department) {
            results.failed.push({
              data: empData,
              error: 'Department not found',
            });
            continue;
          }
        }

        const employee = await Employee.create({
          ...empData,
          createdBy: req.user.id,
        });

        results.successful.push(employee);
      } catch (error) {
        results.failed.push({
          data: empData,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Import completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      data: results,
    });

  } catch (error) {
    logger.error('Error bulk importing employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
