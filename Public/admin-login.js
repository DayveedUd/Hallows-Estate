// ADMIN LOGIN - Frontend JavaScript
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');

// Toggle password visibility
    togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
// Toggle eye icon (optional: change icon appearance)
    eyeIcon.style.opacity = type === 'password' ? '0.6' : '1';
    });

// Form submission
    loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
// Clear previous errors
    loginError.textContent = '';
    loginError.style.display = 'none';
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
// Validation
    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }
    
    if (username.length < 3) {
        showError('Username must be at least 3 characters');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
// Disable button during submission
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    try {

// Send login request to backend
    const response = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {

// Save token to localStorage
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminId', data.adminId);
    localStorage.setItem('adminName', data.adminName);
            
// Redirect to admin portal after 500ms
    setTimeout(() => {
        window.location.href = 'admin-portal.html';
    }, 500);
    } else {
    showError(data.message || 'Invalid username or password');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log in';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please try again.');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Log in';
    }
    });

// Show error message
function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

// Enter key support
usernameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});