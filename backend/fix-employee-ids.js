/**
 * Fix employee IDs to use userId (real company ID from ZKTeco)
 * instead of uid (internal slot number).
 *
 * uid  = internal slot (used in attendance logs for matching)
 * userId = the real ID assigned when enrolling on the device
 *
 * biometricId stays as uid (attendance logs reference uid)
 * employeeId  becomes userId (real company ID)
 */
import dotenv from 'dotenv';
dotenv.config();

import ZKTeco from 'zkteco-js';
import { sequelize } from './config/database.js';
import { Employee } from './models/Employee.js';

const DEVICE_IP = '10.201.1.197';
const DEVICE_PORT = 4370;

async function fixEmployeeIds() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Pull all users from ZKTeco device
    console.log('Connecting to ZKTeco device...');
    const zk = new ZKTeco(DEVICE_IP, DEVICE_PORT, 5200, 10000);
    await zk.createSocket();
    console.log('✅ Connected');
    const { data: users } = await zk.getUsers();
    await zk.disconnect();
    console.log(`✅ Got ${users.length} users from device\n`);

    let updated = 0;
    let notFound = 0;

    for (const user of users) {
      // uid  = slot number (what attendance logs use)
      // userId = real company ID set during enrollment
      const uid = user.uid;
      const userId = user.userId?.toString().trim();

      if (!userId) continue;

      // Find employee by biometricId (uid) — this is always correct
      const employee = await Employee.findOne({ where: { biometricId: uid } });

      if (!employee) {
        console.log(`  ⚠️  No employee found for uid=${uid} (${user.name})`);
        notFound++;
        continue;
      }

      const oldId = employee.employeeId;

      if (oldId !== userId) {
        try {
          await employee.update({ employeeId: userId });
          console.log(`  ✅ uid=${uid} | ${user.name} | ${oldId} → ${userId}`);
          updated++;
        } catch (updateErr) {
          // Duplicate userId — append uid to make it unique
          const fallback = `${userId}-${uid}`;
          await employee.update({ employeeId: fallback });
          console.log(`  ⚠️  uid=${uid} | ${user.name} | duplicate userId=${userId}, used ${fallback}`);
          updated++;
        }
      } else {
        console.log(`  —  uid=${uid} | ${user.name} | already correct (${userId})`);
      }
    }

    console.log(`\n✅ Done — ${updated} updated, ${notFound} not found`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
  }
}

fixEmployeeIds();
