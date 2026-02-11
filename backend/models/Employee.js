import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50],
    },
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
    validate: {
      len: [0, 50],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 15],
    },
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  hireDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    defaultValue: 0,
  },
  overtimeRate: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    defaultValue: 0,
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true, // Changed to allow null - no default department
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  shiftId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'shifts',
      key: 'id',
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  biometricId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
  },
  faceTemplate: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fingerprintTemplate: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  emergencyContact: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'employees',
  indexes: [
    {
      unique: true,
      fields: ['employee_id'],
    },
    {
      fields: ['department_id'],
    },
    {
      fields: ['shift_id'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['hire_date'],
    },
  ],
  hooks: {
    beforeValidate: (employee) => {
      // Use biometric ID as employee ID if not provided
      if (!employee.employeeId && employee.biometricId) {
        employee.employeeId = employee.biometricId.toString();
      } else if (!employee.employeeId) {
        // Fallback: generate employee ID only if no biometric ID
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 4).toUpperCase();
        employee.employeeId = `EMP${timestamp}${random}`;
      }
    },
    beforeCreate: (employee) => {
      // Set default overtime rate if not provided
      if (!employee.overtimeRate && employee.hourlyRate) {
        employee.overtimeRate = employee.hourlyRate * 1.5; // 1.5x for overtime
      }
    },
  },
});

// Instance methods
Employee.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

Employee.prototype.getTotalWorkingDays = async function(startDate, endDate) {
  const attendance = await this.getAttendanceRecords({
    where: {
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
      status: 'present',
    },
  });
  return attendance.length;
};

Employee.prototype.getTotalOvertimeHours = async function(startDate, endDate) {
  const overtime = await this.getOvertimeRecords({
    where: {
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
      status: 'approved',
    },
  });
  
  return overtime.reduce((total, record) => total + record.hours, 0);
};

Employee.prototype.getAttendanceSummary = async function(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const attendance = await this.getAttendanceRecords({
    where: {
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
  });
  
  const present = attendance.filter(a => a.status === 'present').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const late = attendance.filter(a => a.isLate).length;
  
  return {
    present,
    absent,
    late,
    totalDays: attendance.length,
    attendanceRate: attendance.length > 0 ? (present / attendance.length) * 100 : 0,
  };
};
