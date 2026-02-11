# Elsewedy Attendance Management System - Backend

A comprehensive Node.js backend for the Elsewedy Time Management System with ZKTeco device integration.

## Features

### Core Functionality
- **Employee Management**: Complete CRUD operations for employee records
- **Attendance Tracking**: Real-time attendance monitoring with multiple verification methods
- **Device Integration**: Support for ZKTeco u270 and XFace Pro devices
- **Overtime Management**: Track and approve overtime hours
- **Leave Management**: Handle sick leave, paid time off, and unpaid leave requests
- **Reporting System**: Generate comprehensive reports in multiple formats
- **User Roles**: Admin, HR Manager, Finance, Supervisor, and Employee roles

### Technical Features
- **Real-time Updates**: WebSocket integration for live attendance updates
- **Device Synchronization**: Automated sync with biometric devices
- **Data Export**: Export reports to Excel and PDF formats
- **Authentication**: JWT-based authentication with role-based permissions
- **Database**: SQLite with Sequelize ORM
- **Logging**: Comprehensive logging with Winston
- **API Documentation**: RESTful API with proper error handling

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- ZKTeco devices (u270, XFace Pro) for biometric integration

## Installation

1. **Clone the repository and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp config.env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3001
   HOST=localhost

   # Database Configuration
   DB_PATH=./database/attendance.db

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h

   # ZKTeco Device Configuration
   ZK_DEVICE_IP=192.168.1.100
   ZK_DEVICE_PORT=4370
   ZK_DEVICE_PASSWORD=0

   # XFace Pro Configuration
   XFACE_DEVICE_IP=192.168.1.101
   XFACE_DEVICE_PORT=4370
   XFACE_DEVICE_PASSWORD=0

   # Attendance Settings
   WORK_START_TIME=08:00
   WORK_END_TIME=17:00
   LATE_THRESHOLD_MINUTES=15
   OVERTIME_THRESHOLD_MINUTES=30
   ```

4. **Initialize Database**
   ```bash
   npm run migrate
   ```

5. **Seed Default Data (Optional)**
   ```bash
   npm run seed
   ```

6. **Start the Server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee
- `GET /api/employees/:id/attendance` - Get employee attendance summary
- `GET /api/employees/:id/overtime` - Get employee overtime summary

### Attendance
- `GET /api/attendance` - Get attendance records with filtering
- `GET /api/attendance/summary` - Get attendance summary
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/employee/:employeeId` - Get employee attendance history
- `POST /api/attendance/manual` - Manual attendance entry
- `PUT /api/attendance/:id` - Update attendance record
- `DELETE /api/attendance/:id` - Delete attendance record

### Devices
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get device by ID
- `POST /api/devices` - Create new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Deactivate device
- `POST /api/devices/:id/test` - Test device connection
- `POST /api/devices/:id/sync` - Manual device sync
- `GET /api/devices/stats/overview` - Get device statistics

### Reports
- `GET /api/reports/daily` - Generate daily attendance report
- `GET /api/reports/weekly` - Generate weekly attendance report
- `GET /api/reports/monthly` - Generate monthly attendance report
- `GET /api/reports/employee/:employeeId` - Generate employee summary report

### Overtime
- `GET /api/overtime` - Get overtime records
- `GET /api/overtime/:id` - Get overtime record by ID
- `POST /api/overtime` - Create overtime record
- `PUT /api/overtime/:id` - Update overtime record
- `DELETE /api/overtime/:id` - Delete overtime record
- `POST /api/overtime/:id/approve` - Approve overtime
- `POST /api/overtime/:id/reject` - Reject overtime

## Database Schema

### Core Tables
- **users** - System users with role-based access
- **employees** - Employee information and biometric data
- **departments** - Department/division information
- **shifts** - Work shift definitions
- **devices** - ZKTeco device configurations
- **attendance** - Daily attendance records
- **overtime** - Overtime tracking and approval
- **leave_requests** - Leave management
- **payroll** - Payroll processing

## ZKTeco Device Integration

### Supported Devices
- **ZKTeco u270**: Fingerprint and card reader
- **ZKTeco XFace Pro**: Face recognition, fingerprint, and card reader

### Device Configuration
1. Configure device IP address and port in the `.env` file
2. Add device to the system via `/api/devices` endpoint
3. The system will automatically sync attendance logs every 5 minutes
4. Manual sync is available via `/api/devices/:id/sync`

### Device Status Monitoring
- Real-time device connectivity status
- Last sync time and status tracking
- Automatic retry for failed syncs
- Device offline notifications

## WebSocket Integration

### Real-time Updates
The system provides WebSocket endpoints for real-time updates:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001/ws?token=your-jwt-token');

// Listen for attendance updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'attendance_update') {
    // Handle attendance update
  }
};
```

### Available Channels
- `attendance:all` - All attendance updates
- `attendance:employee:{employeeId}` - Employee-specific updates
- `devices:all` - Device status updates
- `employees:all` - Employee management updates
- `reports:all` - Report generation updates

## User Roles and Permissions

### Admin
- Full system access
- User management
- Device configuration
- All reports and exports

### HR Manager
- Employee management
- Attendance monitoring
- Overtime approval
- Leave management
- HR reports

### Finance
- Read-only access to attendance
- Payroll processing
- Financial reports
- Overtime calculations

### Supervisor
- Team attendance monitoring
- Limited employee access
- Basic reports

### Employee
- View own attendance
- Request overtime
- Apply for leave
- View own reports

## Development

### Project Structure
```
backend/
├── config/          # Database and app configuration
├── middleware/      # Authentication and permission middleware
├── models/         # Sequelize database models
├── routes/         # API route handlers
├── services/       # Business logic services
├── utils/          # Utility functions and helpers
├── logs/           # Application logs
├── exports/        # Generated reports
└── database/       # SQLite database files
```

### Adding New Features
1. Create model in `models/` directory
2. Add routes in `routes/` directory
3. Implement business logic in `services/` directory
4. Add middleware for authentication/permissions
5. Update database associations in `config/database.js`

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Configure proper database path
4. Set up proper logging configuration
5. Configure CORS for production domains

### Security Considerations
- Use HTTPS in production
- Implement rate limiting
- Regular security updates
- Database backup strategy
- Secure device network configuration

### Performance Optimization
- Enable database connection pooling
- Implement caching for frequently accessed data
- Optimize database queries
- Use compression middleware
- Monitor application performance

## Troubleshooting

### Common Issues

1. **Device Connection Failed**
   - Check device IP address and port
   - Verify network connectivity
   - Check device password configuration
   - Ensure device is powered on and accessible

2. **Database Errors**
   - Check database file permissions
   - Verify database path in configuration
   - Run database migrations

3. **Authentication Issues**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Ensure user account is active

4. **Sync Issues**
   - Check device sync interval settings
   - Verify device is online and responsive
   - Check sync logs for error details

### Logs
Application logs are stored in the `logs/` directory:
- `combined.log` - All application logs
- `error.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

## License

This project is proprietary software developed for Elsewedy Cables. All rights reserved.
