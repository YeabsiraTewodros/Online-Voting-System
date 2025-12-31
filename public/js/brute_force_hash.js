const bcrypt = require('bcryptjs');

const hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

// Common passwords to test
const commonPasswords = [
  'admin',
  'admin_password',
  'password',
  '123456',
  'admin123',
  'password123',
  'admin_password123',
  'ethiopia',
  'ethiopian',
  'vote',
  'voting',
  'system',
  'super_admin',
  'root',
  'administrator',
  'admin1',
  'admin_password1',
  'yene1608', // from the database password
  'postgres',
  'database',
  'server',
  'app',
  'application',
  'test',
  'testing',
  'dev',
  'development',
  'prod',
  'production'
];

async function bruteForce() {
  console.log('🔍 Brute forcing bcrypt hash...');
  console.log('Hash:', hash);
  console.log('');

  for (const password of commonPasswords) {
    try {
      const isValid = await bcrypt.compare(password, hash);
      if (isValid) {
        console.log('✅ FOUND MATCH!');
        console.log('Password:', password);
        console.log('Hash:', hash);
        return;
      } else {
        console.log(`❌ ${password} - not a match`);
      }
    } catch (error) {
      console.error(`Error testing ${password}:`, error);
    }
  }

  console.log('');
  console.log('❌ No matches found in common passwords list');
  console.log('💡 The password might be more complex or use special characters');
}

bruteForce();
