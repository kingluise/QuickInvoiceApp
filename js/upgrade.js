// ============================================
// Upgrade Page Functions
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    await fetchUserStats();
    checkCurrentPlan();
});

function checkCurrentPlan() {
    const freeCard = document.querySelector('.pricing-card:first-child');
    const proNgCard = document.querySelector('.pricing-card.featured');
    const proIntlCard = document.querySelector('.pricing-card:last-child');

    if (isPro) {
        if (freeCard) {
            const freeCurrent = freeCard.querySelector('.current-plan');
            if (freeCurrent) freeCurrent.remove();
        }
        if (proNgCard) {
            const existingCurrent = proNgCard.querySelector('.current-plan');
            if (existingCurrent) existingCurrent.remove();
            const currentPlanDiv = document.createElement('div');
            currentPlanDiv.className = 'current-plan';
            currentPlanDiv.textContent = '✓ Your Current Plan';
            proNgCard.appendChild(currentPlanDiv);
        }
        if (proIntlCard) {
            const existingCurrent = proIntlCard.querySelector('.current-plan');
            if (existingCurrent) existingCurrent.remove();
        }

        const paymentButtons = document.querySelectorAll('.payment-buttons');
        paymentButtons.forEach(buttons => {
            if (buttons.parentElement.classList.contains('featured')) {
                buttons.innerHTML = '<div class="current-plan">You are already a PRO member! 🎉</div>';
            }
        });
    }
}

async function upgradeWithPaystack(plan) {
    if (!authToken) {
        window.location.href = 'dashboard.html';
        return;
    }

    let amount = 3500;
    let currency = 'NGN';

    if (plan === 'intl') {
        amount = 5;
        currency = 'USD';
    }

    showUpgradeMessage('Initializing payment...', 'success');

    try {
        const response = await fetch(`${API_BASE}/payment/paystack/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                email: currentUser.email,
                amount: amount,
                currency: currency
            })
        });

        const result = await response.json();
        if (result.success && result.authorization_url) {
            window.open(result.authorization_url, '_blank');
            showUpgradeMessage('Payment initiated! Complete payment to upgrade to PRO.', 'success');

            // Poll for payment status (simplified - webhook handles actual upgrade)
            setTimeout(() => {
                location.reload();
            }, 10000);
        } else {
            showUpgradeMessage('Error initiating payment. Please try again.', 'error');
        }
    } catch (error) {
        showUpgradeMessage('Error connecting to payment gateway', 'error');
    }
}

function upgradeWithSelar(plan) {
    let url = 'https://selar.co/quickinvoice-pro';
    if (plan === 'ng') {
        url = 'https://selar.co/quickinvoice-pro-ng';
    }
    window.open(url, '_blank');
    showUpgradeMessage('After payment, your account will be upgraded within 24 hours.', 'success');
}

function showUpgradeMessage(msg, type) {
    const messageDiv = document.getElementById('upgradeMessage');
    if (messageDiv) {
        messageDiv.textContent = msg;
        messageDiv.className = `upgrade-message show ${type}`;
        setTimeout(() => messageDiv.classList.remove('show'), 5000);
    }
}
