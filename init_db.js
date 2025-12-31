const { Pool } = require('pg');
const fs = require('fs');

// PostgreSQL connection to default database first
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Connect to default database first
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
  let ethiopianVotePool = null;

  try {
    console.log('🚀 Initializing Ethiopian Vote System database...');

    // Step 1: Create the database if it doesn't exist
    console.log('📦 Creating database...');
    try {
      await pool.query('CREATE DATABASE ethiopian_vote');
      console.log('✅ Database created successfully!');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('ℹ️  Database already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Close connection to default database
    await pool.end();

    // Step 3: Connect to the new database
    console.log('🔌 Connecting to ethiopian_vote database...');
    ethiopianVotePool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: 'ethiopian_vote',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });

    // Step 4: Read and execute the SQL schema
    console.log('📄 Reading database schema...');
    const sqlContent = fs.readFileSync('database.sql', 'utf8');

    // Remove the CREATE DATABASE and \c commands (psql specific)
    const cleanSql = sqlContent
      .replace(/CREATE DATABASE ethiopian_vote;/gi, '')
      .replace(/\\c ethiopian_vote;/gi, '')
      .replace(/-- Create database[\s\S]*?-- Use the database[\s\S]*?\\c ethiopian_vote;/gi, '')
      .trim();

    // Split the SQL into individual statements
   console.log('⚡ Executing full SQL schema...');
   await ethiopianVotePool.query(cleanSql);


    console.log('✅ Database schema initialized successfully!');
    console.log('📋 Default Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin_password');
    console.log('   Role: super_admin');
    console.log('');
    console.log('🎯 Ready to start the server with: npm start');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.error('💡 Make sure PostgreSQL is running and credentials are correct');
  } finally {
    if (ethiopianVotePool) {
      await ethiopianVotePool.end();
    }
  }
}

initializeDatabase();
