const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ethiopian_vote',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

async function checkAdmin() {
  try {
    console.log('🔍 Checking admin users in database...');

    // Check if admins table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'admins'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Admins table does not exist!');
      return;
    }

    // Get all admin users
    const result = await pool.query('SELECT id, username, password, role, is_active, created_at FROM admins ORDER BY created_at');

    console.log(`📋 Found ${result.rows.length} admin user(s):`);
    console.log('');

    result.rows.forEach((admin, index) => {
      console.log(`${index + 1}. Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.is_active}`);
      console.log(`   Created: ${admin.created_at}`);
      console.log(`   Password Hash: ${admin.password.substring(0, 20)}...`);
      console.log('');
    });

    // Check if admin user exists
    const adminUser = result.rows.find(admin => admin.username === 'admin');
    if (adminUser) {
      console.log('✅ Admin user "admin" exists');
      console.log('🔐 Password hash:', adminUser.password);
    } else {
      console.log('❌ Admin user "admin" does not exist!');
    }

  } catch (error) {
    console.error('❌ Error checking admin:', error);
  } finally {
    await pool.end();
  }
}

checkAdmin();
