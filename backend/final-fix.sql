-- Rebuild attendance employee links from scratch
-- Strategy: for each (device_log_id, date) group, keep only ONE record
-- (the one with check_in_time, or the earliest created), then link to correct employee

-- Step 1: Create a mapping of device_log_id -> correct employee UUID
CREATE TEMP TABLE emp_map AS
SELECT employee_id AS log_id, id AS correct_uuid
FROM employees
WHERE employee_id IS NOT NULL;

-- Step 2: For each (device_log_id, date), identify the ONE record to keep
-- Prefer records that already have check_in_time, then earliest by id
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
  a.raw_log_data
FROM attendance a
JOIN emp_map m ON a.device_log_id = m.log_id
ORDER BY m.correct_uuid, a.date,
  (CASE WHEN a.check_in_time IS NOT NULL THEN 0 ELSE 1 END),
  a.id;

-- Step 3: Delete ALL attendance records that have a device_log_id mapping
DELETE FROM attendance
WHERE device_log_id IS NOT NULL
  AND device_log_id != ''
  AND EXISTS (SELECT 1 FROM emp_map WHERE log_id = attendance.device_log_id);

-- Step 4: Re-insert the kept records with the correct employee UUID
INSERT INTO attendance (
  id, employee_id, device_id, date,
  check_in_time, check_out_time, status,
  verification_method, device_log_id, raw_log_data,
  created_at, updated_at
)
SELECT
  att_id, correct_uuid, device_id, date,
  check_in_time, check_out_time, status,
  verification_method, device_log_id, raw_log_data,
  NOW(), NOW()
FROM records_to_keep;

-- Step 5: Clean up
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
     AND a.device_log_id != e.employee_id) AS remaining_mismatches;
