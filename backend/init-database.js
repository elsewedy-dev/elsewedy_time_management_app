import { sequelize } from './config/database.js';
import { Department } from './models/Department.js';
import { User } from './models/User.js';
import bcrypt from 'bcrypt';

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create default department if not exists
    const [department, deptCreated] = await Department.findOrCreate({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      defaults: {
        name: 'IT',
        code: 'IT',
        description: 'Information Technology Department',
        status: 'active',
        budget: 1000000,
        headOfDepartment: 'System',
        location: 'Headquarters',
        contactEmail: 'it@example.com',
        contactPhone: '+251900000000'
      }
    });

    if (deptCreated) {
      console.log('✅ Created default department:', department.toJSON());
    } else {
      console.log('ℹ️  Default department already exists');
    }

    // Create admin user if not exists
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [admin, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@example.com' },
      defaults: {
        id: '00000000-0000-0000-0000-000000000001',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        departmentId: department.id
      }
    });

    if (adminCreated) {
      console.log('✅ Created admin user:', admin.toJSON());
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('\n✅ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
