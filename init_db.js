const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// PostgreSQL connection using DATABASE_URL for Render deployment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing Ethiopian Vote System database...');

    // Check if tables already exist
    console.log('📦 Checking database schema...');
    const checkTables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('admins', 'voters', 'votes')
    `);

    if (checkTables.rows.length > 0) {
      console.log('ℹ️  Database schema already exists, skipping initialization...');
      console.log('📋 Default Admin Credentials:');
      console.log('   Username: admin');
      console.log('   Password: **************');
      console.log('   Role: super_admin');
      console.log('');
      console.log('🎯 Ready to start the server with: npm start');
      return;
    }

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
    await pool.query(cleanSql);

    console.log('✅ Database schema initialized successfully!');
    console.log('📋 Default Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: **************');
    console.log('   Role: super_admin');
    console.log('');
    console.log('🎯 Ready to start the server with: npm start');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.error('💡 Make sure DATABASE_URL is set correctly');
  } finally {
    await pool.end();
  }
}

initializeDatabase();
