import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Payroll = sequelize.define('Payroll', {
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
  payPeriodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  payPeriodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  payDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  regularHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
  },
  overtimeHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
  },
  regularPay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  overtimePay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  grossPay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  deductions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  totalDeductions: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  netPay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('draft', 'calculated', 'approved', 'paid'),
    defaultValue: 'draft',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'payroll',
  indexes: [
    {
      fields: ['employee_id'],
    },
    {
      fields: ['pay_period_start'],
    },
    {
      fields: ['pay_period_end'],
    },
    {
      fields: ['pay_date'],
    },
    {
      fields: ['status'],
    },
    {
      unique: true,
      fields: ['employee_id', 'pay_period_start', 'pay_period_end'],
    },
  ],
  hooks: {
    beforeSave: (payroll) => {
      // Calculate gross pay
      payroll.grossPay = payroll.regularPay + payroll.overtimePay;
      
      // Calculate net pay
      payroll.netPay = payroll.grossPay - payroll.totalDeductions;
      
      // Ensure net pay is not negative
      if (payroll.netPay < 0) {
        payroll.netPay = 0;
      }
    },
  },
});

// Instance methods
Payroll.prototype.addDeduction = function(type, amount, description = '') {
  if (!this.deductions) {
    this.deductions = {};
  }
  
  this.deductions[type] = {
    amount: parseFloat(amount),
    description,
    date: new Date().toISOString(),
  };
  
  this.calculateTotalDeductions();
};

Payroll.prototype.removeDeduction = function(type) {
  if (this.deductions && this.deductions[type]) {
    delete this.deductions[type];
    this.calculateTotalDeductions();
  }
};

Payroll.prototype.calculateTotalDeductions = function() {
  if (!this.deductions) {
    this.totalDeductions = 0;
    return;
  }
  
  this.totalDeductions = Object.values(this.deductions)
    .reduce((sum, deduction) => sum + deduction.amount, 0);
};

Payroll.prototype.isDraft = function() {
  return this.status === 'draft';
};

Payroll.prototype.isCalculated = function() {
  return this.status === 'calculated';
};

Payroll.prototype.isApproved = function() {
  return this.status === 'approved';
};

Payroll.prototype.isPaid = function() {
  return this.status === 'paid';
};

Payroll.prototype.canEdit = function() {
  return ['draft', 'calculated'].includes(this.status);
};

Payroll.prototype.canApprove = function() {
  return this.status === 'calculated';
};

Payroll.prototype.canPay = function() {
  return this.status === 'approved';
};

// Class methods
Payroll.getEmployeePayroll = async function(employeeId, startDate, endDate) {
  return await this.findAll({
    where: {
      employeeId,
      payPeriodStart: {
        [sequelize.Sequelize.Op.gte]: startDate,
      },
      payPeriodEnd: {
        [sequelize.Sequelize.Op.lte]: endDate,
      },
    },
    order: [['payPeriodStart', 'DESC']],
  });
};

Payroll.getPayrollByPeriod = async function(payPeriodStart, payPeriodEnd) {
  return await this.findAll({
    where: {
      payPeriodStart,
      payPeriodEnd,
    },
    include: [
      {
        model: sequelize.models.Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
      },
    ],
    order: [['employee.firstName', 'ASC']],
  });
};

Payroll.getPayrollSummary = async function(payPeriodStart, payPeriodEnd) {
  const payrolls = await this.getPayrollByPeriod(payPeriodStart, payPeriodEnd);
  
  const summary = {
    totalEmployees: payrolls.length,
    totalRegularHours: payrolls.reduce((sum, payroll) => sum + payroll.regularHours, 0),
    totalOvertimeHours: payrolls.reduce((sum, payroll) => sum + payroll.overtimeHours, 0),
    totalRegularPay: payrolls.reduce((sum, payroll) => sum + payroll.regularPay, 0),
    totalOvertimePay: payrolls.reduce((sum, payroll) => sum + payroll.overtimePay, 0),
    totalGrossPay: payrolls.reduce((sum, payroll) => sum + payroll.grossPay, 0),
    totalDeductions: payrolls.reduce((sum, payroll) => sum + payroll.totalDeductions, 0),
    totalNetPay: payrolls.reduce((sum, payroll) => sum + payroll.netPay, 0),
    byStatus: {},
  };
  
  // Group by status
  payrolls.forEach(payroll => {
    if (!summary.byStatus[payroll.status]) {
      summary.byStatus[payroll.status] = {
        count: 0,
        totalNetPay: 0,
      };
    }
    summary.byStatus[payroll.status].count++;
    summary.byStatus[payroll.status].totalNetPay += payroll.netPay;
  });
  
  return summary;
};

Payroll.getPendingApprovals = async function() {
  return await this.findAll({
    where: { status: 'calculated' },
    include: [
      {
        model: sequelize.models.Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId'],
      },
    ],
    order: [['payPeriodStart', 'ASC']],
  });
};

Payroll.getReadyForPayment = async function() {
  return await this.findAll({
    where: { status: 'approved' },
    include: [
      {
        model: sequelize.models.Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId'],
      },
    ],
    order: [['payDate', 'ASC']],
  });
};
