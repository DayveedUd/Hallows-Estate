// ================================================
// HALLOWS ESTATE - RESIDENT PORTAL JS
// ================================================

window.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadResidentData();
    setupEventListeners();
});

// ============================================
// AUTHENTICATION CHECK
// ============================================
function checkAuthentication() {
    const token = localStorage.getItem('residentToken');
    if (!token) {
        window.location.href = 'resident-login.html';
    }
}

// ============================================
// LOAD & DISPLAY RESIDENT DATA
// ============================================
async function loadResidentData() {
    const token = localStorage.getItem('residentToken');
    const residentName = localStorage.getItem('residentName') || 'Resident';
    const residentUnit = localStorage.getItem('residentUnit') || 'Not Assigned';
    const residentPhone = localStorage.getItem('residentPhone') || '';

    // Header & Welcome Section Updates
    const residentNameEl = document.getElementById('residentName');
    const welcomeNameEl = document.getElementById('welcomeName');
    const residentInfoEl = document.getElementById('residentInfo');
    const profileAvatarEl = document.getElementById('profileAvatar');
    const phoneInputEl = document.getElementById('userPhoneInput');

    if (residentNameEl) residentNameEl.textContent = residentName;
    if (welcomeNameEl) welcomeNameEl.textContent = residentName;
    if (residentInfoEl) residentInfoEl.textContent = `Unit: ${residentUnit}`;
    if (phoneInputEl && residentPhone) phoneInputEl.value = residentPhone;

    // Avatar Initials
    if (profileAvatarEl && residentName) {
        const initials = residentName.split(' ').map(n => n[0]).join('').toUpperCase();
        profileAvatarEl.textContent = initials.substring(0, 2);
    }

    // Load API Data
    await fetchPaymentDetails(token);
    await fetchAnnouncements(token);
}

// ============================================
// SECTION & TAB SWITCHING
// ============================================
function switchTab(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    // Remove active state from tab buttons
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Highlight active tab by data-tab attribute
    const targetTab = Array.from(tabs).find(tab => 
        tab.getAttribute('data-tab') === sectionId
    );
    if (targetTab) {
        targetTab.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Alias for section switching compatibility
function switchSection(sectionId) {
    switchTab(sectionId);
}

// ============================================
// ANNOUNCEMENTS FILTERING
// ============================================
function filterAnnouncements(category) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));

    // Highlight button (find by data-filter attribute)
    const activeBtn = Array.from(filterBtns).find(btn => 
        btn.getAttribute('data-filter') === category
    );
    if (activeBtn) activeBtn.classList.add('active');

    // Filter Items
    const items = document.querySelectorAll('#announcementsList .announcement-item');
    items.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (category === 'all' || itemCategory === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// ============================================
// API INTEGRATIONS
// ============================================
async function fetchPaymentDetails(token) {
    try {
        const response = await fetch('http://localhost:5000/api/resident/payment-details', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load dues details');
        const res = await response.json();
        if (res.success && res.data) {
            updateDuesUI(res.data);
        }
    } catch (err) {
        console.warn('Using default dues state:', err.message);
    }
}

function updateDuesUI(data) {
    const duesStatusEl = document.getElementById('duesStatus');
    const outstandingEl = document.getElementById('outstandingBalance');
    const billBadgeEl = document.getElementById('billBadge');
    const modalAmountEl = document.getElementById('modalAmountDue');

    const formattedOutstanding = `₦${(data.outstanding || 0).toLocaleString()}`;

    if (duesStatusEl) duesStatusEl.textContent = data.paymentStatus || 'Pending';
    if (outstandingEl) outstandingEl.textContent = formattedOutstanding;
    if (billBadgeEl) billBadgeEl.textContent = data.paymentStatus || 'Unpaid';
    if (modalAmountEl) modalAmountEl.textContent = formattedOutstanding;
}

async function fetchAnnouncements(token) {
    try {
        const response = await fetch('http://localhost:5000/api/resident/announcements', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const res = await response.json();
        if (res.success && res.data?.length > 0) {
            renderAnnouncements(res.data);
        }
    } catch (err) {
        console.warn('Announcements offline/default used:', err.message);
    }
}

function renderAnnouncements(list) {
    const container = document.getElementById('announcementsList');
    if (!container) return;

    container.innerHTML = list.map(item => `
        <div class="announcement-item" data-category="${item.category?.toLowerCase() || 'estate'}">
            <span class="announcement-category">${item.category || 'Estate Management'}</span>
            <h3 class="announcement-title">${item.title}</h3>
            <p>${item.content || item.description}</p>
            <p class="announcement-date">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg> 
                Posted on ${new Date(item.createdAt || item.date).toLocaleDateString()}
            </p>
        </div>
    `).join('');
}

// ============================================
// MODAL CONTROLS & FORM ACTIONS
// ============================================
function openModal(modalId, facilityName = '') {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (modalId === 'bookingModal' && facilityName) {
        const bookingHeader = document.getElementById('bookingFacility');
        if (bookingHeader) {
            bookingHeader.textContent = `Book ${facilityName}`;
            bookingHeader.dataset.facility = facilityName;
        }
    }

    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modals when clicking overlay or ESC key
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => modal.classList.remove('active'));
    }
});

// Process Payment Action
function processPayment() {
    const phoneInput = document.getElementById('userPhoneInput');
    const phone = phoneInput?.value.trim();

    if (!phone) {
        showToast('⚠️ Please enter a valid phone number.');
        return;
    }

    showToast('Redirecting to payment gateway...');

    setTimeout(() => {
        // Dynamic UI Feedback
        const duesStatusEl = document.getElementById('duesStatus');
        const outstandingEl = document.getElementById('outstandingBalance');
        const billBadgeEl = document.getElementById('billBadge');
        const paymentHistoryBody = document.getElementById('paymentHistoryTable');

        if (duesStatusEl) duesStatusEl.textContent = 'Paid';
        if (outstandingEl) outstandingEl.textContent = '₦0.00';
        if (billBadgeEl) billBadgeEl.textContent = 'Paid';

        if (paymentHistoryBody) {
            const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const newRow = `
                <tr style="border-bottom: 1px solid var(--border-grey);">
                    <td style="padding: 1rem;">${today}</td>
                    <td style="padding: 1rem;">Annual Estate Dues</td>
                    <td style="padding: 1rem; text-align: right; font-weight: 600;">₦15,000.00</td>
                    <td style="padding: 1rem; text-align: center;"><span style="color: var(--success); font-size: 0.85rem; font-weight: 600;">Paid</span></td>
                </tr>
            `;
            if (paymentHistoryBody.innerHTML.includes('No payment history')) {
                paymentHistoryBody.innerHTML = newRow;
            } else {
                paymentHistoryBody.insertAdjacentHTML('afterbegin', newRow);
            }
        }

        closeModal('paymentModal');
        showToast('✓ Payment completed successfully!');
    }, 1200);
}

// Submit Maintenance Ticket Action
function submitMaintenance() {
    const categoryEl = document.getElementById('maintenanceCategory');
    const descEl = document.getElementById('maintenanceDesc');

    const category = categoryEl?.value;
    const desc = descEl?.value.trim();

    if (!category || !desc) {
        showToast('⚠️ Please select a category and fill in the description.');
        return;
    }

    // Dynamic UI Feedback: Prepend ticket card to maintenance list
    const maintenanceList = document.getElementById('maintenanceList');
    if (maintenanceList) {
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const ticketHTML = `
            <div class="card" style="margin-bottom: 1rem;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <div class="card-title" style="font-weight: 600; color: var(--navy);">${category}</div>
                    <span class="status-badge active" style="background: #e0f2fe; color: #0369a1; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">Submitted</span>
                </div>
                <p style="color: var(--dark-grey); font-size: 0.95rem; margin-bottom: 0.75rem;">${desc}</p>
                <div style="font-size: 0.8rem; color: #64748b;">Reported on: ${today}</div>
            </div>
        `;

        if (maintenanceList.innerHTML.includes('No active maintenance')) {
            maintenanceList.innerHTML = ticketHTML;
        } else {
            maintenanceList.insertAdjacentHTML('afterbegin', ticketHTML);
        }
    }

    // Reset Form & Close Modal
    categoryEl.value = '';
    descEl.value = '';

    closeModal('maintenanceModal');
    showToast('✓ Maintenance issue reported successfully!');
}

// Confirm Facility Booking Action
function confirmBooking() {
    const facilitySelectEl = document.getElementById('bookingFacilitySelect');
    const dateEl = document.getElementById('bookingDate');
    const timeEl = document.getElementById('bookingTime');

    const facilityName = facilitySelectEl?.value;
    const date = dateEl?.value;
    const time = timeEl?.value;

    if (!facilityName || !date || !time) {
        showToast('⚠️ Please select a facility, date, and time slot.');
        return;
    }

    // Dynamic UI Feedback: Update Facilities List
    const facilitiesList = document.getElementById('facilitiesList');
    if (facilitiesList) {
        const bookingCardHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; text-align: left; background: var(--light-grey); padding: 1rem; border-radius: 6px; border-left: 4px solid var(--navy); margin-bottom: 0.75rem;">
                <div>
                    <h4 style="margin: 0 0 0.25rem 0; color: var(--navy); font-size: 1rem;">${facilityName}</h4>
                    <div style="font-size: 0.85rem; color: var(--dark-grey);">📅 ${date} &nbsp;|&nbsp; ⏰ ${time}</div>
                </div>
                <span style="background: #dcfce7; color: #15803d; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">Confirmed</span>
            </div>
        `;

        if (facilitiesList.innerHTML.includes('no active bookings')) {
            facilitiesList.innerHTML = bookingCardHTML;
        } else {
            facilitiesList.insertAdjacentHTML('afterbegin', bookingCardHTML);
        }
    }

    // Reset form inputs
    facilitySelectEl.value = '';
    dateEl.value = '';
    timeEl.value = '';

    closeModal('bookingModal');
    showToast(`✓ Booking confirmed for ${facilityName}!`);
}

// ============================================
// EVENT LISTENERS & PROFILE HELPERS
// ============================================
function setupEventListeners() {
    // Tab navigation - data-tab attribute
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = tab.getAttribute('data-tab');
            if (sectionId) switchTab(sectionId);
        });
    });

    // Action buttons - data-action attribute
    const actionBtns = document.querySelectorAll('[data-action]');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.getAttribute('data-action');
            
            switch(action) {
                case 'openPayment':
                    openModal('paymentModal');
                    break;
                case 'openMaintenance':
                    openModal('maintenanceModal');
                    break;
                case 'openBooking':
                    openModal('bookingModal');
                    break;
                case 'processPayment':
                    processPayment();
                    break;
                case 'submitMaintenance':
                    submitMaintenance();
                    break;
                case 'confirmBooking':
                    confirmBooking();
                    break;
            }
        });
    });

    // Modal close buttons - data-close-modal attribute
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute('data-close-modal');
            closeModal(modalId);
        });
    });

    // Tab buttons in footer and other sections with data-tab
    const footerTabLinks = document.querySelectorAll('a[data-tab]');
    footerTabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (tabId) switchTab(tabId);
        });
    });

    // Profile menu click handler
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
        profileMenu.addEventListener('click', () => {
            const name = localStorage.getItem('residentName') || 'Resident';
            const unit = localStorage.getItem('residentUnit') || 'N/A';
            const action = confirm(`Resident Profile:\nName: ${name}\nUnit: ${unit}\n\nClick OK to Logout.`);
            if (action) handleLogout();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('residentLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutResident();
        });
    }
}

function handleLogout() {
    localStorage.removeItem('residentToken');
    localStorage.removeItem('residentId');
    localStorage.removeItem('residentName');
    localStorage.removeItem('residentUnit');
    window.location.href = 'resident-login.html';
}

// ============================================
// TOAST NOTIFICATIONS (WITH FALLBACK STYLING)
// ============================================
function showToast(message) {
    let toast = document.getElementById('toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    
    // Explicit inline styles to guarantee visual presentation regardless of CSS file setup
    Object.assign(toast.style, {
        display: 'block',
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '14px 24px',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        fontSize: '0.95rem',
        fontWeight: '500',
        zIndex: '99999',
        transition: 'opacity 0.3s ease'
    });

    if (window.toastTimeout) clearTimeout(window.toastTimeout);

    window.toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

// ============================================
// RESIDENT LOGOUT HANDLER
// ============================================
function logoutResident() {
    // 1. Clear resident session keys
    localStorage.removeItem('residentToken');
    localStorage.removeItem('residentData');
    sessionStorage.clear();

    // 2. Redirect back to resident login
    window.location.href = 'resident-login.html'; // Ensure this matches your login filename
}

console.log('Resident Portal initialized successfully');