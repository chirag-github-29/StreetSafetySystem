document.getElementById('register-form').addEventListener('submit', function(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const errorMessage = document.getElementById('error-message');

  if (password !== confirmPassword) {
    errorMessage.textContent = 'Passwords do not match';
    errorMessage.style.display = 'block';
    return;
  }

  // Store user data in localStorage
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const userExists = users.find(user => user.username === username);

  if (userExists) {
    errorMessage.textContent = 'Username already exists';
    errorMessage.style.display = 'block';
    return;
  }

  users.push({ username, password });
  localStorage.setItem('users', JSON.stringify(users));

  alert('Registration successful! Please log in.');
  window.location.href = 'login.html';
});