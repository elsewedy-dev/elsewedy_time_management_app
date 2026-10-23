-- TEMP_MEDINA2 is a duplicate of employeeId=8 (Medina Hussien already correct there)
-- Just delete the temp duplicate after re-linking its attendance to the real one
UPDATE attendance SET employee_id = (SELECT id FROM employees WHERE employee_id = '8' LIMIT 1)
WHERE employee_id = (SELECT id FROM employees WHERE employee_id = 'TEMP_MEDINA2' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM attendance a2
    WHERE a2.employee_id = (SELECT id FROM employees WHERE employee_id = '8' LIMIT 1)
      AND a2.date = attendance.date
  );
DELETE FROM attendance WHERE employee_id = (SELECT id FROM employees WHERE employee_id = 'TEMP_MEDINA2' LIMIT 1);
DELETE FROM employees WHERE employee_id = 'TEMP_MEDINA2';

-- TEMP_JELAN2 (Jelan Hamda) — on XFace Pro userId=58 = Jelan Hamda
-- But 58 = Ashenafi kIfle. Check device: XFace Pro uid=13 userId=58 = Jelan Hamda
-- Ashenafi kIfle is userId=75 on XFace Pro, so move Ashenafi to 75
UPDATE employees SET employee_id = 'TEMP_ASHENAFI2' WHERE employee_id = '58' AND first_name = 'Ashenafi' AND last_name = 'kIfle';
UPDATE employees SET employee_id = '58', first_name = 'Jelan', last_name = 'Hamda' WHERE employee_id = 'TEMP_JELAN2';
UPDATE employees SET employee_id = '75' WHERE employee_id = 'TEMP_ASHENAFI2';

-- Re-link attendance
UPDATE attendance a SET employee_id = e.id
FROM employees e
WHERE a.device_log_id = e.employee_id
  AND a.employee_id != e.id
  AND NOT EXISTS (
    SELECT 1 FROM attendance a2
    WHERE a2.employee_id = e.id AND a2.date = a.date AND a2.id != a.id
  );

DELETE FROM attendance a
WHERE a.device_log_id IS NOT NULL AND a.device_log_id != ''
  AND EXISTS (
    SELECT 1 FROM employees e WHERE e.employee_id = a.device_log_id AND e.id != a.employee_id
  );

UPDATE attendance a SET employee_id = e.id
FROM employees e
WHERE a.device_log_id = e.employee_id AND a.employee_id != e.id;

-- Verify key employees
SELECT employee_id, first_name, last_name FROM employees
WHERE employee_id IN ('8','10','58','75','129') OR employee_id LIKE 'TEMP%'
ORDER BY employee_id;

SELECT COUNT(*) as mismatches FROM attendance a JOIN employees e ON a.employee_id = e.id
WHERE a.device_log_id IS NOT NULL AND a.device_log_id != '' AND a.device_log_id != e.employee_id;
