-- Fix userId=10: should be Henok (XFace Pro is authoritative)
-- Fix userId=129: should be Getahun Tegene (XFace Pro is authoritative)

-- Step 1: Rename Jelan Hamda (currently wrongly at employeeId=10) to a temp
UPDATE employees SET employee_id = 'TEMP_JELAN2' WHERE employee_id = '10' AND first_name = 'Jelan';

-- Step 2: Rename Medina Hussien (currently wrongly at employeeId=129) to a temp
UPDATE employees SET employee_id = 'TEMP_MEDINA2' WHERE employee_id = '129' AND first_name = 'Medina';

-- Step 3: Find Henok and set to 10
-- Henok may be at a different employeeId now
UPDATE employees SET employee_id = '10' WHERE first_name = 'Henok' AND last_name = '' AND employee_id != '10';

-- Step 4: Find Getahun Tegene and set to 129
UPDATE employees SET employee_id = '129' WHERE first_name = 'Getahun' AND last_name = 'Tegene' AND employee_id != '129';

-- Step 5: Give Jelan Hamda the correct employeeId (userId=58 on XFace Pro)
UPDATE employees SET employee_id = '58', first_name = 'Jelan', last_name = 'Hamda'
WHERE employee_id = 'TEMP_JELAN2';

-- Step 6: Give Medina Hussien the correct employeeId (userId=8 on XFace Pro)
UPDATE employees SET employee_id = '8', first_name = 'Medina', last_name = 'Hussien'
WHERE employee_id = 'TEMP_MEDINA2';

-- Step 7: Re-link all attendance records to correct employees
UPDATE attendance a SET employee_id = e.id
FROM employees e
WHERE a.device_log_id = e.employee_id
  AND a.employee_id != e.id
  AND NOT EXISTS (
    SELECT 1 FROM attendance a2
    WHERE a2.employee_id = e.id AND a2.date = a.date AND a2.id != a.id
  );

-- Delete conflicting (same employee+date already exists for correct employee)
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
SELECT employee_id, first_name, last_name FROM employees WHERE employee_id IN ('8','10','58','129') ORDER BY employee_id::integer;
SELECT COUNT(*) as mismatches FROM attendance a JOIN employees e ON a.employee_id = e.id
WHERE a.device_log_id IS NOT NULL AND a.device_log_id != '' AND a.device_log_id != e.employee_id;
