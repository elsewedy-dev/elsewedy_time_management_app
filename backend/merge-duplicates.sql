DO $do$
DECLARE
  dup RECORD;
  keep_id UUID;
  del_id UUID;
BEGIN
  FOR dup IN
    SELECT e1.id as id1, e2.id as id2,
      (SELECT COUNT(*) FROM attendance WHERE employee_id = e1.id) as att1,
      (SELECT COUNT(*) FROM attendance WHERE employee_id = e2.id) as att2
    FROM employees e1
    JOIN employees e2 ON e1.employee_id = e2.employee_id AND e1.id < e2.id
  LOOP
    IF dup.att1 >= dup.att2 THEN
      keep_id := dup.id1;
      del_id := dup.id2;
    ELSE
      keep_id := dup.id2;
      del_id := dup.id1;
    END IF;
    
    -- Re-link attendance from del to keep (where no date conflict)
    UPDATE attendance SET employee_id = keep_id 
    WHERE employee_id = del_id 
    AND NOT EXISTS (
      SELECT 1 FROM attendance a2 
      WHERE a2.employee_id = keep_id AND a2.date = attendance.date AND a2.id != attendance.id
    );
    
    -- Delete remaining attendance for del_id (conflicts with keep_id on same date)
    DELETE FROM attendance WHERE employee_id = del_id;
    
    -- Delete the duplicate employee
    DELETE FROM employees WHERE id = del_id;
    
    RAISE NOTICE 'Merged: kept %, deleted %', keep_id, del_id;
  END LOOP;
END $do$;
