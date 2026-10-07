-- Step 1: Re-link attendance to correct employee where no date conflict
UPDATE attendance a
SET employee_id = e.id
FROM employees e
WHERE a.device_log_id = e.employee_id
  AND a.employee_id != e.id
  AND NOT EXISTS (
    SELECT 1 FROM attendance a2
    WHERE a2.employee_id = e.id AND a2.date = a.date AND a2.id != a.id
  );

-- Step 2: Delete records where correct employee already has a record for that date (conflicts)
DELETE FROM attendance a
WHERE EXISTS (
  SELECT 1 FROM employees e
  WHERE a.device_log_id = e.employee_id
    AND a.employee_id != e.id
    AND EXISTS (
      SELECT 1 FROM attendance a2
      WHERE a2.employee_id = e.id AND a2.date = a.date AND a2.id != a.id
    )
);
