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

async function resetAdmin1Password() {
  try {
    console.log('Resetting admin1 password...');

    // Hash the password
    const password = 'admin_password';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update admin1 password
    const result = await pool.query(
      'UPDATE admins SET password = $1 WHERE username = $2',
      [hashedPassword, 'admin1']
    );

    if (result.rowCount > 0) {
      console.log('✅ Admin1 password reset successfully!');
      console.log('📋 Admin1 credentials:');
      console.log('   Username: admin1');
      console.log('   Password: admin_password');
    } else {
      console.log('❌ Admin1 not found');
    }

  } catch (error) {
    console.error('❌ Error resetting admin1 password:', error);
  } finally {
    await pool.end();
  }
}

resetAdmin1Password();
