import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 30],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255],
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
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50],
    },
  },
  role: {
    type: DataTypes.ENUM('admin', 'hr_manager', 'finance', 'employee', 'supervisor'),
    allowNull: false,
    defaultValue: 'employee',
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['username'],
    },
    {
      unique: true,
      fields: ['email'],
    },
    {
      fields: ['role'],
    },
    {
      fields: ['is_active'],
    },
  ],
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const saltRounds = 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    },
  },
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

User.prototype.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

User.prototype.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return await this.update({
      loginAttempts: 1,
      lockedUntil: null,
    });
  }
  
  const updates = { loginAttempts: this.loginAttempts + 1 };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }
  
  return await this.update(updates);
};

User.prototype.resetLoginAttempts = async function() {
  return await this.update({
    loginAttempts: 0,
    lockedUntil: null,
  });
};

User.prototype.hasPermission = function(permission) {
  if (this.role === 'admin') return true;
  
  const rolePermissions = this.getRolePermissions();
  return rolePermissions.includes(permission) || 
         (this.permissions && this.permissions[permission]);
};

User.prototype.getRolePermissions = function() {
  const rolePermissions = {
    admin: [
      'users.create', 'users.read', 'users.update', 'users.delete',
      'employees.create', 'employees.read', 'employees.update', 'employees.delete',
      'attendance.read', 'attendance.update', 'attendance.delete',
      'devices.create', 'devices.read', 'devices.update', 'devices.delete',
      'reports.read', 'reports.export',
      'overtime.approve', 'overtime.read',
      'leave.approve', 'leave.read',
      'payroll.read', 'payroll.export',
    ],
    hr_manager: [
      'employees.create', 'employees.read', 'employees.update',
      'attendance.read', 'attendance.update',
      'devices.read',
      'reports.read', 'reports.export',
      'overtime.approve', 'overtime.read',
      'leave.approve', 'leave.read',
    ],
    finance: [
      'employees.read',
      'attendance.read',
      'reports.read', 'reports.export',
      'overtime.read',
      'leave.read',
      'payroll.read', 'payroll.export',
    ],
    supervisor: [
      'employees.read',
      'attendance.read',
      'reports.read',
      'overtime.read',
      'leave.read',
    ],
    employee: [
      'attendance.read_own',
      'overtime.read_own',
      'leave.read_own', 'leave.create',
    ],
  };
  
  return rolePermissions[this.role] || [];
};

User.prototype.toSafeObject = function() {
  const { password, ...safeUser } = this.toJSON();
  return safeUser;
};

// Class methods
User.findByCredentials = async function(username, password) {
  const user = await this.findOne({
    where: {
      $or: [
        { username: username },
        { email: username }
      ],
      isActive: true,
    },
  });

  if (!user || user.isLocked()) {
    throw new Error('Invalid credentials or account locked');
  }

  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    await user.incrementLoginAttempts();
    throw new Error('Invalid credentials');
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  await user.update({ lastLogin: new Date() });

  return user;
};

User.getActiveUsers = async function() {
  return await this.findAll({
    where: { isActive: true },
    order: [['firstName', 'ASC']],
  });
};

User.getUsersByRole = async function(role) {
  return await this.findAll({
    where: { role, isActive: true },
    order: [['firstName', 'ASC']],
  });
};
