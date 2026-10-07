INSERT INTO employees (id, employee_id, first_name, last_name, biometric_id, hire_date, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), '1',     'Estifanos',  'Alemayehu',       105, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '4',     'Luffy',      '',                130, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '5',     'Isam',       '',                127, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '6',     'Testtt',     '',                128, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '8',     'Medina',     'Hussien',         108, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '9',     'Mahlet',     'Zikarege',        109, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '12',    'Hamdiya',    'Negash',          111, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '33',    'Seblework',  'Kebede',          95,  NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '36',    'Eskedar',    'Bekele',          117, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '40',    'Bizuye',     'Endris',          118, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '41',    'Bizunesh',   'Asfaw',           119, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '43',    'Zenebe',     'Bekele',          124, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '44',    'Lejalem',    'Geneta',          125, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '45',    'Getenesh',   'Sheberu',         96,  NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '12354', 'Bereket',    'Bogale',          121, NOW(), true, NOW(), NOW()),
  (gen_random_uuid(), '12355', 'Insermu',    'Kumela',          12,  NOW(), true, NOW(), NOW())
ON CONFLICT DO NOTHING;
