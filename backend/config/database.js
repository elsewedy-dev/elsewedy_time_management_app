import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Ensure environment variables are loaded
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const dbConfig = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'elsewedy_attendance',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Initialize Sequelize
export const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
    pool: dbConfig.pool
  }
);

// Define associations
export async function defineAssociations() {
  // Import models dynamically to avoid circular dependencies
  const { User } = await import('../models/User.js');
  const { Employee } = await import('../models/Employee.js');
  const { Department } = await import('../models/Department.js');
  const { Device } = await import('../models/Device.js');
  const { Attendance } = await import('../models/Attendance.js');
  const { Overtime } = await import('../models/Overtime.js');
  const { LeaveRequest } = await import('../models/LeaveRequest.js');
  const { Shift } = await import('../models/Shift.js');
  const { Payroll } = await import('../models/Payroll.js');
  // User associations
  User.hasMany(Employee, { foreignKey: 'createdBy', as: 'createdEmployees' });
  
  // Employee associations
  Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
  Employee.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendanceRecords' });
  Employee.hasMany(Overtime, { foreignKey: 'employeeId', as: 'overtimeRecords' });
  Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId', as: 'leaveRequests' });
  Employee.belongsTo(Shift, { foreignKey: 'shiftId', as: 'shift' });
  Employee.hasMany(Payroll, { foreignKey: 'employeeId', as: 'payrollRecords' });
  
  // Department associations
  Department.hasMany(Employee, { foreignKey: 'departmentId', as: 'employees' });
  
  // Device associations
  Device.hasMany(Attendance, { foreignKey: 'deviceId', as: 'attendanceRecords' });
  
  // Attendance associations
  Attendance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  Attendance.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });
  
  // Overtime associations
  Overtime.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  
  // LeaveRequest associations
  LeaveRequest.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  LeaveRequest.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  
  // Shift associations
  Shift.hasMany(Employee, { foreignKey: 'shiftId', as: 'employees' });
  
  // Payroll associations
  Payroll.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
}

// Initialize database
export async function initializeDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Import models in dependency order
    const { User } = await import('../models/User.js');
    const { Department } = await import('../models/Department.js');
    const { Shift } = await import('../models/Shift.js');
    const { Employee } = await import('../models/Employee.js');
    const { Device } = await import('../models/Device.js');
    const { Attendance } = await import('../models/Attendance.js');
    const { Overtime } = await import('../models/Overtime.js');
    const { LeaveRequest } = await import('../models/LeaveRequest.js');
    const { Payroll } = await import('../models/Payroll.js');
    
    logger.info('Models loaded');

    // Sync database (create tables if they don't exist)
    // Use force: false to preserve data
    const isDevelopment = false; // Changed to false to preserve data
    logger.info(`Syncing database... (force: ${isDevelopment})`);
    
    // Disable foreign key checks temporarily
    await sequelize.query('SET CONSTRAINTS ALL DEFERRED;');
    
    // Sync all models at once - Sequelize will handle dependencies
    await sequelize.sync({ 
      force: isDevelopment, 
      alter: false,
      logging: console.log  // Enable logging to see what's happening
    });
    
    // Re-enable foreign key checks
    await sequelize.query('SET CONSTRAINTS ALL IMMEDIATE;');
    
    logger.info(`Database synchronized successfully ${isDevelopment ? '(tables recreated)' : ''}`);

    // Define associations AFTER tables are created
    await defineAssociations();
    logger.info('Associations defined');

    // Small delay to ensure tables are created
    await new Promise(resolve => setTimeout(resolve, 100));

    logger.info('Database initialization complete');

    // Create default admin user if not exists
    await createDefaultAdmin();

    // Create default departments if not exists
    await createDefaultDepartments();

    // Create default shifts if not exists
    await createDefaultShifts();

  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
}

// Create default admin user
async function createDefaultAdmin() {
  try {
    const { User } = await import('../models/User.js');
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminExists) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await User.create({
        username: 'admin',
        email: 'admin@elsewedy.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true
      });
      
      logger.info('Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    logger.error('Error creating default admin user:', error);
  }
}

// Create default departments
async function createDefaultDepartments() {
  try {
    const { Department } = await import('../models/Department.js');
    const departments = [
      { name: 'Production', description: 'Production Department' },
      { name: 'Quality Control', description: 'Quality Control Department' },
      { name: 'Maintenance', description: 'Maintenance Department' },
      { name: 'Human Resources', description: 'Human Resources Department' },
      { name: 'Finance', description: 'Finance Department' },
      { name: 'IT', description: 'Information Technology Department' }
    ];

    for (const dept of departments) {
      await Department.findOrCreate({
        where: { name: dept.name },
        defaults: dept
      });
    }
    
    logger.info('Default departments created');
  } catch (error) {
    logger.error('Error creating default departments:', error);
  }
}

// Create default shifts
async function createDefaultShifts() {
  try {
    const { Shift } = await import('../models/Shift.js');
    const shifts = [
      {
        name: 'Day Shift',
        startTime: '08:00',
        endTime: '16:00',
        breakDuration: 60, // minutes
        description: 'Regular day shift'
      },
      {
        name: 'Night Shift',
        startTime: '22:00',
        endTime: '06:00',
        breakDuration: 60,
        description: 'Night shift'
      },
      {
        name: 'Evening Shift',
        startTime: '16:00',
        endTime: '00:00',
        breakDuration: 60,
        description: 'Evening shift'
      }
    ];

    for (const shift of shifts) {
      await Shift.findOrCreate({
        where: { name: shift.name },
        defaults: shift
      });
    }
    
    logger.info('Default shifts created');
  } catch (error) {
    logger.error('Error creating default shifts:', error);
  }
}

// Close database connection
export async function closeDatabase() {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}
