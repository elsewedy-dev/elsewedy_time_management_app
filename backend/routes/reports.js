import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Attendance } from '../models/Attendance.js';
import { Employee } from '../models/Employee.js';
import { Department } from '../models/Department.js';
import { Device } from '../models/Device.js';
import { Shift } from '../models/Shift.js';
import { authMiddleware } from '../middleware/auth.js';
import { permissionMiddleware } from '../middleware/permissions.js';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';
import moment from 'moment';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure exports directory exists
const exportsDir = join(__dirname, '../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Export daily attendance as Excel — no auth required
router.get('/daily/export', [
  query('date').optional().isISO8601(),
  query('departmentId').optional().isUUID(),
], async (req, res) => {
  try {
    const date = req.query.date || moment().format('YYYY-MM-DD');
    const { departmentId } = req.query;
    const reportDate = moment(date).format('YYYY-MM-DD');

    const include = [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
          { model: (await import('../models/Shift.js')).Shift, as: 'shift', attributes: ['id', 'name', 'startTime', 'endTime', 'isNightShift'], required: false },
        ],
        ...(departmentId && { where: { departmentId } }),
      },
      { model: Device, as: 'device', attributes: ['id', 'name'], required: false },
    ];

    const attendance = await Attendance.findAll({
      where: { date: reportDate },
      include,
      order: [['checkInTime', 'ASC']],
    });

    // Summary row data
    const present  = attendance.filter(a => a.status === 'present' || a.status === 'half_day').length;
    const absent   = attendance.filter(a => a.status === 'absent').length;
    const late     = attendance.filter(a => a.isLate).length;
    const rate     = attendance.length > 0 ? ((present / attendance.length) * 100).toFixed(1) : '0.0';

    // Build Excel rows
    const rows = attendance.map((a, i) => {
      // Detect shift mismatch
      const shift = a.employee?.shift;
      let shiftMismatch = 'No';
      let shiftMismatchNote = '';
      if (shift && a.checkInTime) {
        const checkInMins = moment(a.checkInTime).hours() * 60 + moment(a.checkInTime).minutes();
        const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
        const [eh, em] = (shift.endTime   || '23:59').split(':').map(Number);
        const windowOpen  = sh * 60 + sm - 120;
        const windowClose = eh * 60 + em + 120;
        const inWindow = (shift.isNightShift || sh * 60 + sm > eh * 60 + em)
          ? (checkInMins >= windowOpen || checkInMins <= windowClose)
          : (checkInMins >= windowOpen && checkInMins <= windowClose);
        if (!inWindow) {
          shiftMismatch = 'YES - FLAGGED';
          shiftMismatchNote = `Scanned at ${moment(a.checkInTime).format('hh:mm A')} — assigned to ${shift.name} (${moment(shift.startTime, 'HH:mm').format('hh:mm A')} – ${moment(shift.endTime, 'HH:mm').format('hh:mm A')})`;
        }
      }

      return {
        '#':                  i + 1,
        'Employee ID':        a.employee?.employeeId || '--',
        'Name':               `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.trim(),
        'Department':         a.employee?.department?.name || 'N/A',
        'Assigned Shift':     shift?.name || 'Not Assigned',
        'Shift Hours':        shift ? `${shift.startTime?.slice(0,5)}–${shift.endTime?.slice(0,5)}` : '--',
        'Sick Leave':         a.sickLeave ? 'YES - SICK LEAVE' : '',
        'Sick Leave Note':    a.sickLeaveNote || '',
        'Shift Mismatch':     shiftMismatch,
        'Mismatch Note':      shiftMismatchNote,
        'Date':               reportDate,
        'Check In':           a.checkInTime  ? moment(a.checkInTime).format('hh:mm A')  : '--',
        'Check Out':          a.checkOutTime ? moment(a.checkOutTime).format('hh:mm A') : '--',
        'Working Hours':      a.totalWorkingHours ? Number(a.totalWorkingHours).toFixed(2) : '0.00',
        'Overtime Hours':     a.overtimeHours     ? Number(a.overtimeHours).toFixed(2)     : '0.00',
        'Late Minutes':       a.lateMinutes       || 0,
        'Status':             a.sickLeave ? 'Sick Leave' : a.status,
        'Is Late':            a.isLate       ? 'Yes' : 'No',
        'Early Leave':        a.isEarlyLeave ? 'Yes' : 'No',
        'Device':             a.device?.name || '--',
        'Verify Method':      a.verificationMethod || '--',
      };
    });

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Attendance Detail ──────────────────────────────────────────
    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 4  }, { wch: 12 }, { wch: 24 }, { wch: 18 },
      { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 40 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 8  },
      { wch: 12 }, { wch: 16 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // ── Sheet 2: Summary ────────────────────────────────────────────────────
    const summaryRows = [
      { 'Metric': 'Report Date',        'Value': reportDate },
      { 'Metric': 'Total Records',      'Value': attendance.length },
      { 'Metric': 'Present / Half Day', 'Value': present },
      { 'Metric': 'Absent',             'Value': absent },
      { 'Metric': 'Late Arrivals',      'Value': late },
      { 'Metric': 'Attendance Rate',    'Value': `${rate}%` },
      { 'Metric': 'Generated At',       'Value': moment().format('YYYY-MM-DD HH:mm:ss') },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 22 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `attendance-${reportDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    logger.error('Error exporting daily attendance:', error);
    res.status(500).json({ success: false, message: 'Export failed: ' + error.message });
  }
});

// Generate daily attendance report
router.get('/daily', [
  authMiddleware,
  permissionMiddleware('reports.read'),
  query('date').isISO8601(),
  query('departmentId').optional().isUUID(),
  query('format').optional().isIn(['json', 'excel', 'pdf']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { date, departmentId, format = 'json' } = req.query;
    const reportDate = moment(date).format('YYYY-MM-DD');

    // Build where clause
    const whereClause = { date: reportDate };
    
    // Build include clause
    const include = [
      {
        model: Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        ...(departmentId && { where: { departmentId } }),
      },
      {
        model: Device,
        attributes: ['id', 'name', 'type', 'location'],
      },
    ];

    if (departmentId) {
      include[0].include = [{
        model: Department,
        attributes: ['id', 'name', 'code'],
      }];
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include,
      order: [['checkInTime', 'ASC']],
    });

    // Calculate summary statistics
    const summary = {
      totalEmployees: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.isLate).length,
      earlyLeave: attendance.filter(a => a.isEarlyLeave).length,
      halfDay: attendance.filter(a => a.status === 'half_day').length,
      totalWorkingHours: attendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0),
      attendanceRate: attendance.length > 0 ? 
        (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 : 0,
    };

    const reportData = {
      date: reportDate,
      summary,
      attendance,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
    };

    if (format === 'json') {
      return res.json({
        success: true,
        data: reportData,
      });
    } else if (format === 'excel') {
      return generateExcelReport(res, reportData, `daily-attendance-${reportDate}.xlsx`);
    } else if (format === 'pdf') {
      return generatePDFReport(res, reportData, `daily-attendance-${reportDate}.pdf`);
    }

  } catch (error) {
    logger.error('Error generating daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Generate weekly attendance report
router.get('/weekly', [
  authMiddleware,
  permissionMiddleware('reports.read'),
  query('startDate').isISO8601(),
  query('endDate').optional().isISO8601(),
  query('departmentId').optional().isUUID(),
  query('format').optional().isIn(['json', 'excel', 'pdf']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { startDate, endDate, departmentId, format = 'json' } = req.query;
    const weekStart = moment(startDate).startOf('week');
    const weekEnd = endDate ? moment(endDate) : moment(startDate).endOf('week');

    // Build where clause
    const whereClause = {
      date: {
        [Op.between]: [weekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD')],
      },
    };

    // Build include clause
    const include = [
      {
        model: Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        ...(departmentId && { where: { departmentId } }),
      },
      {
        model: Device,
        attributes: ['id', 'name', 'type'],
      },
    ];

    const attendance = await Attendance.findAll({
      where: whereClause,
      include,
      order: [['date', 'ASC'], ['checkInTime', 'ASC']],
    });

    // Group by employee and calculate weekly stats
    const employeeStats = {};
    attendance.forEach(record => {
      const empId = record.employeeId;
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          employee: record.employee,
          records: [],
          totalWorkingHours: 0,
          totalOvertimeHours: 0,
          presentDays: 0,
          lateDays: 0,
          attendanceRate: 0,
        };
      }
      
      employeeStats[empId].records.push(record);
      employeeStats[empId].totalWorkingHours += record.totalWorkingHours || 0;
      employeeStats[empId].totalOvertimeHours += record.overtimeHours || 0;
      
      if (record.status === 'present') {
        employeeStats[empId].presentDays++;
      }
      if (record.isLate) {
        employeeStats[empId].lateDays++;
      }
    });

    // Calculate attendance rates
    const workingDays = weekEnd.diff(weekStart, 'days') + 1;
    Object.values(employeeStats).forEach(emp => {
      emp.attendanceRate = workingDays > 0 ? (emp.presentDays / workingDays) * 100 : 0;
    });

    const summary = {
      period: {
        start: weekStart.format('YYYY-MM-DD'),
        end: weekEnd.format('YYYY-MM-DD'),
        workingDays,
      },
      totalEmployees: Object.keys(employeeStats).length,
      totalWorkingHours: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalWorkingHours, 0),
      totalOvertimeHours: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalOvertimeHours, 0),
      averageAttendanceRate: Object.values(employeeStats).length > 0 ?
        Object.values(employeeStats).reduce((sum, emp) => sum + emp.attendanceRate, 0) / Object.values(employeeStats).length : 0,
    };

    const reportData = {
      summary,
      employeeStats: Object.values(employeeStats),
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
    };

    if (format === 'json') {
      return res.json({
        success: true,
        data: reportData,
      });
    } else if (format === 'excel') {
      return generateWeeklyExcelReport(res, reportData, `weekly-attendance-${weekStart.format('YYYY-MM-DD')}.xlsx`);
    } else if (format === 'pdf') {
      return generateWeeklyPDFReport(res, reportData, `weekly-attendance-${weekStart.format('YYYY-MM-DD')}.pdf`);
    }

  } catch (error) {
    logger.error('Error generating weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Generate monthly attendance report
router.get('/monthly', [
  authMiddleware,
  permissionMiddleware('reports.read'),
  query('year').isInt({ min: 2020, max: 2030 }),
  query('month').isInt({ min: 1, max: 12 }),
  query('departmentId').optional().isUUID(),
  query('format').optional().isIn(['json', 'excel', 'pdf']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { year, month, departmentId, format = 'json' } = req.query;
    const monthStart = moment().year(year).month(month - 1).startOf('month');
    const monthEnd = moment().year(year).month(month - 1).endOf('month');

    // Build where clause
    const whereClause = {
      date: {
        [Op.between]: [monthStart.format('YYYY-MM-DD'), monthEnd.format('YYYY-MM-DD')],
      },
    };

    // Build include clause
    const include = [
      {
        model: Employee,
        attributes: ['id', 'firstName', 'lastName', 'employeeId', 'departmentId'],
        ...(departmentId && { where: { departmentId } }),
      },
      {
        model: Device,
        attributes: ['id', 'name', 'type'],
      },
    ];

    const attendance = await Attendance.findAll({
      where: whereClause,
      include,
      order: [['date', 'ASC'], ['checkInTime', 'ASC']],
    });

    // Calculate monthly statistics
    const summary = {
      period: {
        year: parseInt(year),
        month: parseInt(month),
        start: monthStart.format('YYYY-MM-DD'),
        end: monthEnd.format('YYYY-MM-DD'),
        workingDays: monthEnd.diff(monthStart, 'days') + 1,
      },
      totalRecords: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.isLate).length,
      earlyLeave: attendance.filter(a => a.isEarlyLeave).length,
      halfDay: attendance.filter(a => a.status === 'half_day').length,
      totalWorkingHours: attendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0),
      totalOvertimeHours: attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
      averageWorkingHours: attendance.length > 0 ?
        attendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0) / attendance.length : 0,
      attendanceRate: attendance.length > 0 ?
        (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 : 0,
    };

    // Group by date for daily breakdown
    const dailyBreakdown = {};
    attendance.forEach(record => {
      const date = record.date;
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = {
          date,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          attendanceRate: 0,
        };
      }
      
      dailyBreakdown[date].total++;
      if (record.status === 'present') dailyBreakdown[date].present++;
      if (record.status === 'absent') dailyBreakdown[date].absent++;
      if (record.isLate) dailyBreakdown[date].late++;
    });

    // Calculate daily attendance rates
    Object.values(dailyBreakdown).forEach(day => {
      day.attendanceRate = day.total > 0 ? (day.present / day.total) * 100 : 0;
    });

    const reportData = {
      summary,
      dailyBreakdown: Object.values(dailyBreakdown),
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
    };

    if (format === 'json') {
      return res.json({
        success: true,
        data: reportData,
      });
    } else if (format === 'excel') {
      return generateMonthlyExcelReport(res, reportData, `monthly-attendance-${year}-${month}.xlsx`);
    } else if (format === 'pdf') {
      return generateMonthlyPDFReport(res, reportData, `monthly-attendance-${year}-${month}.pdf`);
    }

  } catch (error) {
    logger.error('Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Generate employee summary report
router.get('/employee/:employeeId', [
  authMiddleware,
  permissionMiddleware('reports.read'),
  param('employeeId').isUUID(),
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('format').optional().isIn(['json', 'excel', 'pdf']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { employeeId, startDate, endDate, format = 'json' } = req.query;

    // Get employee details
    const employee = await Employee.findByPk(employeeId, {
      include: [
        {
          model: Department,
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Shift,
          attributes: ['id', 'name', 'startTime', 'endTime'],
        },
      ],
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Get attendance summary
    const summary = await Attendance.getAttendanceSummary(employeeId, startDate, endDate);

    // Get detailed attendance records
    const attendance = await Attendance.findAll({
      where: {
        employeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: Device,
          attributes: ['id', 'name', 'type', 'location'],
        },
      ],
      order: [['date', 'DESC']],
    });

    const reportData = {
      employee,
      period: {
        start: startDate,
        end: endDate,
      },
      summary,
      attendance,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.id,
    };

    if (format === 'json') {
      return res.json({
        success: true,
        data: reportData,
      });
    } else if (format === 'excel') {
      return generateEmployeeExcelReport(res, reportData, `employee-report-${employee.employeeId}.xlsx`);
    } else if (format === 'pdf') {
      return generateEmployeePDFReport(res, reportData, `employee-report-${employee.employeeId}.pdf`);
    }

  } catch (error) {
    logger.error('Error generating employee report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Helper function to generate Excel report
function generateExcelReport(res, data, filename) {
  try {
    // Prepare data for Excel
    const wsData = data.attendance.map(record => ({
      'Employee Name': `${record.employee.firstName} ${record.employee.lastName}`,
      'Employee ID': record.employee.employeeId,
      'Check In': record.checkInTime ? moment(record.checkInTime).format('HH:mm:ss') : '--',
      'Check Out': record.checkOutTime ? moment(record.checkOutTime).format('HH:mm:ss') : '--',
      'Status': record.status,
      'Working Hours': record.totalWorkingHours || 0,
      'Overtime Hours': record.overtimeHours || 0,
      'Late Minutes': record.lateMinutes || 0,
      'Verification Method': record.verificationMethod,
      'Device': record.device?.name || '--',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Add summary sheet
    const summaryWs = XLSX.utils.json_to_sheet([data.summary]);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('Error generating Excel report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating Excel report',
    });
  }
}

// Helper function to generate PDF report
function generatePDFReport(res, data, filename) {
  try {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // Add content to PDF
    doc.fontSize(20).text('Daily Attendance Report', 50, 50);
    doc.fontSize(12).text(`Date: ${data.date}`, 50, 80);
    doc.text(`Generated: ${moment(data.generatedAt).format('YYYY-MM-DD HH:mm:ss')}`, 50, 100);
    
    // Add summary
    doc.fontSize(16).text('Summary', 50, 130);
    doc.fontSize(12).text(`Total Employees: ${data.summary.totalEmployees}`, 50, 160);
    doc.text(`Present: ${data.summary.present}`, 50, 180);
    doc.text(`Absent: ${data.summary.absent}`, 50, 200);
    doc.text(`Late: ${data.summary.late}`, 50, 220);
    doc.text(`Attendance Rate: ${data.summary.attendanceRate.toFixed(2)}%`, 50, 240);
    
    doc.end();

  } catch (error) {
    logger.error('Error generating PDF report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF report',
    });
  }
}

// Similar helper functions for other report types...
function generateWeeklyExcelReport(res, data, filename) {
  // Implementation for weekly Excel report
  res.status(501).json({
    success: false,
    message: 'Weekly Excel report not implemented yet',
  });
}

function generateWeeklyPDFReport(res, data, filename) {
  // Implementation for weekly PDF report
  res.status(501).json({
    success: false,
    message: 'Weekly PDF report not implemented yet',
  });
}

function generateMonthlyExcelReport(res, data, filename) {
  // Implementation for monthly Excel report
  res.status(501).json({
    success: false,
    message: 'Monthly Excel report not implemented yet',
  });
}

function generateMonthlyPDFReport(res, data, filename) {
  // Implementation for monthly PDF report
  res.status(501).json({
    success: false,
    message: 'Monthly PDF report not implemented yet',
  });
}

function generateEmployeeExcelReport(res, data, filename) {
  // Implementation for employee Excel report
  res.status(501).json({
    success: false,
    message: 'Employee Excel report not implemented yet',
  });
}

function generateEmployeePDFReport(res, data, filename) {
  // Implementation for employee PDF report
  res.status(501).json({
    success: false,
    message: 'Employee PDF report not implemented yet',
  });
}

export default router;
