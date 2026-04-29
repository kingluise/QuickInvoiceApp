// ============================================
// Invoice Builder Functions
// ============================================

let items = [];
let logoBase64 = '';

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    document.getElementById('invoiceDate').valueAsDate = new Date();
    addItem();
    attachEvents();
    updatePreview();
    await fetchUserStats();
});

function attachEvents() {
    const inputs = ['businessName', 'clientName', 'clientEmail', 'clientAddress',
                   'invoiceNumber', 'taxRate', 'discount', 'notes', 'currency'];
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

    const currency = document.getElementById('currency')?.value || '₦';

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

function calculateTotals() {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxRate = parseFloat(document.getElementById('taxRate')?.value) || 0;
    const discount = parseFloat(document.getElementById('discount')?.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount - discount;

    return { subtotal, taxAmount, total };
}

function updatePreview() {
    const businessName = document.getElementById('businessName')?.value || 'Your Business';
    const clientName = document.getElementById('clientName')?.value || 'Client Name';
    const clientEmail = document.getElementById('clientEmail')?.value;
    const clientAddress = document.getElementById('clientAddress')?.value;
    const invoiceNumber = document.getElementById('invoiceNumber')?.value || 'AUTO';
    const invoiceDate = document.getElementById('invoiceDate')?.value || '';
    const notes = document.getElementById('notes')?.value;
    const currency = document.getElementById('currency')?.value || '₦';
    const { subtotal, taxAmount, total } = calculateTotals();
    const taxRate = document.getElementById('taxRate')?.value || 0;
    const discount = document.getElementById('discount')?.value || 0;

    let itemsHtml = '';
    items.forEach(item => {
        if (item.description) {
            itemsHtml += `
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">${escapeHtml(item.description)}</td>
                    <td style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">${item.quantity}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${formatMoney(item.price, currency)}</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${formatMoney(item.quantity * item.price, currency)}</td>
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

                <table class="preview-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Description</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #e2e8f0;">Quantity</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Unit Price</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml || '<tr><td colspan="4" style="padding: 2rem; text-align: center; border: 1px solid #e2e8f0;">No items added</td></tr>'}
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

                ${notes ? `<div class="preview-notes"><strong>Notes:</strong><br>${escapeHtml(notes)}</div>` : ''}

                ${!isPro ? '<div class="preview-watermark"><p>Generated by QuickInvoice - <a href="upgrade.html">Upgrade to PRO</a> to remove watermark</p></div>' : ''}
            </div>
        </div>
    `;

    const preview = document.getElementById('invoicePreview');
    if (preview) preview.innerHTML = previewHtml;
}

async function saveInvoice() {
    if (!authToken) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Check if user has reached free limit
    if (!isPro && remainingFreeInvoices <= 0) {
        showMessage('message', 'You have reached your free limit of 2 invoices. Please upgrade to PRO for unlimited invoices.', 'error');
        setTimeout(() => {
            window.location.href = 'upgrade.html';
        }, 2000);
        return;
    }

    const businessName = document.getElementById('businessName')?.value;
    if (!businessName) {
        showMessage('message', 'Please enter your business name', 'error');
        return;
    }

    if (items.length === 0 || !items[0].description) {
        showMessage('message', 'Please add at least one item', 'error');
        return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();

    const invoiceData = {
        businessName: businessName,
        logoUrl: logoBase64,
        clientName: document.getElementById('clientName')?.value || '',
        clientEmail: document.getElementById('clientEmail')?.value || '',
        clientAddress: document.getElementById('clientAddress')?.value || '',
        invoiceNumber: document.getElementById('invoiceNumber')?.value || '',
        currency: document.getElementById('currency')?.value || '₦',
        items: items.filter(i => i.description),
        subtotal: subtotal,
        taxRate: parseFloat(document.getElementById('taxRate')?.value) || 0,
        taxAmount: taxAmount,
        discountAmount: parseFloat(document.getElementById('discount')?.value) || 0,
        totalAmount: total,
        notes: document.getElementById('notes')?.value || ''
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
            showMessage('message', `✅ Invoice saved successfully! ID: ${savedInvoice.id}`, 'success');
            await fetchUserStats();

            if (!isPro) {
                const remaining = remainingFreeInvoices - 1;
                if (remaining <= 0) {
                    showMessage('message', 'You have used your 2 free invoices. Upgrade to PRO for unlimited invoices!', 'info');
                } else {
                    showMessage('message', `You have ${remaining} free invoice(s) remaining this month.`, 'info');
                }
            }
        } else if (response.status === 401) {
            logout();
        } else {
            const error = await response.json();
            showMessage('message', error.error || 'Error saving invoice', 'error');
        }
    } catch (error) {
        showMessage('message', 'Error connecting to server', 'error');
    }
}

function downloadPDF() {
    const element = document.getElementById('invoiceContent');
    if (!element) {
        showMessage('message', 'No invoice to download', 'error');
        return;
    }

    // Clone the element to avoid affecting the original
    const cloneElement = element.cloneNode(true);

    // Ensure styles are properly applied for PDF
    cloneElement.style.width = '100%';
    cloneElement.style.maxWidth = '800px';
    cloneElement.style.margin = '0 auto';
    cloneElement.style.fontFamily = 'Inter, Arial, sans-serif';
    cloneElement.style.backgroundColor = 'white';

    // Fix table styles in clone
    const tables = cloneElement.querySelectorAll('.preview-table');
    tables.forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';

        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.padding = '10px';
                cell.style.border = '1px solid #e2e8f0';
            });
        });

        const headerCells = table.querySelectorAll('th');
        headerCells.forEach(cell => {
            cell.style.backgroundColor = '#f8f9fa';
            cell.style.fontWeight = '600';
        });

        // Align numeric columns to right
        const numericColumns = table.querySelectorAll('td:nth-child(2), td:nth-child(3), td:nth-child(4), th:nth-child(2), th:nth-child(3), th:nth-child(4)');
        numericColumns.forEach(cell => {
            cell.style.textAlign = 'right';
        });

        // Left align description column
        const descColumns = table.querySelectorAll('td:nth-child(1), th:nth-child(1)');
        descColumns.forEach(cell => {
            cell.style.textAlign = 'left';
        });
    });

    // Fix totals section
    const totals = cloneElement.querySelectorAll('.preview-totals');
    totals.forEach(total => {
        total.style.textAlign = 'right';
        total.style.marginTop = '20px';
        total.style.paddingTop = '20px';
        total.style.borderTop = '2px solid #e2e8f0';

        const amountSpans = total.querySelectorAll('strong');
        amountSpans.forEach(span => {
            span.style.marginLeft = '16px';
        });
    });

    // Fix grand total
    const grandTotal = cloneElement.querySelectorAll('.preview-grand-total');
    grandTotal.forEach(gt => {
        gt.style.marginTop = '10px';
        gt.style.fontSize = '18px';
        const strong = gt.querySelector('strong');
        if (strong) {
            strong.style.color = '#667eea';
            strong.style.fontSize = '20px';
        }
    });

    // Fix logo images
    const logos = cloneElement.querySelectorAll('.preview-logo img');
    logos.forEach(logo => {
        logo.style.maxWidth = '120px';
        logo.style.maxHeight = '60px';
        logo.style.objectFit = 'contain';
        logo.style.marginBottom = '10px';
    });

    // Fix preview header
    const header = cloneElement.querySelector('.preview-header');
    if (header) {
        header.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        header.style.color = 'white';
        header.style.padding = '24px';
    }

    // Fix header content alignment
    const headerContent = cloneElement.querySelector('.preview-header-content');
    if (headerContent) {
        headerContent.style.display = 'flex';
        headerContent.style.justifyContent = 'space-between';
        headerContent.style.alignItems = 'center';
        headerContent.style.flexWrap = 'wrap';
        headerContent.style.gap = '16px';
    }

    // Fix business name in header
    const businessName = cloneElement.querySelector('.preview-business-name');
    if (businessName) {
        businessName.style.fontSize = '20px';
        businessName.style.fontWeight = '600';
        businessName.style.marginTop = '8px';
    }

    // Fix invoice number
    const invoiceNum = cloneElement.querySelector('.preview-invoice-number');
    if (invoiceNum) {
        invoiceNum.style.fontSize = '24px';
        invoiceNum.style.fontWeight = '700';
    }

    // Fix watermark for free users
    if (!isPro) {
        const watermark = cloneElement.querySelector('.preview-watermark');
        if (watermark) {
            watermark.style.textAlign = 'center';
            watermark.style.marginTop = '30px';
            watermark.style.padding = '10px';
            watermark.style.backgroundColor = '#fef3c7';
            watermark.style.fontSize = '10px';
            watermark.style.color = '#92400e';
            watermark.style.borderRadius = '8px';
        }
    }

    // Fix notes section
    const notes = cloneElement.querySelectorAll('.preview-notes');
    notes.forEach(note => {
        note.style.marginTop = '20px';
        note.style.padding = '12px';
        note.style.backgroundColor = '#f8f9fa';
        note.style.borderRadius = '8px';
    });

    // Fix bill-to section
    const billTo = cloneElement.querySelector('.preview-bill-to h4');
    if (billTo) {
        billTo.style.color = '#667eea';
        billTo.style.marginBottom = '8px';
        billTo.style.fontSize = '12px';
        billTo.style.letterSpacing = '1px';
    }

    // Fix date section
    const dateStrong = cloneElement.querySelector('.preview-date strong');
    if (dateStrong) {
        dateStrong.style.color = '#667eea';
    }

    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `invoice_${document.getElementById('invoiceNumber')?.value || 'draft'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(cloneElement).save();
}
