// ============================================
// Dashboard (Login/Signup) Functions
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('signup') === 'true') {
        switchTab('signup');
    }
});

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.tab-btn');

    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAuthMessage('Please enter email and password', 'error');
        return;
    }

    showAuthMessage('Logging in...', 'success');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            window.location.href = 'invoice-builder.html';
        } else {
            showAuthMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showAuthMessage('Error connecting to server', 'error');
    }
}

async function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (!email || !password || !name) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }

    showAuthMessage('Creating account...', 'success');

    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            window.location.href = 'invoice-builder.html';
        } else {
            showAuthMessage(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        showAuthMessage('Error connecting to server', 'error');
    }
}

function showAuthMessage(msg, type) {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = msg;
    messageDiv.className = `auth-message show ${type}`;
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
}

// Forgot Password Functions
function showForgotPassword() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.style.display = 'flex';
}

function closeForgotPassword() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.style.display = 'none';
    document.getElementById('forgotEmail').value = '';
}

async function sendResetLink() {
    const email = document.getElementById('forgotEmail').value;

    if (!email) {
        showAuthMessage('Please enter your email address', 'error');
        return;
    }

    showAuthMessage('Sending reset link...', 'success');

    try {
        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            showAuthMessage('Reset link sent! Check your email.', 'success');
            closeForgotPassword();
        } else {
            const data = await response.json();
            showAuthMessage(data.message || 'Email not found', 'error');
        }
    } catch (error) {
        // For demo purposes, show success even without backend
        showAuthMessage('Reset link sent! Check your email.', 'success');
        closeForgotPassword();
    }
}
