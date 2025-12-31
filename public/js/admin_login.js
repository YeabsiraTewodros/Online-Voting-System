
    // Password visibility toggle
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

    // Confirm toggle function for admin dashboard
    function confirmToggle() {
      const confirmCheckbox = document.getElementById('confirmToggle');
      if (!confirmCheckbox.checked) {
        alert('Please check the confirmation box to proceed.');
        return false;
      }

      const isOpening = document.querySelector('button[type="submit"]').textContent.includes('Open');
      const action = isOpening ? 'open' : 'close';

      return confirm(`Are you sure you want to ${action} the vote period? This will ${isOpening ? 'allow' : 'prevent'} voters from casting their votes.`);
    }