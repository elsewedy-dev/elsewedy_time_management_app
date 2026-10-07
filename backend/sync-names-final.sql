-- Step 1: Fix TEMP_ASHENAFI -> correct employeeId from device (userId=75 = Ashenafi kIfle)
-- 75 is taken by Amare Mekonen Getahun who should be at 28
-- First move 75 to temp
UPDATE employees SET employee_id = 'TEMP_75' WHERE employee_id = '75';
-- Move TEMP_ASHENAFI to 75
UPDATE employees SET employee_id = '75' WHERE employee_id = 'TEMP_ASHENAFI';
-- Move old 75 (Amare Mekonen Getahun) — device says userId=28 is Amare Mekonen Getahun
-- but 28 already exists. Check: Amare at 75 is a duplicate of Amare at 28
-- Just give it a safe unique ID based on biometric
UPDATE employees SET employee_id = CONCAT('DUP_', biometric_id::text) WHERE employee_id = 'TEMP_75';

-- Step 2: Update all employee names to match device authoritative map
-- Only update if name differs (use XFace Pro as truth)
UPDATE employees SET first_name = 'Estifanos',  last_name = 'Alemayehu'       WHERE employee_id = '1'     AND (first_name != 'Estifanos'  OR COALESCE(last_name,'') != 'Alemayehu');
UPDATE employees SET first_name = 'Abebe',      last_name = 'Tolani Erena'    WHERE employee_id = '2'     AND (first_name != 'Abebe'      OR COALESCE(last_name,'') != 'Tolani Erena');
UPDATE employees SET first_name = 'Luffy',      last_name = ''                WHERE employee_id = '4'     AND first_name != 'Luffy';
UPDATE employees SET first_name = 'Isam',       last_name = ''                WHERE employee_id = '5'     AND first_name != 'Isam';
UPDATE employees SET first_name = 'Testtt',     last_name = ''                WHERE employee_id = '6'     AND first_name != 'Testtt';
UPDATE employees SET first_name = 'Sophia',     last_name = 'Awol'            WHERE employee_id = '7'     AND first_name != 'Sophia';
UPDATE employees SET first_name = 'Medina',     last_name = 'Hussien'         WHERE employee_id = '8'     AND first_name != 'Medina';
UPDATE employees SET first_name = 'Mahlet',     last_name = 'Zikarege'        WHERE employee_id = '9'     AND first_name != 'Mahlet';
UPDATE employees SET first_name = 'Henok',      last_name = ''                WHERE employee_id = '10'    AND first_name != 'Henok';
UPDATE employees SET first_name = 'Biyadglegn', last_name = 'Teklehiwot'      WHERE employee_id = '11'    AND first_name != 'Biyadglegn';
UPDATE employees SET first_name = 'Hamdiya',    last_name = 'Negash'          WHERE employee_id = '12'    AND first_name != 'Hamdiya';
UPDATE employees SET first_name = 'Emebet',     last_name = 'Abera'           WHERE employee_id = '13'    AND first_name != 'Emebet';
UPDATE employees SET first_name = 'Blein',      last_name = 'Mekonen'         WHERE employee_id = '14'    AND first_name != 'Blein';
UPDATE employees SET first_name = 'Tezera',     last_name = 'Bekele'          WHERE employee_id = '15'    AND first_name != 'Tezera';
UPDATE employees SET first_name = 'Kalkidan',   last_name = 'Adane'           WHERE employee_id = '16'    AND first_name != 'Kalkidan';
UPDATE employees SET first_name = 'Timket',     last_name = 'Desalegne'       WHERE employee_id = '17'    AND first_name != 'Timket';
UPDATE employees SET first_name = 'Isa',        last_name = ''                WHERE employee_id = '19'    AND first_name != 'Isa';
UPDATE employees SET first_name = 'Amare',      last_name = 'Mekonen Getahun' WHERE employee_id = '28'    AND first_name != 'Amare';
UPDATE employees SET first_name = 'Biruk',      last_name = 'F/Yohanes'       WHERE employee_id = '30'    AND first_name != 'Biruk';
UPDATE employees SET first_name = 'Sintayehu',  last_name = 'Tesgaye'         WHERE employee_id = '31'    AND first_name != 'Sintayehu';
UPDATE employees SET first_name = 'Dagne',      last_name = 'Teshome'         WHERE employee_id = '32'    AND first_name != 'Dagne';
UPDATE employees SET first_name = 'Seblework',  last_name = 'Kebede'          WHERE employee_id = '33'    AND first_name != 'Seblework';
UPDATE employees SET first_name = 'Mekdes',     last_name = 'Dabi'            WHERE employee_id = '35'    AND first_name != 'Mekdes';
UPDATE employees SET first_name = 'Eskedar',    last_name = 'Bekele'          WHERE employee_id = '36'    AND first_name != 'Eskedar';
UPDATE employees SET first_name = 'Daniel',     last_name = 'Dadi'            WHERE employee_id = '38'    AND first_name != 'Daniel';
UPDATE employees SET first_name = 'Yosef',      last_name = 'Belew'           WHERE employee_id = '39'    AND first_name != 'Yosef';
UPDATE employees SET first_name = 'Bizuye',     last_name = 'Endris'          WHERE employee_id = '40'    AND first_name != 'Bizuye';
UPDATE employees SET first_name = 'Bizunesh',   last_name = 'Asfaw'           WHERE employee_id = '41'    AND first_name != 'Bizunesh';
UPDATE employees SET first_name = 'Delesa',     last_name = 'Olkeba'          WHERE employee_id = '42'    AND first_name != 'Delesa';
UPDATE employees SET first_name = 'Zenebe',     last_name = 'Bekele'          WHERE employee_id = '43'    AND first_name != 'Zenebe';
UPDATE employees SET first_name = 'Lejalem',    last_name = 'Geneta'          WHERE employee_id = '44'    AND first_name != 'Lejalem';
UPDATE employees SET first_name = 'Getenesh',   last_name = 'Sheberu'         WHERE employee_id = '45'    AND first_name != 'Getenesh';
UPDATE employees SET first_name = 'Mariam',     last_name = 'Umer'            WHERE employee_id = '46'    AND first_name != 'Mariam';
UPDATE employees SET first_name = 'Abeya',      last_name = 'Mosisa'          WHERE employee_id = '47'    AND first_name != 'Abeya';
UPDATE employees SET first_name = 'Amanuel',    last_name = 'kebede'          WHERE employee_id = '48'    AND first_name != 'Amanuel';
UPDATE employees SET first_name = 'Ashebir',    last_name = 'Getachew'        WHERE employee_id = '49'    AND first_name != 'Ashebir';
UPDATE employees SET first_name = 'Dame',       last_name = 'Getahun'         WHERE employee_id = '50'    AND first_name != 'Dame';
UPDATE employees SET first_name = 'Damtew',     last_name = 'Shewangizaw'     WHERE employee_id = '51'    AND first_name != 'Damtew';
UPDATE employees SET first_name = 'Daniel',     last_name = 'Tadesse'         WHERE employee_id = '52'    AND first_name != 'Daniel';
UPDATE employees SET first_name = 'Demelash',   last_name = 'Alemayehu'       WHERE employee_id = '53'    AND first_name != 'Demelash';
UPDATE employees SET first_name = 'Derbu',      last_name = 'Alemu'           WHERE employee_id = '54'    AND first_name != 'Derbu';
UPDATE employees SET first_name = 'Ermias',     last_name = 'Sisay'           WHERE employee_id = '55'    AND first_name != 'Ermias';
UPDATE employees SET first_name = 'Getu',       last_name = 'Nemomsa'         WHERE employee_id = '56'    AND first_name != 'Getu';
UPDATE employees SET first_name = 'Insermu',    last_name = 'kumalo'          WHERE employee_id = '57'    AND first_name != 'Insermu';
UPDATE employees SET first_name = 'Jelan',      last_name = 'Hamda'           WHERE employee_id = '58'    AND first_name != 'Jelan';
UPDATE employees SET first_name = 'Kaleb',      last_name = 'Girma'           WHERE employee_id = '59'    AND first_name != 'Kaleb';
UPDATE employees SET first_name = 'Kebeso',     last_name = 'Yadesa'          WHERE employee_id = '60'    AND first_name != 'Kebeso';
UPDATE employees SET first_name = 'Milkiayas',  last_name = 'Berta'           WHERE employee_id = '61'    AND first_name != 'Milkiayas';
UPDATE employees SET first_name = 'Mohammed',   last_name = 'Nura'            WHERE employee_id = '62'    AND first_name != 'Mohammed';
UPDATE employees SET first_name = 'Muhdin',     last_name = 'Adem'            WHERE employee_id = '63'    AND first_name != 'Muhdin';
UPDATE employees SET first_name = 'Nuredin',    last_name = 'Mohammed'        WHERE employee_id = '64'    AND first_name != 'Nuredin';
UPDATE employees SET first_name = 'Sewnet',     last_name = 'Tesfaye'         WHERE employee_id = '65'    AND first_name != 'Sewnet';
UPDATE employees SET first_name = 'Gotomsa',    last_name = 'Lema'            WHERE employee_id = '66'    AND first_name != 'Gotomsa';
UPDATE employees SET first_name = 'Tariku',     last_name = 'Yigletu'         WHERE employee_id = '67'    AND first_name != 'Tariku';
UPDATE employees SET first_name = 'Taye',       last_name = 'Bulbula'         WHERE employee_id = '68'    AND first_name != 'Taye';
UPDATE employees SET first_name = 'Tesfaye',    last_name = 'Gebreyes'        WHERE employee_id = '69'    AND first_name != 'Tesfaye';
UPDATE employees SET first_name = 'Fekadu',     last_name = 'Chala'           WHERE employee_id = '70'    AND first_name != 'Fekadu';
UPDATE employees SET first_name = 'Gemechu',    last_name = 'Abebe'           WHERE employee_id = '71'    AND first_name != 'Gemechu';
UPDATE employees SET first_name = 'Netsanet',   last_name = 'Abera'           WHERE employee_id = '72'    AND first_name != 'Netsanet';
UPDATE employees SET first_name = 'Alemseged',  last_name = 'Bezabih'         WHERE employee_id = '73'    AND first_name != 'Alemseged';
UPDATE employees SET first_name = 'Ashenafi',   last_name = 'Alemayehu'       WHERE employee_id = '74'    AND first_name != 'Ashenafi';
UPDATE employees SET first_name = 'Ashenafi',   last_name = 'kIfle'           WHERE employee_id = '75'    AND (first_name != 'Ashenafi' OR COALESCE(last_name,'') != 'kIfle');
UPDATE employees SET first_name = 'Esayas',     last_name = 'Webishet'        WHERE employee_id = '76'    AND first_name != 'Esayas';
UPDATE employees SET first_name = 'Getachew',   last_name = 'Wodajo'          WHERE employee_id = '77'    AND (first_name != 'Getachew' OR COALESCE(last_name,'') != 'Wodajo');
UPDATE employees SET first_name = 'Getachew',   last_name = 'Wodajo Ejersa'   WHERE employee_id = '78'    AND (first_name != 'Getachew' OR COALESCE(last_name,'') != 'Wodajo Ejersa');
UPDATE employees SET first_name = 'Kassahun',   last_name = 'Girma'           WHERE employee_id = '79'    AND first_name != 'Kassahun';
UPDATE employees SET first_name = 'Muktar',     last_name = 'Kelilo'          WHERE employee_id = '80'    AND first_name != 'Muktar';
UPDATE employees SET first_name = 'Ashenafi',   last_name = 'Tiku'            WHERE employee_id = '83'    AND (first_name != 'Ashenafi' OR COALESCE(last_name,'') != 'Tiku');
UPDATE employees SET first_name = 'Henok',      last_name = 'Tadesse'         WHERE employee_id = '95'    AND (first_name != 'Henok' OR COALESCE(last_name,'') != 'Tadesse');
UPDATE employees SET first_name = 'Adnew',      last_name = 'Tezera'          WHERE employee_id = '105'   AND first_name != 'Adnew';
UPDATE employees SET first_name = 'Dereje',     last_name = 'Wolde Mariam'    WHERE employee_id = '108'   AND (first_name != 'Dereje' OR COALESCE(last_name,'') != 'Wolde Mariam');
UPDATE employees SET first_name = 'Hussein',    last_name = 'Mohammed'        WHERE employee_id = '110'   AND first_name != 'Hussein';
UPDATE employees SET first_name = 'Estifanos',  last_name = 'Alemayehu'       WHERE employee_id = '132'   AND first_name != 'Estifanos';
UPDATE employees SET first_name = 'Azeb',       last_name = 'Kebede'          WHERE employee_id = '133'   AND first_name != 'Azeb';
UPDATE employees SET first_name = 'Seada',      last_name = 'Akmel'           WHERE employee_id = '134'   AND first_name != 'Seada';
UPDATE employees SET first_name = 'Natan',      last_name = 'Alene'           WHERE employee_id = '12341' AND first_name != 'Natan';
UPDATE employees SET first_name = 'Nafenati',   last_name = 'Ayano'           WHERE employee_id = '12342' AND first_name != 'Nafenati';
UPDATE employees SET first_name = 'Liya',       last_name = 'Shewangizaw'     WHERE employee_id = '12343' AND first_name != 'Liya';
UPDATE employees SET first_name = 'Mahlet',     last_name = 'Zekarge'         WHERE employee_id = '12346' AND first_name != 'Mahlet';
UPDATE employees SET first_name = 'Software',   last_name = 'Admin-Estifanos' WHERE employee_id = '12356' AND first_name != 'Software';
UPDATE employees SET first_name = 'Nejat',      last_name = 'Ebrahim'         WHERE employee_id = '12359' AND first_name != 'Nejat';
UPDATE employees SET first_name = 'Markos',     last_name = 'H/yohanes'       WHERE employee_id = '12360' AND first_name != 'Markos';
UPDATE employees SET first_name = 'Hirut',      last_name = 'Demise'          WHERE employee_id = '12361' AND first_name != 'Hirut';

-- Step 3: Delete duplicate employees (DUP_ prefix or employees with same name and no attendance)
DELETE FROM attendance WHERE employee_id IN (SELECT id FROM employees WHERE employee_id LIKE 'DUP_%');
DELETE FROM employees WHERE employee_id LIKE 'DUP_%';

-- Step 4: Fix attendance mismatches
DELETE FROM attendance a
WHERE a.device_log_id IS NOT NULL AND a.device_log_id != ''
  AND EXISTS (
    SELECT 1 FROM employees e WHERE e.employee_id = a.device_log_id
      AND e.id != a.employee_id
      AND EXISTS (
        SELECT 1 FROM attendance a2 WHERE a2.employee_id = e.id AND a2.date = a.date AND a2.id != a.id
      )
  );

UPDATE attendance a SET employee_id = e.id
FROM employees e
WHERE a.device_log_id = e.employee_id
  AND a.employee_id != e.id;

DELETE FROM attendance
WHERE device_log_id IS NOT NULL AND device_log_id != ''
  AND NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = attendance.device_log_id);

-- Final verification
SELECT
  (SELECT COUNT(*) FROM employees) AS total_employees,
  (SELECT COUNT(*) FROM attendance) AS total_attendance,
  (SELECT COUNT(*) FROM attendance a
   JOIN employees e ON a.employee_id = e.id
   WHERE a.device_log_id IS NOT NULL
     AND a.device_log_id != ''
     AND a.device_log_id != e.employee_id) AS remaining_mismatches;
