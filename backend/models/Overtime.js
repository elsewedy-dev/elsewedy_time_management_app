import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Overtime = sequelize.define('Overtime', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id',
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  hours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    validate: {
      min: 0.1,
      max: 24,
    },
  },
  type: {
    type: DataTypes.ENUM('before_shift', 'after_shift', 'weekend', 'holiday'),
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  project: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  overtimeRate: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0,
  },
  overtimePay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvedNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'overtime',
  indexes: [
    {
      fields: ['employee_id'],
    },
    {
      fields: ['date'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['type'],
    },
    {
      fields: ['requested_by'],
    },
    {
      fields: ['approved_by'],
    },
  ],
  hooks: {
    beforeSave: async (overtime) => {
      // Calculate overtime pay if hours or rate changed
      if (overtime.changed('hours') || overtime.changed('overtimeRate')) {
        overtime.overtimePay = overtime.hours * overtime.overtimeRate;
      }
    },
  },
});

// Instance methods
Overtime.prototype.getDuration = function() {
  const start = new Date(this.startTime);
  const end = new Date(this.endTime);
  return Math.abs(end - start) / (1000 * 60 * 60); // hours
};

Overtime.prototype.isApproved = function() {
  return this.status === 'approved';
};

Overtime.prototype.isPending = function() {
  return this.status === 'pending';
};

Overtime.prototype.isRejected = function() {
  return this.status === 'rejected';
};

Overtime.prototype.canEdit = function() {
  return this.status === 'pending';
};

Overtime.prototype.canApprove = function() {
  return this.status === 'pending';
};

Overtime.prototype.canReject = function() {
  return this.status === 'pending';
};

// Class methods
Overtime.getEmployeeOvertime = async function(employeeId, startDate, endDate) {
  return await this.findAll({
    where: {
      employeeId,
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
    order: [['date', 'DESC']],
  });
};

Overtime.getPendingApprovals = async function() {
  return await this.findAll({
    where: { status: 'pending' },
    include: [
      {
        model: sequelize.models.Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId'],
      },
    ],
    order: [['createdAt', 'ASC']],
  });
};

Overtime.getApprovedOvertime = async function(employeeId, startDate, endDate) {
  return await this.findAll({
    where: {
      employeeId,
      status: 'approved',
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
    order: [['date', 'ASC']],
  });
};

Overtime.getOvertimeSummary = async function(employeeId, startDate, endDate) {
  const overtime = await this.findAll({
    where: {
      employeeId,
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
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

  return summary;
};

Overtime.getDepartmentOvertime = async function(departmentId, startDate, endDate) {
  return await this.findAll({
    include: [
      {
        model: sequelize.models.Employee,
        where: { departmentId },
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
      },
    ],
    where: {
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
    order: [['date', 'DESC']],
  });
};
