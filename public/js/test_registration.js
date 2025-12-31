// Test script for voter registration validation logic

// Test FIN number validation
function validateFinNumber(finnumber) {
  const finRegex = /^\d{4}-\d{4}-\d{4}$/;
  return finRegex.test(finnumber);
}

// Test phone number validation (optional and unique)
function validatePhoneNumber(phone_number, existingPhones = []) {
  if (!phone_number || phone_number.trim() === '') {
    return { valid: true, message: 'Phone number is optional' };
  }
  if (existingPhones.includes(phone_number.trim())) {
    return { valid: false, message: 'Phone number already exists' };
  }
  return { valid: true, message: 'Phone number is valid and unique' };
}

// Test cases
console.log('Testing FIN number validation:');
console.log('Valid FIN: 1234-1234-1234 ->', validateFinNumber('1234-1234-1234'));
console.log('Invalid FIN: 1234-1234-123 ->', validateFinNumber('1234-1234-123'));
console.log('Invalid FIN: 123412341234 ->', validateFinNumber('123412341234'));
console.log('Invalid FIN: 1234-1234-12345 ->', validateFinNumber('1234-1234-12345'));

console.log('\nTesting phone number validation:');
console.log('Empty phone: "" ->', validatePhoneNumber(''));
console.log('Valid unique phone: "+251911111111" ->', validatePhoneNumber('+251911111111', []));
console.log('Duplicate phone: "+251911111111" ->', validatePhoneNumber('+251911111111', ['+251911111111']));
