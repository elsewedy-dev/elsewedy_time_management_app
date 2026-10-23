-- Fix duplicate unique constraints on employee_id (drop via constraints, not indexes)
DO $$
DECLARE r RECORD;
  kept BOOLEAN := false;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'employees'::regclass
      AND contype = 'u'
      AND conname LIKE '%employee_id%'
    ORDER BY conname
  LOOP
    IF NOT kept THEN
      kept := true;
    ELSE
      EXECUTE 'ALTER TABLE employees DROP CONSTRAINT IF EXISTS ' || r.conname;
    END IF;
  END LOOP;
END $$;

-- Verify triggers exist
SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgname IN ('trg_protect_employee_name','trg_protect_employee_id','trg_protect_attendance_link');
