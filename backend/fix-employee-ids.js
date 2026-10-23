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

const DEVICES = [
  { ip: '10.201.1.199', port: 4370, name: 'XFace Pro Factory Entrance' },
  { ip: '10.201.1.188', port: 4370, name: 'HR Gate' },
];

async function fixEmployeeIds() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Pull users from both devices (XFace Pro is authoritative for name conflicts)
    console.log('Connecting to devices...');
    const allUsers = new Map(); // userId -> user (XFace Pro wins on conflict)

    for (const dev of DEVICES) {
      try {
        const zk = new ZKTeco(dev.ip, dev.port, 5200, 10000);
        await zk.createSocket();
        const { data: users } = await zk.getUsers();
        await zk.disconnect();
        console.log(`✅ ${dev.name}: ${users.length} users`);
        // Add users — but don't overwrite real names with numeric/empty ones
        for (const u of users) {
          const uid = u.userId?.toString().trim();
          if (!uid) continue;
          const existing = allUsers.get(uid);
          const newName = u.name?.trim() || '';
          const newNameIsReal = newName && !/^\d+$/.test(newName);
          const existingNameIsReal = existing && existing.name && !/^\d+$/.test(existing.name);
          if (!existing || (!existingNameIsReal && newNameIsReal)) {
            allUsers.set(uid, u);
          }
        }
      } catch (e) {
        console.warn(`⚠️  Could not connect to ${dev.name}: ${e.message}`);
      }
    }

    const users = [...allUsers.values()];
    console.log(`✅ Got ${users.length} unique users across devices\n`);

    let updated = 0;
    let notFound = 0;

    for (const user of users) {
      // uid  = slot number (what attendance logs use)
      // userId = real company ID set during enrollment
      const uid = user.uid;
      const userId = user.userId?.toString().trim();

      if (!userId) continue;

      // Find employee by employeeId (company ID) — the stable anchor
      // Fall back to biometricId only if employeeId lookup fails
      let employee = await Employee.findOne({ where: { employeeId: userId } });
      if (!employee) {
        employee = await Employee.findOne({ where: { biometricId: uid } });
      }

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
