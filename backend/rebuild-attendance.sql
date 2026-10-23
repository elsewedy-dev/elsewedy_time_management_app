-- Rebuild attendance employee links from device_log_id -> employee.employee_id
-- For each (device_log_id, date) keep ONE record linked to the correct employee

CREATE TEMP TABLE emp_map AS
SELECT employee_id AS log_id, id AS correct_uuid
FROM employees
WHERE employee_id IS NOT NULL;

CREATE TEMP TABLE records_to_keep AS
SELECT DISTINCT ON (m.correct_uuid, a.date)
  a.id AS att_id,
  m.correct_uuid,
  a.date,
  a.check_in_time,
  a.check_out_time,
  a.status,
  a.verification_method,
  a.device_id,
  a.device_log_id,
  a.raw_log_data,
  a.is_late,
  a.late_minutes,
  a.overtime_hours,
  a.total_working_hours
FROM attendance a
JOIN emp_map m ON a.device_log_id = m.log_id
ORDER BY m.correct_uuid, a.date,
  (CASE WHEN a.check_in_time IS NOT NULL THEN 0 ELSE 1 END),
  a.id;

-- Delete all attendance that has a device_log_id mapping
DELETE FROM attendance
WHERE device_log_id IS NOT NULL AND device_log_id != ''
  AND EXISTS (SELECT 1 FROM emp_map WHERE log_id = attendance.device_log_id);

-- Re-insert with correct employee UUID
INSERT INTO attendance (
  id, employee_id, device_id, date,
  check_in_time, check_out_time, status,
  verification_method, device_log_id, raw_log_data,
  is_late, late_minutes, overtime_hours, total_working_hours,
  created_at, updated_at
)
SELECT
  att_id, correct_uuid, device_id, date,
  check_in_time, check_out_time, status,
  verification_method, device_log_id, raw_log_data,
  is_late, late_minutes, overtime_hours, total_working_hours,
  NOW(), NOW()
FROM records_to_keep;

DROP TABLE emp_map;
DROP TABLE records_to_keep;

-- Verify
SELECT
  (SELECT COUNT(*) FROM employees) AS total_employees,
  (SELECT COUNT(*) FROM attendance) AS total_attendance,
  (SELECT COUNT(*) FROM attendance a
   JOIN employees e ON a.employee_id = e.id
   WHERE a.device_log_id IS NOT NULL
     AND a.device_log_id != ''
     AND a.device_log_id != e.employee_id) AS mismatches;
