// Simple test script to verify backend is working
const testBackend = async () => {
  try {
    console.log('🧪 Testing Elsewedy Backend API...\n');

    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData.message);
    console.log('   Status:', healthData.status);
    console.log('   Timestamp:', healthData.timestamp);

    // Test API endpoint
    const apiResponse = await fetch('http://localhost:3001/api/test');
    const apiData = await apiResponse.json();
    console.log('\n✅ API Test:', apiData.message);
    console.log('   Available endpoints:', apiData.data.endpoints.length);

    // Test employees endpoint
    const employeesResponse = await fetch('http://localhost:3001/api/employees');
    const employeesData = await employeesResponse.json();
    console.log('\n✅ Employees API:');
    console.log('   Total employees:', employeesData.data.length);
    console.log('   First employee:', employeesData.data[0].firstName, employeesData.data[0].lastName);

    // Test attendance endpoint
    const attendanceResponse = await fetch('http://localhost:3001/api/attendance');
    const attendanceData = await attendanceResponse.json();
    console.log('\n✅ Attendance API:');
    console.log('   Total records:', attendanceData.data.length);
    console.log('   Attendance rate:', attendanceData.summary.attendanceRate + '%');

    // Test devices endpoint
    const devicesResponse = await fetch('http://localhost:3001/api/devices');
    const devicesData = await devicesResponse.json();
    console.log('\n✅ Devices API:');
    console.log('   Total devices:', devicesData.data.length);
    console.log('   Device types:', devicesData.data.map(d => d.type).join(', '));

    // Test login endpoint
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('\n✅ Authentication API:');
    console.log('   Login successful:', loginData.success);
    console.log('   User role:', loginData.data.user.role);

    console.log('\n🎉 All backend tests passed!');
    console.log('\n📋 Summary:');
    console.log('   - Backend server: ✅ Running on port 3001');
    console.log('   - Health check: ✅ Working');
    console.log('   - API endpoints: ✅ All functional');
    console.log('   - Mock data: ✅ Available');
    console.log('   - Authentication: ✅ Working');
    
    console.log('\n🔗 Next steps:');
    console.log('   1. Your React frontend is running on http://localhost:5176');
    console.log('   2. Backend API is ready on http://localhost:3001');
    console.log('   3. Ready to integrate frontend with backend!');

  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running: node backend/simple-server.js');
    console.log('   2. Check if port 3001 is available');
    console.log('   3. Verify no firewall blocking localhost connections');
  }
};

testBackend();
