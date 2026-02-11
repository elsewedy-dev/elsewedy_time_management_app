import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const LeaveRequest = sequelize.define('LeaveRequest', {
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
  leaveType: {
    type: DataTypes.ENUM('sick_leave', 'paid_time_off', 'unpaid_leave', 'personal_leave', 'emergency_leave'),
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  totalDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending',
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
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  attachment: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'leave_requests',
  indexes: [
    {
      fields: ['employee_id'],
    },
    {
      fields: ['start_date'],
    },
    {
      fields: ['end_date'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['leave_type'],
    },
    {
      fields: ['requested_by'],
    },
    {
      fields: ['approved_by'],
    },
  ],
  hooks: {
    beforeValidate: (leaveRequest) => {
      // Calculate total days if start and end dates are provided
      if (leaveRequest.startDate && leaveRequest.endDate) {
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        const timeDiff = end.getTime() - start.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
        leaveRequest.totalDays = daysDiff;
      }

      // Set isPaid based on leave type
      if (leaveRequest.leaveType === 'paid_time_off' || leaveRequest.leaveType === 'sick_leave') {
        leaveRequest.isPaid = true;
      }
    },
  },
});

// Instance methods
LeaveRequest.prototype.isApproved = function() {
  return this.status === 'approved';
};

LeaveRequest.prototype.isPending = function() {
  return this.status === 'pending';
};

LeaveRequest.prototype.isRejected = function() {
  return this.status === 'rejected';
};

LeaveRequest.prototype.isCancelled = function() {
  return this.status === 'cancelled';
};

LeaveRequest.prototype.canEdit = function() {
  return this.status === 'pending';
};

LeaveRequest.prototype.canApprove = function() {
  return this.status === 'pending';
};

LeaveRequest.prototype.canReject = function() {
  return this.status === 'pending';
};

LeaveRequest.prototype.canCancel = function() {
  return ['pending', 'approved'].includes(this.status);
};

LeaveRequest.prototype.getDuration = function() {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // days
};

LeaveRequest.prototype.isOverlapping = async function() {
  const overlapping = await LeaveRequest.findOne({
    where: {
      employeeId: this.employeeId,
      id: {
        [sequelize.Sequelize.Op.ne]: this.id,
      },
      status: {
        [sequelize.Sequelize.Op.in]: ['pending', 'approved'],
      },
      [sequelize.Sequelize.Op.or]: [
        {
          startDate: {
            [sequelize.Sequelize.Op.between]: [this.startDate, this.endDate],
          },
        },
        {
          endDate: {
            [sequelize.Sequelize.Op.between]: [this.startDate, this.endDate],
          },
        },
        {
          [sequelize.Sequelize.Op.and]: [
            { startDate: { [sequelize.Sequelize.Op.lte]: this.startDate } },
            { endDate: { [sequelize.Sequelize.Op.gte]: this.endDate } },
          ],
        },
      ],
    },
  });

  return !!overlapping;
};

// Class methods
LeaveRequest.getEmployeeLeaveRequests = async function(employeeId, startDate, endDate) {
  return await this.findAll({
    where: {
      employeeId,
      [sequelize.Sequelize.Op.or]: [
        {
          startDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
        {
          endDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
      ],
    },
    order: [['startDate', 'DESC']],
  });
};

LeaveRequest.getPendingApprovals = async function() {
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

LeaveRequest.getApprovedLeaveRequests = async function(employeeId, startDate, endDate) {
  return await this.findAll({
    where: {
      employeeId,
      status: 'approved',
      [sequelize.Sequelize.Op.or]: [
        {
          startDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
        {
          endDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
      ],
    },
    order: [['startDate', 'ASC']],
  });
};

LeaveRequest.getLeaveSummary = async function(employeeId, year) {
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31); // December 31st

  const leaveRequests = await this.findAll({
    where: {
      employeeId,
      [sequelize.Sequelize.Op.or]: [
        {
          startDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
        {
          endDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
      ],
    },
  });

  const summary = {
    totalDays: leaveRequests
      .filter(request => request.status === 'approved')
      .reduce((sum, request) => sum + request.totalDays, 0),
    paidDays: leaveRequests
      .filter(request => request.status === 'approved' && request.isPaid)
      .reduce((sum, request) => sum + request.totalDays, 0),
    unpaidDays: leaveRequests
      .filter(request => request.status === 'approved' && !request.isPaid)
      .reduce((sum, request) => sum + request.totalDays, 0),
    pendingDays: leaveRequests
      .filter(request => request.status === 'pending')
      .reduce((sum, request) => sum + request.totalDays, 0),
    byType: {},
    records: leaveRequests,
  };

  // Group by leave type
  leaveRequests.forEach(request => {
    if (!summary.byType[request.leaveType]) {
      summary.byType[request.leaveType] = {
        totalDays: 0,
        approvedDays: 0,
        pendingDays: 0,
      };
    }
    
    summary.byType[request.leaveType].totalDays += request.totalDays;
    
    if (request.status === 'approved') {
      summary.byType[request.leaveType].approvedDays += request.totalDays;
    } else if (request.status === 'pending') {
      summary.byType[request.leaveType].pendingDays += request.totalDays;
    }
  });

  return summary;
};

LeaveRequest.getDepartmentLeaveRequests = async function(departmentId, startDate, endDate) {
  return await this.findAll({
    include: [
      {
        model: sequelize.models.Employee,
        where: { departmentId },
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
      },
    ],
    where: {
      [sequelize.Sequelize.Op.or]: [
        {
          startDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
        {
          endDate: {
            [sequelize.Sequelize.Op.between]: [startDate, endDate],
          },
        },
      ],
    },
    order: [['startDate', 'DESC']],
  });
};