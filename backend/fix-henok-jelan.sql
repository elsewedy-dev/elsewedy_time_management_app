-- Swap Henok (12358->10) and Jelan (10->58)
-- Use temp IDs to avoid unique constraint conflict

-- Step 1: Move current empId=10 (Jelan, wrong) to temp
UPDATE employees SET employee_id = 'TEMP_JELAN' WHERE employee_id = '10';

-- Step 2: Move Henok from 12358 to 10
UPDATE employees SET employee_id = '10', first_name = 'Henok', last_name = '' WHERE employee_id = '12358' AND first_name = 'Henok';

-- Step 3: Move Jelan from TEMP to 58 (overwrite the wrong Ashenafi kIfle at 58)
-- First check what's at 58
-- Ashenafi kIfle at 58 is wrong — on XFace Pro userId=58 is Jelan Hamda
UPDATE employees SET employee_id = 'TEMP_ASHENAFI' WHERE employee_id = '58';
UPDATE employees SET employee_id = '58', first_name = 'Jelan', last_name = 'Hamda' WHERE employee_id = 'TEMP_JELAN';

-- Step 4: Fix Ashenafi kIfle — on XFace Pro userId=75 is Ashenafi kIfle
UPDATE employees SET employee_id = '75' WHERE employee_id = 'TEMP_ASHENAFI';

-- Step 5: Re-link all attendance
UPDATE attendance a SET employee_id = e.id
FROM employees e
WHERE a.device_log_id = e.employee_id
  AND a.employee_id != e.id
  AND NOT EXISTS (
    SELECT 1 FROM attendance a2 WHERE a2.employee_id = e.id AND a2.date = a.date AND a2.id != a.id
  );

-- Delete conflicts
DELETE FROM attendance a
WHERE a.device_log_id IS NOT NULL AND a.device_log_id != ''
  AND EXISTS (
    SELECT 1 FROM employees e WHERE e.employee_id = a.device_log_id
      AND e.id != a.employee_id
  );

-- Final re-link
UPDATE attendance a SET employee_id = e.id
FROM employees e
WHERE a.device_log_id = e.employee_id
  AND a.employee_id != e.id;

-- Verify
SELECT employee_id, first_name, last_name FROM employees WHERE employee_id IN ('10','58','75') ORDER BY employee_id;
SELECT COUNT(*) as mismatches FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.device_log_id IS NOT NULL AND a.device_log_id != '' AND a.device_log_id != e.employee_id;
