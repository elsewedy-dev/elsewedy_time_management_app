import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: [2, 10],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#3B82F6',
    validate: {
      is: /^#[0-9A-F]{6}$/i,
    },
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
}, {
  tableName: 'departments',
  indexes: [
    {
      unique: true,
      fields: ['name'],
    },
    {
      unique: true,
      fields: ['code'],
    },
    {
      fields: ['manager_id'],
    },
    {
      fields: ['is_active'],
    },
  ],
  hooks: {
    beforeValidate: (department) => {
      // Generate department code if not provided
      if (!department.code && department.name) {
        department.code = department.name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 10);
      }
    },
  },
});

// Instance methods
Department.prototype.getEmployeeCount = async function() {
  const { Employee } = await import('./Employee.js');
  return await Employee.count({
    where: {
      departmentId: this.id,
      isActive: true,
    },
  });
};

Department.prototype.getActiveEmployees = async function() {
  const { Employee } = await import('./Employee.js');
  return await Employee.findAll({
    where: {
      departmentId: this.id,
      isActive: true,
    },
    order: [['firstName', 'ASC']],
  });
};

Department.prototype.getAttendanceStats = async function(startDate, endDate) {
  const { Employee } = await import('./Employee.js');
  const { Attendance } = await import('./Attendance.js');
  
  const employees = await this.getActiveEmployees();
  const employeeIds = employees.map(emp => emp.id);
  
  if (employeeIds.length === 0) {
    return {
      totalEmployees: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      attendanceRate: 0,
    };
  }
  
  const attendance = await Attendance.findAll({
    where: {
      employeeId: {
        [sequelize.Sequelize.Op.in]: employeeIds,
      },
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
  });
  
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.isLate).length;
  const totalRecords = attendance.length;
  
  return {
    totalEmployees: employees.length,
    presentCount,
    absentCount,
    lateCount,
    attendanceRate: totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0,
  };
};

Department.prototype.getBudgetUtilization = async function() {
  if (!this.budget || this.budget === 0) {
    return 0;
  }
  
  const employees = await this.getActiveEmployees();
  const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  
  return (totalSalary / this.budget) * 100;
};

// Class methods
Department.getActiveDepartments = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
};

Department.getDepartmentStats = async function() {
  const total = await this.count();
  const active = await this.count({ where: { isActive: true } });
  
  const departments = await this.getActiveDepartments();
  const stats = [];
  
  for (const dept of departments) {
    const employeeCount = await dept.getEmployeeCount();
    const budgetUtilization = await dept.getBudgetUtilization();
    
    stats.push({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      employeeCount,
      budget: dept.budget,
      budgetUtilization,
      color: dept.color,
    });
  }
  
  return {
    total,
    active,
    departments: stats,
  };
};

Department.findByNameOrCode = async function(identifier) {
  return await this.findOne({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { name: identifier },
        { code: identifier },
      ],
      isActive: true,
    },
  });
};
