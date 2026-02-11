import { logger } from '../utils/logger.js';

/**
 * Permission middleware
 * Checks if user has required permission
 */
export const permissionMiddleware = (requiredPermission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has the required permission
      if (!req.user.hasPermission(requiredPermission)) {
        logger.warn(`User ${req.user.id} attempted to access ${requiredPermission} without permission`);
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: requiredPermission,
          userRole: req.user.role,
        });
      }

      next();

    } catch (error) {
      logger.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Role-based middleware
 * Checks if user has one of the required roles
 */
export const roleMiddleware = (...requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!requiredRoles.includes(req.user.role)) {
        logger.warn(`User ${req.user.id} with role ${req.user.role} attempted to access resource requiring roles: ${requiredRoles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Insufficient role privileges',
          required: requiredRoles,
          userRole: req.user.role,
        });
      }

      next();

    } catch (error) {
      logger.error('Role middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Owner or admin middleware
 * Allows access if user is the owner of the resource or is an admin
 */
export const ownerOrAdminMiddleware = (getOwnerId) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Admin has access to everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get owner ID from request
      const ownerId = getOwnerId(req);
      
      if (ownerId && ownerId === req.user.id) {
        return next();
      }

      logger.warn(`User ${req.user.id} attempted to access resource owned by ${ownerId}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
      });

    } catch (error) {
      logger.error('Owner or admin middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Department-based access middleware
 * Allows access if user is in the same department or is admin/hr_manager
 */
export const departmentAccessMiddleware = (getDepartmentId) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Admin and HR managers have access to all departments
      if (['admin', 'hr_manager'].includes(req.user.role)) {
        return next();
      }

      // Get department ID from request
      const resourceDepartmentId = getDepartmentId(req);
      
      // If user is in the same department
      if (req.user.departmentId === resourceDepartmentId) {
        return next();
      }

      logger.warn(`User ${req.user.id} attempted to access resource from different department`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access resources from your department.',
      });

    } catch (error) {
      logger.error('Department access middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};
