/**
 * Fix employee IDs by pulling correct userId from ZKTeco devices.
 * Uses raw SQL to bypass model validation and unique constraints.
 */
import ZKTeco from 'zkteco-js';
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from './config/database.js';
import { Employee } from './models/Employee.js';
import { Attendance } from './models/Attendance.js';
import { Op } from 'sequelize';

async function getDeviceUsers(ip, port) {
  console.log(`Connecting to ${ip}:${port}...`);
  const zk = new ZKTeco(ip, port, 5200, 10000);
  await zk.createSocket();
  const { data: users } = await zk.getUsers();
  await zk.disconnect();
  return users.map(u => ({
    uid: u.uid,
    userId: u.userId?.toString().trim(),
    name: (u.name?.trim() || '').toLowerCase()
  }));
}

async function main() {
  await sequelize.authenticate();
  console.log('Connected to DB\n');

  const dev1 = await getDeviceUsers('10.201.1.199', 4370);
  const dev2 = await getDeviceUsers('10.201.1.188', 4370);
  const allUsers = [...dev1, ...dev2];
  console.log(`XFace Pro: ${dev1.length} users, HR Gate: ${dev2.length} users\n`);

  // Build name -> userId mapping
  const nameToUserId = new Map();
  for (const u of allUsers) {
    if (u.name && u.name.length > 1 && u.userId) {
      if (!nameToUserId.has(u.name)) {
        nameToUserId.set(u.name, u.userId);
      }
    }
  }

  // Get all employees via raw SQL (bypass validation)
  const [employees] = await sequelize.query(
    "SELECT id, employee_id, first_name, last_name, biometric_id FROM employees WHERE biometric_id IS NOT NULL ORDER BY biometric_id ASC"
  );
  console.log(`Employees in DB: ${employees.length}\n`);

  let updated = 0;
  let alreadyCorrect = 0;
  let notOnDevice = 0;

  // Update each employee using raw SQL
  for (const emp of employees) {
    const fullName = (emp.first_name + ' ' + (emp.last_name || '')).trim().toLowerCase();
    const firstNameOnly = emp.first_name.toLowerCase();
    let correctUserId = nameToUserId.get(fullName) || nameToUserId.get(firstNameOnly);

    if (!correctUserId) {
      notOnDevice++;
      continue;
    }

    if (emp.employee_id === correctUserId) {
      alreadyCorrect++;
      continue;
    }

    await sequelize.query(
      "UPDATE employees SET employee_id = :newId WHERE id = :id",
      { replacements: { newId: correctUserId, id: emp.id } }
    );
    console.log(`  ${emp.first_name} ${emp.last_name}: ${emp.employee_id} -> ${correctUserId}`);
    updated++;
  }

  console.log(`\nEmployee IDs: ${updated} updated, ${alreadyCorrect} already correct, ${notOnDevice} not on device\n`);

  // Check for duplicate employeeIds
  const [dups] = await sequelize.query(
    "SELECT employee_id, COUNT(*) as cnt, array_agg(first_name || ' ' || COALESCE(last_name, '')) as names FROM employees GROUP BY employee_id HAVING COUNT(*) > 1"
  );
  if (dups.length > 0) {
    console.log('DUPLICATE employeeIds found:');
    for (const d of dups) {
      console.log(`  employeeId=${d.employee_id}: ${d.names} (${d.cnt} employees)`);
    }
  } else {
    console.log('No duplicate employeeIds.');
  }

  // Re-link attendance records
  console.log('\n--- Re-linking attendance records ---');
  const empIdToUuid = new Map();
  const [allEmps] = await sequelize.query("SELECT id, employee_id FROM employees");
  for (const e of allEmps) {
    empIdToUuid.set(e.employee_id, e.id);
  }

  const [allAtt] = await sequelize.query(
    "SELECT id, employee_id, device_log_id, date, check_in_time, check_out_time FROM attendance WHERE device_log_id IS NOT NULL AND device_log_id != ''"
  );

  let relinked = 0;
  let merged = 0;
  let deletedNoMatch = 0;
  let alreadyOk = 0;

  for (const att of allAtt) {
    const correctUuid = empIdToUuid.get(att.device_log_id);

    if (!correctUuid) {
      await sequelize.query("DELETE FROM attendance WHERE id = :id", { replacements: { id: att.id } });
      deletedNoMatch++;
      continue;
    }

    if (att.employee_id === correctUuid) {
      alreadyOk++;
      continue;
    }

    // Check if correct employee already has a record for this date
    const [existing] = await sequelize.query(
      "SELECT id, check_in_time, check_out_time FROM attendance WHERE employee_id = :uuid AND date = :date AND id != :id",
      { replacements: { uuid: correctUuid, date: att.date, id: att.id } }
    );

    if (existing.length > 0) {
      // Merge — keep earliest check-in, latest check-out
      const ex = existing[0];
      const mergedIn = (ex.check_in_time && att.check_in_time)
        ? (new Date(ex.check_in_time) < new Date(att.check_in_time) ? ex.check_in_time : att.check_in_time)
        : ex.check_in_time || att.check_in_time;
      const mergedOut = (ex.check_out_time && att.check_out_time)
        ? (new Date(ex.check_out_time) > new Date(att.check_out_time) ? ex.check_out_time : att.check_out_time)
        : ex.check_out_time || att.check_out_time;

      await sequelize.query(
        "UPDATE attendance SET check_in_time = :cin, check_out_time = :cout WHERE id = :id",
        { replacements: { cin: mergedIn, cout: mergedOut, id: ex.id } }
      );
      await sequelize.query("DELETE FROM attendance WHERE id = :id", { replacements: { id: att.id } });
      merged++;
    } else {
      await sequelize.query(
        "UPDATE attendance SET employee_id = :uuid WHERE id = :id",
        { replacements: { uuid: correctUuid, id: att.id } }
      );
      relinked++;
    }
  }

  console.log(`Already correct: ${alreadyOk}`);
  console.log(`Re-linked: ${relinked}`);
  console.log(`Merged: ${merged}`);
  console.log(`Deleted (no matching employee): ${deletedNoMatch}`);

  // Final verification
  const [finalAtt] = await sequelize.query(
    `SELECT a.device_log_id, e.employee_id FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.device_log_id IS NOT NULL AND a.device_log_id != '' AND a.device_log_id != e.employee_id`
  );
  console.log(`\nFinal: ${finalAtt.length} mismatches remaining`);

  if (finalAtt.length > 0 && finalAtt.length <= 20) {
    for (const f of finalAtt) {
      console.log(`  device_log_id=${f.device_log_id} but employee_id=${f.employee_id}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message, err.stack);
  process.exit(1);
});
