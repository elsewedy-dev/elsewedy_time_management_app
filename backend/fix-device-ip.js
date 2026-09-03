/**
 * One-time script to update ZKTeco device IP address in the database.
 * Run with: node fix-device-ip.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from './config/database.js';
import { Device } from './models/Device.js';

const NEW_IP = '10.201.1.197';
const NEW_PORT = 4370;

async function fixDeviceIp() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Show all current devices
    const devices = await Device.findAll();
    console.log(`\nFound ${devices.length} device(s) in database:\n`);

    for (const device of devices) {
      console.log(`  - ${device.name} | IP: ${device.ipAddress}:${device.port} | Active: ${device.isActive}`);
    }

    if (devices.length === 0) {
      console.log('\n⚠️  No devices found. You need to add the device through the Devices page in the app.');
      console.log('\nDevice details to add:');
      console.log('  Name:          ZKTeco XFace Pro');
      console.log('  Serial Number: XFACE001 (or check the device itself)');
      console.log('  Model:         XFace Pro');
      console.log('  Type:          xface_pro');
      console.log(`  IP Address:    ${NEW_IP}`);
      console.log(`  Port:          ${NEW_PORT}`);
      console.log('  Password:      0');
    } else {
      // Update all devices to the correct IP
      const [updated] = await Device.update(
        { ipAddress: NEW_IP, port: NEW_PORT },
        { where: {} } // update all devices
      );

      console.log(`\n✅ Updated ${updated} device(s) to IP: ${NEW_IP}:${NEW_PORT}`);

      // Show updated devices
      const updatedDevices = await Device.findAll();
      console.log('\nUpdated device(s):');
      for (const device of updatedDevices) {
        console.log(`  - ${device.name} | IP: ${device.ipAddress}:${device.port} | Active: ${device.isActive}`);
      }
    }

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDeviceIp();
