// ============================================
// QUICKINVOICE - Landing Page First with Currency Support
// ============================================

// Global variables
let items = [];
let appItems = [];
let logoBase64 = '';
let appLogoBase64 = '';
let currentUser = null;
let authToken = null;
let isPro = false;
let pendingInvoiceToSave = null;

// API Base URL (Update with your backend port)
const API_BASE = 'https://localhost:7011/api';

// Currency helper functions
function getCurrencySymbol() {
    const currencySelect = document.getElementById('currency');
    return currencySelect ? currencySelect.value : '₦';
}

function getAppCurrencySymbol() {
    const currencySelect = document.getElementById('appCurrency');
    return currencySelect ? currencySelect.value : '₦';
}

function formatMoney(amount, currency) {
    // Handle large numbers with commas
    const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Special handling for currencies that put symbol after
    if (currency === '₦' || currency === '¥') {
        return `${currency}${formattedAmount}`;
    }
    return `${currency}${formattedAmount}`;
}

// ============================================
// LANDING PAGE FUNCTIONS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');

    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        isPro = currentUser.isPro;
        validateAndSwitchToApp();
    } else {
        // Initialize landing page builder
        document.getElementById('invoiceDate').valueAsDate = new Date();
        addItem();
        attachLandingEvents();
        updatePreview();

        // Listen for currency changes
        document.getElementById('currency').addEventListener('change', updatePreview);
    }
});

function scrollToBuilder() {
    document.getElementById('builderSection').scrollIntoView({
        behavior: 'smooth'
    });
}

function attachLandingEvents() {
    const inputs = ['businessName', 'clientName', 'clientEmail', 'clientAddress', 'invoiceNumber', 'taxRate', 'discount', 'notes'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updatePreview);
        }
    });

    document.getElementById('invoiceDate')?.addEventListener('change', updatePreview);

    document.getElementById('logoUpload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                logoBase64 = event.target.result;
                updatePreview();
            };
            reader.readAsDataURL(file);
        }
    });
}

// Landing page invoice items
function addItem() {
    items.push({ description: '', quantity: 1, price: 0 });
    renderItems();
    updatePreview();
}

function removeItem(index) {
    items.splice(index, 1);
    renderItems();
    updatePreview();
}

function renderItems() {
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-items">No items added yet. Click "Add Item" to start.</div>';
        return;
    }

    const currency = getCurrencySymbol();

    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-row';
        itemDiv.innerHTML = `
            <input type="text" placeholder="Item description" value="${escapeHtml(item.description)}"
                   onchange="updateItem(${index}, 'description', this.value)">
            <input type="number" placeholder="Qty" value="${item.quantity}"
                   onchange="updateItem(${index}, 'quantity', parseInt(this.value))">
            <input type="number" placeholder="Price (${currency})" step="0.01" value="${item.price}"
                   onchange="updateItem(${index}, 'price', parseFloat(this.value))">
            <button class="btn-remove" onclick="removeItem(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(itemDiv);
    });
}

function updateItem(index, field, value) {
    items[index][field] = value;
    updatePreview();
}

// Calculations
function calculateTotals(invoiceItems) {
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxRate = parseFloat(document.getElementById('taxRate')?.value) || 0;
    const discount = parseFloat(document.getElementById('discount')?.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;

    return { subtotal, taxAmount, total };
}

// Live preview with currency
function updatePreview() {
    const businessName = document.getElementById('businessName')?.value || 'Your Business';
    const clientName = document.getElementById('clientName')?.value || 'Client Name';
    const clientEmail = document.getElementById('clientEmail')?.value;
    const clientAddress = document.getElementById('clientAddress')?.value;
    const invoiceNumber = document.getElementById('invoiceNumber')?.value || 'AUTO';
    const invoiceDate = document.getElementById('invoiceDate')?.value || '';
    const notes = document.getElementById('notes')?.value;
    const currency = getCurrencySymbol();
    const { subtotal, taxAmount, total } = calculateTotals(items);
    const taxRate = document.getElementById('taxRate')?.value || 0;
    const discount = document.getElementById('discount')?.value || 0;

    let itemsHtml = '';
    items.forEach(item => {
        if (item.description) {
            itemsHtml += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f2f5;">${escapeHtml(item.description)}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f0f2f5;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #f0f2f5;">${formatMoney(item.price, currency)}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #f0f2f5; font-weight: 600;">${formatMoney(item.quantity * item.price, currency)}</td>
                </tr>
            `;
        }
    });

    const previewHtml = `
        <div class="invoice-preview" id="invoiceContent">
            <div class="preview-header">
                <div class="preview-header-content">
                    <div>
                        ${logoBase64 ? `<div class="preview-logo"><img src="${logoBase64}" alt="Logo"></div>` : ''}
                        <div class="preview-business-name">${escapeHtml(businessName)}</div>
                    </div>
                    <div>
                        <div class="preview-invoice-label">INVOICE</div>
                        <div class="preview-invoice-number">#${escapeHtml(invoiceNumber)}</div>
                    </div>
                </div>
            </div>

            <div class="preview-body">
                <div class="preview-grid">
                    <div class="preview-bill-to">
                        <h4>BILL TO</h4>
                        <div class="preview-client-name">${escapeHtml(clientName)}</div>
                        ${clientEmail ? `<div class="preview-client-email">${escapeHtml(clientEmail)}</div>` : ''}
                        ${clientAddress ? `<div class="preview-client-address">${escapeHtml(clientAddress)}</div>` : ''}
                    </div>
                    <div class="preview-date">
                        <strong>Date:</strong> ${invoiceDate}
                    </div>
                </div>

                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml || '<tr><td colspan="4" class="empty-items">No items added</td></tr>'}
                    </tbody>
                </table>

                <div class="preview-totals">
                    <div><span>Subtotal:</span><strong>${formatMoney(subtotal, currency)}</strong></div>
                    ${taxRate > 0 ? `<div><span>Tax (${taxRate}%):</span><strong>${formatMoney(taxAmount, currency)}</strong></div>` : ''}
                    ${discount > 0 ? `<div><span>Discount:</span><strong>-${formatMoney(discount, currency)}</strong></div>` : ''}
                    <div class="preview-grand-total">
                        <span>Total Amount:</span>
                        <strong>${formatMoney(total, currency)}</strong>
                    </div>
                </div>

                ${notes ? `
                <div class="preview-notes">
                    <div class="preview-notes-label">Notes:</div>
                    <div class="preview-notes-text">${escapeHtml(notes)}</div>
                </div>
                ` : ''}

                <div class="preview-watermark">
                    <p>Generated by QuickInvoice - <a href="#" onclick="showAuthModal('signup'); return false;">Sign up</a> to remove watermark</p>
                </div>
            </div>
        </div>
    `;

    const preview = document.getElementById('invoicePreview');
    if (preview) preview.innerHTML = previewHtml;
}

// Download PDF from landing page
function downloadPDF() {
    const element = document.getElementById('invoiceContent');
    if (!element) return;

    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `invoice_${document.getElementById('invoiceNumber')?.value || 'draft'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

// Prompt to save (shows auth modal)
function promptToSave() {
    // Capture current invoice data
    pendingInvoiceToSave = {
        businessName: document.getElementById('businessName')?.value,
        logoUrl: logoBase64,
        clientName: document.getElementById('clientName')?.value,
        clientEmail: document.getElementById('clientEmail')?.value,
        clientAddress: document.getElementById('clientAddress')?.value,
        invoiceNumber: document.getElementById('invoiceNumber')?.value,
        currency: getCurrencySymbol(),
        items: items.filter(i => i.description),
        taxRate: parseFloat(document.getElementById('taxRate')?.value) || 0,
        discountAmount: parseFloat(document.getElementById('discount')?.value) || 0,
        notes: document.getElementById('notes')?.value
    };

    const { subtotal, taxAmount, total } = calculateTotals(items);
    pendingInvoiceToSave.subtotal = subtotal;
    pendingInvoiceToSave.taxAmount = taxAmount;
    pendingInvoiceToSave.totalAmount = total;

    showAuthModal('login');
}

// ============================================
// AUTH MODAL FUNCTIONS
// ============================================

function showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    switchAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'none';
    document.getElementById('authModalMessage').className = 'auth-message';
    document.getElementById('authModalMessage').innerHTML = '';
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('modalLoginForm');
    const signupForm = document.getElementById('modalSignupForm');
    const tabs = document.querySelectorAll('.auth-tab');

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

async function modalLogin() {
    const email = document.getElementById('modalLoginEmail').value;
    const password = document.getElementById('modalLoginPassword').value;

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
            authToken = data.token;
            currentUser = data.user;
            isPro = currentUser.isPro;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            closeAuthModal();

            // Save the pending invoice
            if (pendingInvoiceToSave) {
                await saveInvoiceToAccount();
                pendingInvoiceToSave = null;
            }

            // Switch to app
            switchToApp();
        } else {
            showAuthMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showAuthMessage('Error connecting to server', 'error');
    }
}

async function modalSignup() {
    const name = document.getElementById('modalSignupName').value;
    const email = document.getElementById('modalSignupEmail').value;
    const password = document.getElementById('modalSignupPassword').value;
    const confirmPassword = document.getElementById('modalSignupConfirmPassword').value;

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
            authToken = data.token;
            currentUser = data.user;
            isPro = currentUser.isPro;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            closeAuthModal();

            // Save the pending invoice
            if (pendingInvoiceToSave) {
                await saveInvoiceToAccount();
                pendingInvoiceToSave = null;
            }

            // Switch to app
            switchToApp();
        } else {
            showAuthMessage(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        showAuthMessage('Error connecting to server', 'error');
    }
}

function showAuthMessage(msg, type) {
    const messageDiv = document.getElementById('authModalMessage');
    messageDiv.textContent = msg;
    messageDiv.className = `auth-message show ${type}`;
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
}

// ============================================
// APP FUNCTIONS (After Login)
// ============================================

async function validateAndSwitchToApp() {
    try {
        const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            switchToApp();
        } else {
            logout();
        }
    } catch (error) {
        logout();
    }
}

function switchToApp() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    document.getElementById('userNameDisplay').textContent =
        currentUser.firstName || currentUser.email.split('@')[0];

    updateAppProBadge();

    // Initialize app builder
    document.getElementById('appInvoiceDate').valueAsDate = new Date();
    addAppItem();
    attachAppEvents();
    updateAppPreview();

    // Listen for currency changes in app
    document.getElementById('appCurrency').addEventListener('change', updateAppPreview);
}

function updateAppProBadge() {
    const badge = document.getElementById('proBadge');
    if (isPro) {
        badge.textContent = '✓ PRO Member';
        badge.className = 'badge pro';
    } else {
        badge.textContent = 'Free Plan';
        badge.className = 'badge free';
    }
    updateAppPreview();
}

function showAppPage(page) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`app${capitalize(page)}Page`).classList.add('active');

    if (page === 'invoices') {
        loadUserInvoices();
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// App invoice items
function addAppItem() {
    appItems.push({ description: '', quantity: 1, price: 0 });
    renderAppItems();
    updateAppPreview();
}

function removeAppItem(index) {
    appItems.splice(index, 1);
    renderAppItems();
    updateAppPreview();
}

function renderAppItems() {
    const container = document.getElementById('appItemsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (appItems.length === 0) {
        container.innerHTML = '<div class="empty-items">No items added yet. Click "Add Item" to start.</div>';
        return;
    }

    const currency = getAppCurrencySymbol();

    appItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-row';
        itemDiv.innerHTML = `
            <input type="text" placeholder="Item description" value="${escapeHtml(item.description)}"
                   onchange="updateAppItem(${index}, 'description', this.value)">
            <input type="number" placeholder="Qty" value="${item.quantity}"
                   onchange="updateAppItem(${index}, 'quantity', parseInt(this.value))">
            <input type="number" placeholder="Price (${currency})" step="0.01" value="${item.price}"
                   onchange="updateAppItem(${index}, 'price', parseFloat(this.value))">
            <button class="btn-remove" onclick="removeAppItem(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(itemDiv);
    });
}

function updateAppItem(index, field, value) {
    appItems[index][field] = value;
    updateAppPreview();
}

function calculateAppTotals() {
    const subtotal = appItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxRate = parseFloat(document.getElementById('appTaxRate')?.value) || 0;
    const discount = parseFloat(document.getElementById('appDiscount')?.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;

    return { subtotal, taxAmount, total };
}

function updateAppPreview() {
    const businessName = document.getElementById('appBusinessName')?.value || 'Your Business';
    const clientName = document.getElementById('appClientName')?.value || 'Client Name';
    const clientEmail = document.getElementById('appClientEmail')?.value;
    const clientAddress = document.getElementById('appClientAddress')?.value;
    const invoiceNumber = document.getElementById('appInvoiceNumber')?.value || 'AUTO';
    const invoiceDate = document.getElementById('appInvoiceDate')?.value || '';
    const notes = document.getElementById('appNotes')?.value;
    const currency = getAppCurrencySymbol();
    const { subtotal, taxAmount, total } = calculateAppTotals();
    const taxRate = document.getElementById('appTaxRate')?.value || 0;
    const discount = document.getElementById('appDiscount')?.value || 0;

    let itemsHtml = '';
    appItems.forEach(item => {
        if (item.description) {
            itemsHtml += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f0f2f5;">${escapeHtml(item.description)}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #f0f2f5;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #f0f2f5;">${formatMoney(item.price, currency)}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #f0f2f5; font-weight: 600;">${formatMoney(item.quantity * item.price, currency)}</td>
                </tr>
            `;
        }
    });

    const previewHtml = `
        <div class="invoice-preview" id="appInvoiceContent">
            <div class="preview-header">
                <div class="preview-header-content">
                    <div>
                        ${appLogoBase64 ? `<div class="preview-logo"><img src="${appLogoBase64}" alt="Logo"></div>` : ''}
                        <div class="preview-business-name">${escapeHtml(businessName)}</div>
                    </div>
                    <div>
                        <div class="preview-invoice-label">INVOICE</div>
                        <div class="preview-invoice-number">#${escapeHtml(invoiceNumber)}</div>
                    </div>
                </div>
            </div>

            <div class="preview-body">
                <div class="preview-grid">
                    <div class="preview-bill-to">
                        <h4>BILL TO</h4>
                        <div class="preview-client-name">${escapeHtml(clientName)}</div>
                        ${clientEmail ? `<div class="preview-client-email">${escapeHtml(clientEmail)}</div>` : ''}
                        ${clientAddress ? `<div class="preview-client-address">${escapeHtml(clientAddress)}</div>` : ''}
                    </div>
                    <div class="preview-date">
                        <strong>Date:</strong> ${invoiceDate}
                    </div>
                </div>

                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml || '<tr><td colspan="4" class="empty-items">No items added</td</tr>'}
                    </tbody>
                </table>

                <div class="preview-totals">
                    <div><span>Subtotal:</span><strong>${formatMoney(subtotal, currency)}</strong></div>
                    ${taxRate > 0 ? `<div><span>Tax (${taxRate}%):</span><strong>${formatMoney(taxAmount, currency)}</strong></div>` : ''}
                    ${discount > 0 ? `<div><span>Discount:</span><strong>-${formatMoney(discount, currency)}</strong></div>` : ''}
                    <div class="preview-grand-total">
                        <span>Total Amount:</span>
                        <strong>${formatMoney(total, currency)}</strong>
                    </div>
                </div>

                ${notes ? `
                <div class="preview-notes">
                    <div class="preview-notes-label">Notes:</div>
                    <div class="preview-notes-text">${escapeHtml(notes)}</div>
                </div>
                ` : ''}

                ${!isPro ? `
                <div class="preview-watermark">
                    <p>Generated by QuickInvoice</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    const preview = document.getElementById('appInvoicePreview');
    if (preview) preview.innerHTML = previewHtml;
}

async function saveInvoiceToAccount() {
    if (!authToken) {
        showAppMessage('Please login first', 'error');
        return;
    }

    const businessName = pendingInvoiceToSave?.businessName || document.getElementById('appBusinessName')?.value;
    const currentItems = pendingInvoiceToSave?.items || appItems;
    const logo = pendingInvoiceToSave?.logoUrl || appLogoBase64;
    const currency = pendingInvoiceToSave?.currency || getAppCurrencySymbol();

    if (!businessName) {
        showAppMessage('Please enter your business name', 'error');
        return;
    }

    if (currentItems.length === 0 || !currentItems[0].description) {
        showAppMessage('Please add at least one item', 'error');
        return;
    }

    let subtotal, taxAmount, total;

    if (pendingInvoiceToSave) {
        subtotal = pendingInvoiceToSave.subtotal;
        taxAmount = pendingInvoiceToSave.taxAmount;
        total = pendingInvoiceToSave.totalAmount;
    } else {
        const totals = calculateAppTotals();
        subtotal = totals.subtotal;
        taxAmount = totals.taxAmount;
        total = totals.total;
    }

    const invoiceData = {
        businessName: businessName,
        logoUrl: logo,
        clientName: pendingInvoiceToSave?.clientName || document.getElementById('appClientName')?.value || '',
        clientEmail: pendingInvoiceToSave?.clientEmail || document.getElementById('appClientEmail')?.value || '',
        clientAddress: pendingInvoiceToSave?.clientAddress || document.getElementById('appClientAddress')?.value || '',
        invoiceNumber: pendingInvoiceToSave?.invoiceNumber || document.getElementById('appInvoiceNumber')?.value || '',
        currency: currency,
        items: currentItems.filter(i => i.description),
        subtotal: subtotal,
        taxRate: pendingInvoiceToSave?.taxRate || parseFloat(document.getElementById('appTaxRate')?.value) || 0,
        taxAmount: taxAmount,
        discountAmount: pendingInvoiceToSave?.discountAmount || parseFloat(document.getElementById('appDiscount')?.value) || 0,
        totalAmount: total,
        notes: pendingInvoiceToSave?.notes || document.getElementById('appNotes')?.value || ''
    };

    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(invoiceData)
        });

        if (response.ok) {
            const savedInvoice = await response.json();
            showAppMessage(`✅ Invoice saved successfully! ID: ${savedInvoice.id}`, 'success');
            if (!isPro) {
                showAppMessage('You are on Free plan (5 invoice limit). Upgrade to PRO for unlimited storage!', 'info');
            }
            pendingInvoiceToSave = null;
        } else if (response.status === 401) {
            showAppMessage('Session expired. Please login again.', 'error');
            logout();
        } else {
            const error = await response.json();
            showAppMessage(error.error || 'Error saving invoice', 'error');
        }
    } catch (error) {
        showAppMessage('Error connecting to server', 'error');
    }
}

async function loadUserInvoices() {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const invoices = await response.json();
            const container = document.getElementById('invoicesList');

            if (invoices.length === 0) {
                container.innerHTML = '<div class="empty-items">No invoices yet. Create your first invoice!</div>';
                return;
            }

            container.innerHTML = invoices.map(inv => `
                <div class="invoice-item" onclick="loadInvoiceToApp(${inv.id})">
                    <div><strong>${inv.invoiceNumber}</strong> - ${inv.clientName}</div>
                    <small>Total: ${inv.currency || '₦'}${inv.totalAmount} | ${new Date(inv.createdAt).toLocaleDateString()}</small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

function downloadAppPDF() {
    const element = document.getElementById('appInvoiceContent');
    if (!element) return;

    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `invoice_${document.getElementById('appInvoiceNumber')?.value || 'draft'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

async function loadInvoiceToApp(id) {
    try {
        const response = await fetch(`${API_BASE}/invoices/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const invoice = await response.json();
            showAppMessage(`Loaded invoice ${invoice.invoiceNumber}`, 'success');

            document.getElementById('appBusinessName').value = invoice.businessName;
            document.getElementById('appClientName').value = invoice.clientName;
            document.getElementById('appClientEmail').value = invoice.clientEmail || '';
            document.getElementById('appClientAddress').value = invoice.clientAddress || '';
            document.getElementById('appInvoiceNumber').value = invoice.invoiceNumber;
            document.getElementById('appTaxRate').value = invoice.taxRate;
            document.getElementById('appDiscount').value = invoice.discountAmount;
            document.getElementById('appNotes').value = invoice.notes || '';

            if (invoice.currency) {
                const currencySelect = document.getElementById('appCurrency');
                for (let i = 0; i < currencySelect.options.length; i++) {
                    if (currencySelect.options[i].value === invoice.currency) {
                        currencySelect.selectedIndex = i;
                        break;
                    }
                }
            }

            appItems = invoice.items;
            renderAppItems();
            updateAppPreview();

            showAppPage('builder');
        }
    } catch (error) {
        console.error('Error loading invoice:', error);
    }
}

function attachAppEvents() {
    const inputs = ['appBusinessName', 'appClientName', 'appClientEmail', 'appClientAddress', 'appInvoiceNumber', 'appTaxRate', 'appDiscount', 'appNotes'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateAppPreview);
        }
    });

    document.getElementById('appInvoiceDate')?.addEventListener('change', updateAppPreview);

    document.getElementById('appLogoUpload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                appLogoBase64 = event.target.result;
                updateAppPreview();
            };
            reader.readAsDataURL(file);
        }
    });
}

function showAppMessage(msg, type) {
    const messageDiv = document.getElementById('appMessage');
    messageDiv.textContent = msg;
    messageDiv.className = `message show ${type}`;
    setTimeout(() => messageDiv.classList.remove('show'), 5000);
}

// Payment functions
async function upgradeWithPaystack() {
    if (!authToken) {
        showAppMessage('Please login first', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/payment/paystack/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ email: currentUser.email, amount: 29000, currency: 'NGN' })
        });

        const result = await response.json();
        if (result.success && result.authorization_url) {
            window.open(result.authorization_url, '_blank');
            showAppMessage('Payment initiated! Complete payment to upgrade to PRO.', 'success');
        } else {
            showAppMessage('Error initiating payment', 'error');
        }
    } catch (error) {
        showAppMessage('Error connecting to payment gateway', 'error');
    }
}

function upgradeWithSelar() {
    window.open('https://selar.co/quickinvoice-pro', '_blank');
    showAppMessage('After payment, your account will be upgraded within 24 hours.', 'success');
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;

    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';

    // Reset landing page
    items = [];
    logoBase64 = '';
    addItem();
    updatePreview();
}

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

    // Handle different currency formats
    if (currency === '₦' || currency === '¥') {
        return `${currency}${formattedAmount}`;
    } else if (currency === 'KSh') {
        return `KSh ${formattedAmount}`;
    } else if (currency === 'R') {
        return `R ${formattedAmount}`;
    } else {
        return `${currency}${formattedAmount}`;
    }
}
