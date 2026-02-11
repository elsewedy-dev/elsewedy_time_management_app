import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  breakDuration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60, // in minutes
    validate: {
      min: 0,
      max: 480, // 8 hours max
    },
  },
  breakStartTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  breakEndTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  workingDays: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [1, 2, 3, 4, 5], // Monday to Friday
    validate: {
      isValidWorkingDays(value) {
        if (!Array.isArray(value)) {
          throw new Error('Working days must be an array');
        }
        if (!value.every(day => day >= 0 && day <= 6)) {
          throw new Error('Working days must be between 0 (Sunday) and 6 (Saturday)');
        }
      },
    },
  },
  isNightShift: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  overtimeThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30, // minutes after shift end
  },
  lateThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15, // minutes after shift start
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#10B981',
    validate: {
      is: /^#[0-9A-F]{6}$/i,
    },
  },
}, {
  tableName: 'shifts',
  indexes: [
    {
      fields: ['is_active'],
    },
    {
      fields: ['is_night_shift'],
    },
  ],
  hooks: {
    beforeValidate: (shift) => {
      // Auto-detect night shift based on times
      if (shift.startTime && shift.endTime) {
        const startHour = parseInt(shift.startTime.split(':')[0]);
        const endHour = parseInt(shift.endTime.split(':')[0]);
        
        // If start time is after 22:00 or end time is before 06:00
        if (startHour >= 22 || endHour <= 6) {
          shift.isNightShift = true;
        }
      }
    },
  },
});

// Instance methods
Shift.prototype.getWorkingHours = function() {
  if (!this.startTime || !this.endTime) {
    return 0;
  }
  
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  
  let startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  let endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  // Handle night shift (end time is next day)
  if (this.isNightShift && endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }
  
  const totalMinutes = endMinutes - startMinutes;
  const workingHours = (totalMinutes - this.breakDuration) / 60;
  
  return Math.max(0, workingHours);
};

Shift.prototype.isWorkingDay = function(dayOfWeek) {
  return this.workingDays.includes(dayOfWeek);
};

Shift.prototype.getNextWorkingDay = function(fromDate) {
  const date = new Date(fromDate);
  let attempts = 0;
  
  while (attempts < 7) {
    if (this.isWorkingDay(date.getDay())) {
      return new Date(date);
    }
    date.setDate(date.getDate() + 1);
    attempts++;
  }
  
  return null;
};

Shift.prototype.getPreviousWorkingDay = function(fromDate) {
  const date = new Date(fromDate);
  let attempts = 0;
  
  while (attempts < 7) {
    if (this.isWorkingDay(date.getDay())) {
      return new Date(date);
    }
    date.setDate(date.getDate() - 1);
    attempts++;
  }
  
  return null;
};

Shift.prototype.getShiftSchedule = function(date) {
  const scheduleDate = new Date(date);
  const dayOfWeek = scheduleDate.getDay();
  
  if (!this.isWorkingDay(dayOfWeek)) {
    return null;
  }
  
  const startTime = new Date(scheduleDate);
  const endTime = new Date(scheduleDate);
  
  // Set start time
  const [startHour, startMinute] = this.startTime.split(':');
  startTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
  
  // Set end time
  const [endHour, endMinute] = this.endTime.split(':');
  endTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
  
  // Handle night shift
  if (this.isNightShift && endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }
  
  // Calculate break times
  let breakStart = null;
  let breakEnd = null;
  
  if (this.breakStartTime && this.breakEndTime) {
    breakStart = new Date(scheduleDate);
    breakEnd = new Date(scheduleDate);
    
    const [breakStartHour, breakStartMinute] = this.breakStartTime.split(':');
    const [breakEndHour, breakEndMinute] = this.breakEndTime.split(':');
    
    breakStart.setHours(parseInt(breakStartHour), parseInt(breakStartMinute), 0, 0);
    breakEnd.setHours(parseInt(breakEndHour), parseInt(breakEndMinute), 0, 0);
    
    // Handle break spanning midnight for night shifts
    if (this.isNightShift && breakEnd <= breakStart) {
      breakEnd.setDate(breakEnd.getDate() + 1);
    }
  }
  
  return {
    date: scheduleDate,
    startTime,
    endTime,
    breakStart,
    breakEnd,
    breakDuration: this.breakDuration,
    workingHours: this.getWorkingHours(),
    isNightShift: this.isNightShift,
  };
};

Shift.prototype.calculateAttendanceStatus = function(checkInTime, checkOutTime) {
  const schedule = this.getShiftSchedule(checkInTime);
  if (!schedule) {
    return { status: 'non_working_day', message: 'Not a working day' };
  }
  
  const checkIn = new Date(checkInTime);
  const checkOut = checkOutTime ? new Date(checkOutTime) : null;
  
  // Check if late
  const lateThreshold = new Date(schedule.startTime);
  lateThreshold.setMinutes(lateThreshold.getMinutes() + this.lateThreshold);
  
  const isLate = checkIn > lateThreshold;
  
  // Calculate working hours
  let workingHours = 0;
  if (checkOut) {
    const totalMinutes = (checkOut - checkIn) / (1000 * 60);
    workingHours = Math.max(0, (totalMinutes - this.breakDuration) / 60);
  }
  
  // Determine status
  let status = 'present';
  if (workingHours < 4) {
    status = 'early_leave';
  } else if (workingHours < 8) {
    status = 'half_day';
  }
  
  return {
    status,
    isLate,
    workingHours,
    lateMinutes: isLate ? Math.floor((checkIn - schedule.startTime) / (1000 * 60)) : 0,
    overtimeMinutes: checkOut ? Math.max(0, Math.floor((checkOut - schedule.endTime) / (1000 * 60))) : 0,
  };
};

// Class methods
Shift.getActiveShifts = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['startTime', 'ASC']],
  });
};

Shift.getShiftByName = async function(name) {
  return await this.findOne({
    where: { name, isActive: true },
  });
};

Shift.getDefaultShift = async function() {
  return await this.findOne({
    where: { isActive: true },
    order: [['createdAt', 'ASC']],
  });
};
