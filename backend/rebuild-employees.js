/**
 * Rebuild employees from device data using userId as the canonical key.
 * Both devices share the same userId namespace.
 * XFace Pro (10.201.1.199) is the primary device — its names take precedence.
 */
import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from './config/database.js';

async function main() {
  await sequelize.authenticate();
  console.log('Connected\n');

  // Full device data - XFace Pro is primary, HR Gate fills in missing
  // Format: [userId, firstName, lastName]
  const deviceUsers = [
    // === XFace Pro users (primary) ===
    ['1',     'Estifanos',  'Alemayehu'],
    ['2',     'Abebe',      'Tolani Erena'],
    ['4',     'Luffy',      ''],
    ['5',     'Isam',       ''],
    ['6',     'Testtt',     ''],
    ['7',     'Sophia',     'Awol'],
    ['8',     'Medina',     'Hussien'],
    ['9',     'Mahlet',     'Zikarege'],
    ['10',    'Henok',      ''],
    ['11',    'Biyadglegn', 'Teklehiwot'],
    ['12',    'Hamdiya',    'Negash'],
    ['13',    'Emebet',     'Abera'],
    ['14',    'Blein',      'Mekonen'],
    ['15',    'Tezera',     'Bekele'],
    ['16',    'Kalkidan',   'Adane'],
    ['17',    'Timket',     'Desalegne'],
    ['19',    'Isa',        ''],
    ['28',    'Amare',      'Mekonen Getahun'],
    ['30',    'Biruk',      'F/Yohanes'],
    ['31',    'Sintayehu',  'Tesgaye'],
    ['32',    'Dagne',      'Teshome'],
    ['33',    'Seblework',  'Kebede'],
    ['35',    'Mekdes',     'Dabi'],
    ['36',    'Eskedar',    'Bekele'],
    ['38',    'Daniel',     'Dadi'],
    ['39',    'Yosef',      'Belew'],
    ['40',    'Bizuye',     'Endris'],
    ['41',    'Bizunesh',   'Asfaw'],
    ['42',    'Delesa',     'Olkeba'],
    ['43',    'Zenebe',     'Bekele'],
    ['44',    'Lejalem',    'Geneta'],
    ['45',    'Getenesh',   'Sheberu'],
    ['46',    'Mariam',     'Umer'],
    ['47',    'Abeya',      'Mosisa'],
    ['48',    'Amanuel',    'kebede'],
    ['49',    'Ashebir',    'Getachew'],
    ['50',    'Dame',       'Getahun'],
    ['51',    'Damtew',     'Shewangizaw'],
    ['52',    'Daniel',     'Tadesse'],
    ['53',    'Demelash',   'Alemayehu'],
    ['54',    'Derbu',      'Alemu'],
    ['55',    'Ermias',     'Sisay'],
    ['56',    'Getu',       'Nemomsa'],
    ['57',    'Insermu',    'kumalo'],
    ['58',    'Jelan',      'Hamda'],
    ['59',    'Kaleb',      'Girma'],
    ['60',    'Kebeso',     'Yadesa'],
    ['61',    'Milkiayas',  'Berta'],
    ['62',    'Mohammed',   'Nura'],
    ['63',    'Muhdin',     'Adem'],
    ['64',    'Nuredin',    'Mohammed'],
    ['65',    'Sewnet',     'Tesfaye'],
    ['66',    'Gotomsa',    'Lema'],
    ['67',    'Tariku',     'Yigletu'],
    ['68',    'Taye',       'Bulbula'],
    ['69',    'Tesfaye',    'Gebreyes'],
    ['70',    'Fekadu',     'Chala'],
    ['71',    'Gemechu',    'Abebe'],
    ['72',    'Netsanet',   'Abera'],
    ['73',    'Alemseged',  'Bezabih'],
    ['74',    'Ashenafi',   'Alemayehu'],
    ['75',    'Ashenafi',   'kIfle'],
    ['76',    'Esayas',     'Webishet'],
    ['77',    'Getachew',   'Wodajo'],
    ['78',    'Getachew',   'Wodajo Ejersa'],
    ['79',    'Kassahun',   'Girma'],
    ['80',    'Muktar',     'Kelilo'],
    ['81',    'Negash',     'Tolosa'],
    ['82',    'Yasin',      'Mohammed'],
    ['83',    'Ashenafi',   'Tiku'],
    ['84',    'Biniam',     'Seifu'],
    ['85',    'Bisrat',     'Tesfu'],
    ['86',    'Debalke',    'Getachew'],
    ['87',    'Dereje',     'Abiti'],
    ['88',    'Desalegn',   'Mola'],
    ['89',    'Ephrem',     'Girma'],
    ['90',    'Eshetu',     'Tesfaye'],
    ['91',    'Fekadu',     'Chala'],
    ['92',    'Firaol',     'fufa'],
    ['93',    'Gashaw',     'Taddese'],
    ['94',    'Guluma',     'Mulu'],
    ['95',    'Henok',      'Tadesse'],
    ['96',    'Kefeyalew',  'Kebede'],
    ['97',    'Mengistu',   'Bereda'],
    ['98',    'Nebiyu',     'Eyasu'],
    ['99',    'Robel',      'Gemechu'],
    ['100',   'Tadele',     'Lema'],
    ['101',   'Tadesse',    'Bekele'],
    ['102',   'Taye',       'Nedi'],
    ['103',   'Yabsira',    'Dejazmach'],
    ['104',   'Zelalem',    'Fekadu'],
    ['105',   'Adnew',      'Tezera'],
    ['106',   'Asfaw',      'Bedru'],
    ['107',   'Bogale',     'Alemayehu'],
    ['108',   'Dereje',     'Wolde Mariam'],
    ['109',   'Derese',     'Kibru'],
    ['110',   'Hussein',    'Mohammed'],
    ['111',   'Jafar',      'Abdela'],
    ['112',   'Mulugeta',   'Belay'],
    ['113',   'Yared',      'Getachew'],
    ['114',   'Kibreyihun', 'Mitku'],
    ['115',   'Eyob',       'Gutu'],
    ['116',   'Desalegn',   'Zewdie'],
    ['118',   'Mohamed',    'Ali'],
    ['119',   'Mulugeta',   'worku'],
    ['120',   'Abnet',      'Eyasu'],
    ['121',   'Amare',      'Tsegaye'],
    ['122',   'Bereket',    'Bogale'],
    ['123',   'Asefa',      'Alemu'],
    ['124',   'Ayele',      'Girma'],
    ['125',   'Besufekad',  'Boru'],
    ['126',   'Dereje',     'Melese'],
    ['127',   'Ermiyas',    'Fekadu'],
    ['128',   'Esayas',     'Mulugeta'],
    ['129',   'Getahun',    'Tegene'],
    ['130',   'Tamene',     'woyessa'],
    ['131',   'Tsegaye',    'Kebede'],
    ['132',   'Estifanos',  'Alemayehu'],
    ['133',   'Azeb',       'Kebede'],
    ['134',   'Seada',      'Akmel'],
    ['12341', 'Natan',      'Alene'],
    ['12342', 'Nafenati',   'Ayano'],
    ['12343', 'Liya',       'Shewangizaw'],
    ['12345', 'Getenesh',   'Shiberu'],
    ['12346', 'Mahlet',     'Zekarge'],
    ['12347', 'Eskedar',    'Bekele'],
    ['12348', 'Lijalem',    'Geneta'],
    ['12349', 'Bizuye',     'idris'],
    ['12350', 'Bizunesh',   'Asfaw'],
    ['12351', 'Alemseged',  'Bezabeh'],
    ['12352', 'Seblework',  'Kebede'],
    ['12353', 'Abnet',      'Eyasu'],
    ['12354', 'Bereket',    'Bogale'],
    ['12355', 'Insermu',    'Kumela'],
    ['12356', 'Software',   'Admin-Estifanos'],
    ['12358', 'Zenebe',     'Bekele'],
    ['12359', 'Nejat',      'Ebrahim'],
    ['12360', 'Markos',     'H/yohanes'],
    ['12361', 'Hirut',      'Demise'],
  ];

  let updated = 0;
  let notFound = 0;

  for (const [userId, firstName, lastName] of deviceUsers) {
    // Skip number-only names
    if (!firstName || /^\d+$/.test(firstName)) continue;

    const [rows] = await sequelize.query(
      'SELECT id, first_name, last_name FROM employees WHERE employee_id = :uid',
      { replacements: { uid: userId } }
    );

    if (rows.length === 0) {
      notFound++;
      continue;
    }

    const emp = rows[0];
    // Only update if name looks wrong (numeric or empty)
    const currentName = emp.first_name || '';
    if (/^\d+$/.test(currentName) || currentName.trim() === '') {
      await sequelize.query(
        'UPDATE employees SET first_name = :fn, last_name = :ln WHERE id = :id',
        { replacements: { fn: firstName, ln: lastName, id: emp.id } }
      );
      console.log(`Fixed: empId=${userId} [${currentName}] -> ${firstName} ${lastName}`);
      updated++;
    }
  }

  console.log(`\nFixed ${updated} employee names, ${notFound} userId not in DB`);

  // Final check
  const [numericNames] = await sequelize.query(
    "SELECT employee_id, first_name FROM employees WHERE first_name ~ '^[0-9]+$'"
  );
  if (numericNames.length > 0) {
    console.log('\nStill have numeric names:');
    for (const n of numericNames) {
      console.log(`  empId=${n.employee_id} name=${n.first_name}`);
    }
  } else {
    console.log('\nAll employee names are correct.');
  }

  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
