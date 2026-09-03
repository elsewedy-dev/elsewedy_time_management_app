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
  sickLeave: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  sickLeaveNote: {
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
      // Look up employee's shift to get accurate start/end times
      let shiftStartHour = 8, shiftStartMin = 0;
      let shiftEndHour = 17, shiftEndMin = 0;
      let lateThreshold = 15;
      let standardHours = 8;

      try {
        const { Employee } = await import('./Employee.js');
        const { Shift } = await import('./Shift.js');
        const employee = await Employee.findByPk(attendance.employeeId, {
          include: [{ model: Shift, as: 'shift', attributes: ['startTime', 'endTime', 'lateThreshold', 'breakDuration', 'isNightShift'] }],
        });
        if (employee?.shift) {
          const s = employee.shift;
          if (s.startTime) {
            const [h, m] = s.startTime.split(':').map(Number);
            shiftStartHour = h; shiftStartMin = m;
          }
          if (s.endTime) {
            const [h, m] = s.endTime.split(':').map(Number);
            shiftEndHour = h; shiftEndMin = m;
          }
          if (s.lateThreshold != null) lateThreshold = s.lateThreshold;
          if (s.breakDuration != null) {
            // Calculate standard shift hours from start/end minus break
            let shiftMins = (shiftEndHour * 60 + shiftEndMin) - (shiftStartHour * 60 + shiftStartMin);
            if (shiftMins <= 0) shiftMins += 24 * 60; // overnight shift
            standardHours = Math.max(1, (shiftMins - s.breakDuration) / 60);
          }
        }
      } catch (_) {
        // Fall back to defaults if lookup fails
      }

      // Only calculate working hours and status if BOTH check-in and check-out exist
      if (attendance.checkInTime && attendance.checkOutTime) {
        const checkIn = moment(attendance.checkInTime);
        const checkOut = moment(attendance.checkOutTime);

        if (checkOut.isSameOrBefore(checkIn)) {
          attendance.checkOutTime = null;
          attendance.totalWorkingHours = 0;
          attendance.overtimeHours = 0;
          attendance.status = 'present';
          return;
        }

        let totalHours = checkOut.diff(checkIn, 'minutes') / 60;

        if (attendance.breakStartTime && attendance.breakEndTime) {
          const breakMinutes = moment(attendance.breakEndTime).diff(moment(attendance.breakStartTime), 'minutes');
          totalHours -= breakMinutes / 60;
        }

        attendance.totalWorkingHours = Math.max(0, totalHours);
        attendance.overtimeHours = Math.max(0, totalHours - standardHours);

        if (totalHours >= standardHours) {
          attendance.status = 'present';
        } else if (totalHours >= standardHours / 2) {
          attendance.status = 'half_day';
        } else if (totalHours >= 1) {
          attendance.status = 'early_leave';
        } else {
          attendance.status = 'present';
          attendance.checkOutTime = null;
        }
      } else {
        attendance.status = 'present';
        attendance.totalWorkingHours = 0;
        attendance.overtimeHours = 0;
      }

      // Late check using shift start time + threshold
      if (attendance.checkInTime) {
        const checkInTime = moment(attendance.checkInTime);
        const expectedStart = moment(attendance.checkInTime)
          .hour(shiftStartHour).minute(shiftStartMin + lateThreshold).second(0);
        if (checkInTime.isAfter(expectedStart)) {
          attendance.isLate = true;
          const baseStart = moment(attendance.checkInTime).hour(shiftStartHour).minute(shiftStartMin).second(0);
          attendance.lateMinutes = checkInTime.diff(baseStart, 'minutes');
        } else {
          attendance.isLate = false;
          attendance.lateMinutes = 0;
        }
      }

      // Early leave check using shift end time
      if (attendance.checkOutTime) {
        const checkOutTime = moment(attendance.checkOutTime);
        const expectedEnd = moment(attendance.checkOutTime).hour(shiftEndHour).minute(shiftEndMin).second(0);
        if (checkOutTime.isBefore(expectedEnd)) {
          attendance.isEarlyLeave = true;
          attendance.earlyLeaveMinutes = expectedEnd.diff(checkOutTime, 'minutes');
        } else {
          attendance.isEarlyLeave = false;
          attendance.earlyLeaveMinutes = 0;
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
