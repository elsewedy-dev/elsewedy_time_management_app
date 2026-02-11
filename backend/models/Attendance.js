import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import moment from 'moment';

export const Attendance = sequelize.define('Attendance', {
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
  deviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id',
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  breakStartTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  breakEndTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  totalWorkingHours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    defaultValue: 0,
  },
  overtimeHours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'early_leave', 'half_day'),
    allowNull: false,
    defaultValue: 'absent',
  },
  verificationMethod: {
    type: DataTypes.ENUM('fingerprint', 'face', 'card', 'password', 'manual'),
    allowNull: false,
  },
  isLate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isEarlyLeave: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lateMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  earlyLeaveMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  deviceLogId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rawLogData: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
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
}, {
  tableName: 'attendance',
  indexes: [
    {
      fields: ['employee_id'],
    },
    {
      fields: ['date'],
    },
    {
      fields: ['device_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['verification_method'],
    },
    {
      unique: true,
      fields: ['employee_id', 'date'],
    },
  ],
  hooks: {
    beforeSave: async (attendance) => {
      // Calculate working hours if both check-in and check-out times are present
      if (attendance.checkInTime && attendance.checkOutTime) {
        const checkIn = moment(attendance.checkInTime);
        const checkOut = moment(attendance.checkOutTime);
        
        // Calculate total working hours (excluding break time)
        let totalHours = checkOut.diff(checkIn, 'minutes') / 60;
        
        // Subtract break time if break times are recorded
        if (attendance.breakStartTime && attendance.breakEndTime) {
          const breakStart = moment(attendance.breakStartTime);
          const breakEnd = moment(attendance.breakEndTime);
          const breakMinutes = breakEnd.diff(breakStart, 'minutes');
          totalHours -= breakMinutes / 60;
        }
        
        attendance.totalWorkingHours = Math.max(0, totalHours);
        
        // Calculate overtime (assuming 8 hours is standard working day)
        const standardHours = 8;
        if (totalHours > standardHours) {
          attendance.overtimeHours = totalHours - standardHours;
        } else {
          attendance.overtimeHours = 0;
        }
        
        // Determine status based on working hours
        if (totalHours >= 8) {
          attendance.status = 'present';
        } else if (totalHours >= 4) {
          attendance.status = 'half_day';
        } else {
          attendance.status = 'early_leave';
        }
      }
      
      // Calculate late minutes if check-in time is available
      if (attendance.checkInTime) {
        const checkInTime = moment(attendance.checkInTime);
        const expectedStartTime = moment(attendance.date).hour(8).minute(0); // 8:00 AM
        
        if (checkInTime.isAfter(expectedStartTime)) {
          attendance.isLate = true;
          attendance.lateMinutes = checkInTime.diff(expectedStartTime, 'minutes');
        }
      }
      
      // Calculate early leave minutes if check-out time is available
      if (attendance.checkOutTime) {
        const checkOutTime = moment(attendance.checkOutTime);
        const expectedEndTime = moment(attendance.date).hour(17).minute(0); // 5:00 PM
        
        if (checkOutTime.isBefore(expectedEndTime)) {
          attendance.isEarlyLeave = true;
          attendance.earlyLeaveMinutes = expectedEndTime.diff(checkOutTime, 'minutes');
        }
      }
    },
  },
});

// Instance methods
Attendance.prototype.getWorkingDuration = function() {
  if (!this.checkInTime || !this.checkOutTime) {
    return 0;
  }
  
  const start = moment(this.checkInTime);
  const end = moment(this.checkOutTime);
  return end.diff(start, 'minutes');
};

Attendance.prototype.getBreakDuration = function() {
  if (!this.breakStartTime || !this.breakEndTime) {
    return 0;
  }
  
  const start = moment(this.breakStartTime);
  const end = moment(this.breakEndTime);
  return end.diff(start, 'minutes');
};

Attendance.prototype.getNetWorkingHours = function() {
  const totalMinutes = this.getWorkingDuration();
  const breakMinutes = this.getBreakDuration();
  return Math.max(0, (totalMinutes - breakMinutes) / 60);
};

Attendance.prototype.isWorkingDay = function() {
  const dayOfWeek = moment(this.date).day();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
};

Attendance.prototype.isHoliday = function() {
  // This would be enhanced to check against a holidays table
  return false;
};

// Class methods
Attendance.getAttendanceSummary = async function(employeeId, startDate, endDate) {
  const attendance = await this.findAll({
    where: {
      employeeId,
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
    order: [['date', 'ASC']],
  });
  
  const summary = {
    totalDays: attendance.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.isLate).length,
    earlyLeave: attendance.filter(a => a.isEarlyLeave).length,
    halfDay: attendance.filter(a => a.status === 'half_day').length,
    totalWorkingHours: attendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0),
    totalOvertimeHours: attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
    totalLateMinutes: attendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0),
    totalEarlyLeaveMinutes: attendance.reduce((sum, a) => sum + (a.earlyLeaveMinutes || 0), 0),
  };
  
  summary.attendanceRate = summary.totalDays > 0 ? (summary.present / summary.totalDays) * 100 : 0;
  
  return summary;
};

Attendance.getDepartmentAttendance = async function(departmentId, date) {
  const attendance = await this.findAll({
    include: [{
      model: sequelize.models.Employee,
      where: { departmentId },
      attributes: ['firstName', 'lastName', 'employeeId'],
    }],
    where: {
      date,
    },
  });
  
  return attendance;
};

Attendance.getDeviceAttendance = async function(deviceId, startDate, endDate) {
  return await this.findAll({
    where: {
      deviceId,
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      },
    },
    include: [{
      model: sequelize.models.Employee,
      attributes: ['firstName', 'lastName', 'employeeId'],
    }],
    order: [['checkInTime', 'DESC']],
  });
};
