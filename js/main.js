// ============================================
// QUICKINVOICE - Main Shared Functions
// Fidbacc-style UI with Backend Integration
// ============================================

// API Configuration
const API_BASE = 'https://localhost:7011/api';

// Global state
let currentUser = null;
let authToken = null;
let isPro = false;
let remainingFreeInvoices = 2;

// ============================================
// Auth Management
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');

    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        isPro = currentUser.isPro;

        // Update UI with user info
        updateUserDisplay();

        // Validate token on protected pages
        if (window.location.pathname.includes('invoice-builder.html') ||
            window.location.pathname.includes('my-invoices.html') ||
            window.location.pathname.includes('upgrade.html')) {
            validateToken();
        }
    } else {
        // Redirect to login if on protected page
        if (window.location.pathname.includes('invoice-builder.html') ||
            window.location.pathname.includes('my-invoices.html') ||
            window.location.pathname.includes('upgrade.html')) {
            window.location.href = 'dashboard.html';
        }
    }
});

async function validateToken() {
    try {
        const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            logout();
        } else {
            const data = await response.json();
            if (data.user) {
                currentUser = data.user;
                isPro = currentUser.isPro;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUserDisplay();
                await fetchUserStats();
            }
        }
    } catch (error) {
        console.error('Token validation error:', error);
        logout();
    }
}

async function fetchUserStats() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/users/stats/${encodeURIComponent(currentUser.email)}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const stats = await response.json();
            if (stats.exists) {
                remainingFreeInvoices = stats.remainingFreeInvoices;
                isPro = stats.isPro;

                // Update invoice limit warning if on builder page
                const warningEl = document.getElementById('invoiceLimitWarning');
                const usedEl = document.getElementById('usedInvoices');
                if (warningEl && usedEl && !isPro) {
                    const used = 2 - remainingFreeInvoices;
                    usedEl.textContent = used;
                    if (used >= 2) {
                        warningEl.style.display = 'flex';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
    }
}

function updateUserDisplay() {
    const userNameSpan = document.getElementById('userNameDisplay');
    const proBadge = document.getElementById('proBadge');

    if (userNameSpan && currentUser) {
        userNameSpan.textContent = currentUser.firstName || currentUser.email.split('@')[0];
    }

    if (proBadge) {
        if (isPro) {
            proBadge.textContent = '✓ PRO Member';
            proBadge.className = 'badge pro';
        } else {
            proBadge.textContent = 'Free Plan';
            proBadge.className = 'badge free';
        }
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    isPro = false;

    window.location.href = 'index.html';
}

function checkAuth() {
    if (!authToken) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// ============================================
// Helper Functions
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatMoney(amount, currency) {
    const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (currency === '₦') {
        return `₦${formattedAmount}`;
    } else if (currency === '¥') {
        return `¥${formattedAmount}`;
    } else if (currency === 'KSh') {
        return `KSh ${formattedAmount}`;
    } else if (currency === 'R') {
        return `R ${formattedAmount}`;
    } else if (currency === '₵') {
        return `₵${formattedAmount}`;
    } else {
        return `${currency}${formattedAmount}`;
    }
}

function showMessage(elementId, message, type) {
    const messageDiv = document.getElementById(elementId);
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message show ${type}`;
        setTimeout(() => messageDiv.classList.remove('show'), 5000);
    }
}

function showLoading(elementId, show) {
    const element = document.getElementById(elementId);
    if (element && show) {
        element.innerHTML = '<div class="loading-spinner"></div>';
    }
}
