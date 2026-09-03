/**
 * Standalone ZKTeco connection test.
 * Run with: node test-zkteco.js
 * Does NOT require the database to be running.
 */
import ZKTeco from 'zkteco-js';

const DEVICE_IP = '10.201.1.197';
const DEVICE_PORT = 4370;
const TIMEOUT = 10000;

console.log(`\nTesting ZKTeco connection to ${DEVICE_IP}:${DEVICE_PORT}...\n`);

async function test() {
  let zk = null;
  try {
    zk = new ZKTeco(DEVICE_IP, DEVICE_PORT, 5200, TIMEOUT);

    console.log('1. Creating socket...');
    await zk.createSocket();
    console.log('   ✅ Socket connected\n');

    console.log('2. Getting device info...');
    const info = await zk.getInfo();
    console.log('   ✅ Device info:', JSON.stringify(info, null, 4), '\n');

    console.log('3. Getting users...');
    const users = await zk.getUsers();
    console.log(`   ✅ Found ${users.data.length} users`);
    if (users.data.length > 0) {
      console.log('   First 3 users:');
      users.data.slice(0, 3).forEach(u => {
        console.log(`     - UID: ${u.uid}, Name: ${u.name}`);
      });
    }
    console.log();

    console.log('4. Getting attendance logs...');
    const logs = await zk.getAttendances();
    console.log(`   ✅ Found ${logs.data.length} attendance logs`);
    if (logs.data.length > 0) {
      console.log('   Latest 3 logs:');
      const sorted = logs.data
        .filter(l => l.user_id && l.record_time)
        .sort((a, b) => new Date(b.record_time) - new Date(a.record_time));
      sorted.slice(0, 3).forEach(l => {
        console.log(`     - User: ${l.user_id}, Time: ${l.record_time}, Type: ${l.type}`);
      });
    }
    console.log();

    console.log('5. Disconnecting...');
    await zk.disconnect();
    console.log('   ✅ Disconnected\n');

    console.log('✅ All tests passed! The device is working correctly.\n');

  } catch (err) {
    console.error('\n❌ Connection failed:', err.message);
    console.error('\nPossible causes:');
    console.error('  - Device IP is wrong (current:', DEVICE_IP + ')');
    console.error('  - Port is wrong (current:', DEVICE_PORT + ') — should be 4370');
    console.error('  - Device firewall blocking TCP connections');
    console.error('  - Device is not in "Ethernet" communication mode');
    console.error('  - Device password is not 0 (check device settings)');
    if (zk) {
      try { await zk.disconnect(); } catch (_) {}
    }
    process.exit(1);
  }
}

test();
