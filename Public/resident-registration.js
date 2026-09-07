// ================================================
// RESIDENT REGISTRATION - Frontend JavaScript
// ================================================

const registrationForm = document.getElementById('registrationForm');

// Error elements
const errors = {
    firstName: document.getElementById('firstNameError'),
    lastName: document.getElementById('lastNameError'),
    username: document.getElementById('usernameError'),
    password: document.getElementById('passwordError'),
    phone: document.getElementById('phoneError'),
    email: document.getElementById('emailError')
};

// Form submission
registrationForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear all previous errors
    Object.values(errors).forEach(error => {
        if (error) error.style.display = 'none';
    });
    
    // Collect form data
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        middleName: document.getElementById('middleName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
        status: document.getElementById('position').value,
        propertyType: document.getElementById('property').value,
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim()
    };
    
    // Validation
    let isValid = true;
    
    // First name validation
    if (!formData.firstName) {
        showError('firstName', 'First name is required');
        isValid = false;
    } else if (formData.firstName.length < 2) {
        showError('firstName', 'First name must be at least 2 characters');
        isValid = false;
    }
    
    // Last name validation
    if (!formData.lastName) {
        showError('lastName', 'Last name is required');
        isValid = false;
    } else if (formData.lastName.length < 2) {
        showError('lastName', 'Last name must be at least 2 characters');
        isValid = false;
    }
    
    // Username validation
    if (!formData.username) {
        showError('username', 'Username is required');
        isValid = false;
    } else if (formData.username.length < 3) {
        showError('username', 'Username must be at least 3 characters');
        isValid = false;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
        showError('username', 'Username can only contain letters, numbers, underscore, and hyphen');
        isValid = false;
    }
    
    // Password validation
    if (!formData.password) {
        showError('password', 'Password is required');
        isValid = false;
    } else if (formData.password.length < 8) {
        showError('password', 'Password must be at least 8 characters');
        isValid = false;
    }
    
    // Phone validation
    if (!formData.phone) {
        showError('phone', 'Phone number is required');
        isValid = false;
    } else if (!/^\+?234[0-9]{10}$|^0[0-9]{10}$/.test(formData.phone.replace(/\s/g, ''))) {
        showError('phone', 'Enter a valid Nigerian phone number');
        isValid = false;
    }
    
    // Email validation
    if (!formData.email) {
        showError('email', 'Email is required');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        showError('email', 'Enter a valid email address');
        isValid = false;
    }
    
    // Status validation
    if (!formData.status) {
        alert('Please select a status (Owner/Tenant)');
        isValid = false;
    }
    
    // Property validation
    if (!formData.propertyType) {
        alert('Please select a property type');
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Disable submit button
    const submitBtn = registrationForm.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';
    
    try {
        // Send registration request to backend
        const response = await fetch('http://localhost:5000/api/resident/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok && (data.success || data.status === 'success')) {
            alert('Registered successfully');
            showSuccessMessage();
            
            // Clear form
            registrationForm.reset();
            
            // Redirect to resident login after 3 seconds
            setTimeout(() => {
                window.location.href = 'resident-login.html';
            }, 3000);
        } else {
            // Show backend error
            alert(data.message || 'Registration failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Connection error. Please check your backend server and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
});

// Show validation error
function showError(fieldName, message) {
    if (errors[fieldName]) {
        errors[fieldName].textContent = message;
        errors[fieldName].style.display = 'block';
    }
}

// Show success modal pop-up
function showSuccessMessage() {
    const successModal = document.createElement('div');
    successModal.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        ">
            <div style="
                background: white;
                padding: 2.5rem;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
            ">
                <div style="font-size: 3.5rem; color: #28a745; margin-bottom: 0.5rem;">✓</div>
                <h2 style="color: #1a1a1a; margin-bottom: 0.5rem; font-family: 'Poppins', sans-serif;">Registered Successfully!</h2>
                <p style="color: #666; margin-bottom: 1.5rem; font-family: 'Poppins', sans-serif;">Your resident account has been created. Redirecting to login...</p>
                <div style="width: 100%; height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
                    <div style="
                        height: 100%;
                        background: #28a745;
                        animation: progress 3s linear;
                    "></div>
                </div>
            </div>
        </div>
        <style>
            @keyframes progress {
                from { width: 0%; }
                to { width: 100%; }
            }
        </style>
    `;
    document.body.appendChild(successModal);
}