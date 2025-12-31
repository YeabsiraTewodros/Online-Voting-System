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

async function insertAdmin() {
  try {
    console.log('Inserting admin user...');

    // Hash the password
    const password = 'admin_password';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin user
    await pool.query(
      'INSERT INTO admins (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      ['admin', hashedPassword]
    );

    console.log('✅ Admin user inserted successfully!');
    console.log('📋 Admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin_password');

  } catch (error) {
    console.error('❌ Error inserting admin:', error);
  } finally {
    await pool.end();
  }
}

insertAdmin();
