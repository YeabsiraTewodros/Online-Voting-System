const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin_password';
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Generated hash for password "admin_password":');
    console.log('Hash:', hash);

    // Verify it works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verification:', isValid);

    // Compare with the existing hash
    const existingHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    console.log('\nExisting hash from database:', existingHash);

    const existingValid = await bcrypt.compare(password, existingHash);
    console.log('Does existing hash match "admin_password"?', existingValid);

  } catch (error) {
    console.error('Error:', error);
  }
}

generateHash();
