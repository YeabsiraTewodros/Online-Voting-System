// Password visibility toggle for password field
    document.getElementById('togglePassword').addEventListener('click', function() {
      const passwordInput = document.getElementById('password');
      const passwordIcon = document.getElementById('passwordIcon');

      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
      }
    });

    // Password visibility toggle for confirm password field
    document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
      const confirmPasswordInput = document.getElementById('confirmPassword');
      const confirmPasswordIcon = document.getElementById('confirmPasswordIcon');

      if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        confirmPasswordIcon.classList.remove('fa-eye');
        confirmPasswordIcon.classList.add('fa-eye-slash');
      } else {
        confirmPasswordInput.type = 'password';
        confirmPasswordIcon.classList.remove('fa-eye-slash');
        confirmPasswordIcon.classList.add('fa-eye');
      }
    });

    // Function to check password match and update UI
    function checkPasswordMatch() {
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const messageDiv = document.getElementById('passwordMatchMessage');
      const submitBtn = document.querySelector('button[type="submit"]');

      if (confirmPassword === '') {
        messageDiv.textContent = '';
        submitBtn.disabled = true;
        return;
      }

      if (password === confirmPassword) {
        messageDiv.innerHTML = '<i class="fas fa-check text-success"></i> Passwords match';
        messageDiv.className = 'form-text text-success';
        submitBtn.disabled = false;
      } else {
        messageDiv.innerHTML = '<i class="fas fa-times text-danger"></i> Passwords do not match';
        messageDiv.className = 'form-text text-danger';
        submitBtn.disabled = true;
      }
    }

    // Password confirmation validation
    document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);

    // Also check on password change
    document.getElementById('password').addEventListener('input', checkPasswordMatch);