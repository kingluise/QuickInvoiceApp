// ============================================
// My Invoices Functions
// ============================================

let currentSelectedInvoice = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    await loadInvoices();
});

async function loadInvoices() {
    const container = document.getElementById('invoicesList');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const invoices = await response.json();
            const countSpan = document.getElementById('invoiceCount');
            if (countSpan) {
                countSpan.textContent = `${invoices.length} invoice(s)`;
            }

            if (invoices.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-invoice"></i>
                        <h3>No invoices yet</h3>
                        <p>Create your first invoice to get started</p>
                        <a href="invoice-builder.html" class="btn-create">Create Invoice</a>
                    </div>
                `;
                return;
            }

            container.innerHTML = invoices.map(inv => `
                <div class="invoice-item" onclick="viewInvoice(${inv.id})">
                    <div class="invoice-info">
                        <strong>${escapeHtml(inv.invoiceNumber)}</strong> - ${escapeHtml(inv.clientName)}
                        <br>
                        <small>Total: ${inv.currency || '₦'}${inv.totalAmount.toLocaleString()} | ${new Date(inv.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div class="invoice-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); downloadInvoice(${inv.id})" title="Download PDF">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); shareInvoiceLink(${inv.id})" title="Share via WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } else if (response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
        container.innerHTML = '<div class="empty-state"><p>Error loading invoices. Please try again.</p></div>';
    }
}

async function viewInvoice(id) {
    try {
        const response = await fetch(`${API_BASE}/invoices/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            currentSelectedInvoice = await response.json();
            displayInvoiceModal(currentSelectedInvoice);
        }
    } catch (error) {
        console.error('Error loading invoice:', error);
    }
}

function displayInvoiceModal(invoice) {
    const modal = document.getElementById('invoiceModal');
    const content = document.getElementById('modalInvoiceContent');

    const currency = invoice.currency || '₦';

    let itemsHtml = '';
    invoice.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${escapeHtml(item.description)}</td>
                <td>${item.quantity}</td>
                <td>${formatMoney(item.price, currency)}</td>
                <td>${formatMoney(item.quantity * item.price, currency)}</td>
            </tr>
        `;
    });

    const html = `
        <div class="invoice-preview">
            <div class="preview-header">
                <div class="preview-header-content">
                    <div>
                        ${invoice.logoUrl ? `<div class="preview-logo"><img src="${invoice.logoUrl}" alt="Logo"></div>` : ''}
                        <div class="preview-business-name">${escapeHtml(invoice.businessName)}</div>
                    </div>
                    <div>
                        <div class="preview-invoice-label">INVOICE</div>
                        <div class="preview-invoice-number">#${escapeHtml(invoice.invoiceNumber)}</div>
                    </div>
                </div>
            </div>
            <div class="preview-body">
                <div class="preview-grid">
                    <div class="preview-bill-to">
                        <h4>BILL TO</h4>
                        <div class="preview-client-name">${escapeHtml(invoice.clientName)}</div>
                        ${invoice.clientEmail ? `<div class="preview-client-email">${escapeHtml(invoice.clientEmail)}</div>` : ''}
                        ${invoice.clientAddress ? `<div class="preview-client-address">${escapeHtml(invoice.clientAddress)}</div>` : ''}
                    </div>
                    <div class="preview-date">
                        <strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}
                    </div>
                </div>

                <table class="preview-table">
                    <thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>

                <div class="preview-totals">
                    <div><span>Subtotal:</span><strong>${formatMoney(invoice.subtotal, currency)}</strong></div>
                    ${invoice.taxRate > 0 ? `<div><span>Tax (${invoice.taxRate}%):</span><strong>${formatMoney(invoice.taxAmount, currency)}</strong></div>` : ''}
                    ${invoice.discountAmount > 0 ? `<div><span>Discount:</span><strong>-${formatMoney(invoice.discountAmount, currency)}</strong></div>` : ''}
                    <div class="preview-grand-total">
                        <span>Total Amount:</span>
                        <strong>${formatMoney(invoice.totalAmount, currency)}</strong>
                    </div>
                </div>

                ${invoice.notes ? `<div class="preview-notes"><strong>Notes:</strong><br>${escapeHtml(invoice.notes)}</div>` : ''}
            </div>
        </div>
    `;

    content.innerHTML = html;
    modal.style.display = 'flex';
}

function closeInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    modal.style.display = 'none';
    currentSelectedInvoice = null;
}

function downloadModalPDF() {
    if (!currentSelectedInvoice) return;

    const element = document.querySelector('#modalInvoiceContent .invoice-preview');
    if (!element) return;

    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `invoice_${currentSelectedInvoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

function shareInvoice() {
    if (!currentSelectedInvoice) return;

    const message = `📄 *Invoice from ${currentSelectedInvoice.businessName}*\n\n` +
                   `To: ${currentSelectedInvoice.clientName}\n` +
                   `Invoice #: ${currentSelectedInvoice.invoiceNumber}\n` +
                   `Total Amount: ${currentSelectedInvoice.currency || '₦'}${currentSelectedInvoice.totalAmount}\n\n` +
                   `Generated by QuickInvoice`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}

async function downloadInvoice(id) {
    try {
        const response = await fetch(`${API_BASE}/invoices/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const invoice = await response.json();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = generateInvoiceHTML(invoice);
            document.body.appendChild(tempDiv);

            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `invoice_${invoice.invoiceNumber}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(tempDiv).save();
            setTimeout(() => document.body.removeChild(tempDiv), 1000);
        }
    } catch (error) {
        console.error('Error downloading invoice:', error);
    }
}

function generateInvoiceHTML(invoice) {
    const currency = invoice.currency || '₦';
    let itemsHtml = '';
    invoice.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.description)}</td>
                <td style="padding: 12px; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right;">${formatMoney(item.price, currency)}</td>
                <td style="padding: 12px; text-align: right;">${formatMoney(item.quantity * item.price, currency)}</td>
            </tr>
        `;
    });

    return `
        <div style="padding: 2rem; font-family: 'Inter', Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #667eea;">
                <div>
                    ${invoice.logoUrl ? `<img src="${invoice.logoUrl}" style="max-width: 120px; margin-bottom: 1rem;">` : ''}
                    <h2 style="margin: 0;">${escapeHtml(invoice.businessName)}</h2>
                </div>
                <div>
                    <p style="color: #667eea; margin: 0; font-size: 0.875rem;">INVOICE</p>
                    <h1 style="margin: 0; font-size: 1.5rem;">#${escapeHtml(invoice.invoiceNumber)}</h1>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <h4 style="color: #667eea; margin-bottom: 0.5rem;">BILL TO</h4>
                    <p><strong>${escapeHtml(invoice.clientName)}</strong></p>
                    ${invoice.clientEmail ? `<p>${escapeHtml(invoice.clientEmail)}</p>` : ''}
                    ${invoice.clientAddress ? `<p>${escapeHtml(invoice.clientAddress)}</p>` : ''}
                </div>
                <div>
                    <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px; text-align: left;">Description</th>
                        <th style="padding: 12px; text-align: center;">Quantity</th>
                        <th style="padding: 12px; text-align: right;">Unit Price</th>
                        <th style="padding: 12px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <div style="text-align: right;">
                <div>Subtotal: ${formatMoney(invoice.subtotal, currency)}</div>
                ${invoice.taxRate > 0 ? `<div>Tax (${invoice.taxRate}%): ${formatMoney(invoice.taxAmount, currency)}</div>` : ''}
                ${invoice.discountAmount > 0 ? `<div>Discount: -${formatMoney(invoice.discountAmount, currency)}</div>` : ''}
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e2e8f0; font-size: 1.2rem; font-weight: bold;">
                    Total: ${formatMoney(invoice.totalAmount, currency)}
                </div>
            </div>

            ${invoice.notes ? `<div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;"><strong>Notes:</strong><br>${escapeHtml(invoice.notes)}</div>` : ''}

            ${!isPro ? '<div style="margin-top: 2rem; text-align: center; font-size: 0.8rem; color: #999;">Generated by QuickInvoice</div>' : ''}
        </div>
    `;
}

function shareInvoiceLink(id) {
    const message = `Check out my invoice on QuickInvoice! View it here: ${window.location.origin}/view-invoice.html?id=${id}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}
