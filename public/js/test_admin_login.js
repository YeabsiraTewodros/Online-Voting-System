const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ethiopian_vote',
  password: 'yene1608',
  port: 5432,
});

async function testAdminLogin() {
  const username = 'admin';
  const password = 'admin_password';

  console.log('🧪 Testing admin login...');
  console.log('Username:', username);
  console.log('Password:', password);
  console.log('');

  try {
    // First check if database connection works
    const testConnection = await pool.query('SELECT 1');
    console.log('✅ Database connection test:', testConnection.rows);

    // Query for admin user
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    console.log('📋 Admin query result:', result.rows.length, 'rows found');

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('👤 Found admin:', {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        is_active: admin.is_active,
        passwordHash: admin.password.substring(0, 20) + '...'
      });

      // Test password verification
      console.log('🔐 Testing password verification...');
      const isValidPassword = await bcrypt.compare(password, admin.password);
      console.log('Password validation result:', isValidPassword);

      if (isValidPassword) {
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('Admin authenticated successfully');
      } else {
        console.log('❌ INVALID PASSWORD!');
        console.log('The password does not match the stored hash');

        // Let's try some common variations
        console.log('🔍 Testing common password variations...');
        const variations = ['admin', 'password', 'Admin', 'Password', 'ADMIN', 'PASSWORD'];
        for (const variation of variations) {
          const isValid = await bcrypt.compare(variation, admin.password);
          if (isValid) {
            console.log(`✅ Found matching password: "${variation}"`);
            break;
          }
        }
      }
    } else {
      console.log('❌ Admin user not found!');
    }
  } catch (error) {
    console.error('❌ Error during login test:', error);
  } finally {
    await pool.end();
  }
}

testAdminLogin();
