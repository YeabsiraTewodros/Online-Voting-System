const bcrypt = require('bcryptjs');

const hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
const password = 'admin_password';

async function verifyHash() {
  try {
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash verification:');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('Is valid:', isValid);

    if (isValid) {
      console.log('✅ The hash corresponds to the password "admin_password"');
    } else {
      console.log('❌ The hash does not match the password');
    }
  } catch (error) {
    console.error('Error verifying hash:', error);
  }
}

verifyHash();
