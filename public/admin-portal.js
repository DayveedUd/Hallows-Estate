// ============================================
// ADMIN PORTAL - JavaScript Functionality
// ============================================

// --- SECTION & TAB NAVIGATION ---
function switchTab(sectionId) {
    switchSection(sectionId);
}

function switchSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    // Remove active class from all nav tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => tab.classList.remove('active'));

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }

    // Highlight corresponding nav tab based on data-tab attribute matching sectionId
    navTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === sectionId) {
            tab.classList.add('active');
        }
    });
}

// --- MODAL FUNCTIONS ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking backdrop
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// --- ANNOUNCEMENT MANAGEMENT ---
async function postAnnouncement() {
    const category = document.getElementById('newAnnouncementCategory')?.value;
    const title = document.getElementById('newAnnouncementTitle')?.value;
    const body = document.getElementById('newAnnouncementBody')?.value;

    if (!title || !body) {
        alert('Please fill in both the title and body for the announcement.');
        return;
    }

    try {
        const response = await adminFetch('/api/admin/announcements', {
            method: 'POST',
            body: JSON.stringify({ title, content: body, category })
        });
        if (!response.ok || !response.data?.success) throw new Error(response.data?.message || 'Unable to publish announcement');
        document.getElementById('newAnnouncementTitle').value = '';
        document.getElementById('newAnnouncementBody').value = '';
        closeModal('announcementModal');
        await loadAdminAnnouncements();
        showAdminToast('Announcement published.');
    } catch (error) {
        showAdminToast(error.message);
    }
}

async function adminFetch(url, options = {}) {
    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                ...(options.headers || {})
            }
        });
    } catch (error) {
        return { ok: false, status: 0, data: { message: 'Network error' } };
    }
    const data = await response.json().catch(() => ({}));
    // 401 now means a genuinely bad/expired token (database faults are 5xx), so it is safe to sign out.
    if (response.status === 401) {
        logoutAdmin();
    }
    return { ok: response.ok, status: response.status, data };
}

// Failed background refreshes used to be silent, which made a broken connection look
// like "the admin portal isn't showing the resident's data". Surface it (at most once a minute).
let lastLoadErrorAt = 0;
function reportLoadError(label, response) {
    console.warn(`Admin: could not load ${label}`, response.status, response.data?.message);
    const now = Date.now();
    if (now - lastLoadErrorAt < 60000) return;
    lastLoadErrorAt = now;
    showAdminToast(response.status === 0
        ? 'Connection problem: portal data may be out of date.'
        : `Could not load ${label}: ${response.data?.message || 'server error'}`);
}

async function loadAdminData() {
    await Promise.all([
        loadAdminStats(),
        loadAdminResidents(),
        loadAdminTickets(),
        loadAdminAnnouncements()
    ]);
}

async function loadAdminStats() {
    const response = await adminFetch('/api/admin/dashboard-stats');
    if (!response.ok || !response.data.success) return reportLoadError('dashboard stats', response);
    const stats = response.data.data;
    document.getElementById('metricTotalResidents').textContent = stats.totalResidents;
    document.getElementById('metricPendingApprovals').textContent = stats.pendingApprovals;
    document.getElementById('metricOpenComplaints').textContent = stats.openComplaints;
    document.getElementById('metricDuesCollected').textContent = `₦${Number(stats.duesCollected || 0).toLocaleString()}`;
}

function residentActionButtons(resident) {
    const btn = (label, status, cls) =>
        `<button class="btn ${cls} resident-status-btn" data-id="${escapeHTML(resident._id)}" data-status="${status}">${label}</button>`;
    switch (resident.accountStatus) {
        case 'pending':   return btn('Approve', 'active', 'btn-primary') + ' ' + btn('Reject', 'rejected', 'btn-secondary');
        case 'active':    return btn('Suspend', 'suspended', 'btn-secondary');
        case 'suspended': return btn('Reactivate', 'active', 'btn-primary');
        case 'rejected':  return btn('Approve', 'active', 'btn-primary');
        default:          return '';
    }
}

async function loadAdminResidents() {
    const response = await adminFetch('/api/admin/residents');
    if (!response.ok || !response.data.success) return reportLoadError('residents', response);
    const residents = response.data.data || [];

    // The dues ledger is built from the same payload, so both tabs always agree.
    renderAdminDues(residents);

    const body = document.getElementById('residentTableBody');
    if (!body) return;
    body.innerHTML = residents.map(resident => `
        <tr class="resident-row" data-status="${escapeHTML(String(resident.status || '').toLowerCase())}" data-account-status="${escapeHTML(resident.accountStatus)}">
            <td style="padding: 1rem;">${escapeHTML([resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(' '))}</td>
            <td style="padding: 1rem;">${escapeHTML(resident.username)}</td>
            <td style="padding: 1rem;">${escapeHTML(resident.status)}</td>
            <td style="padding: 1rem;">${escapeHTML(resident.propertyType)}</td>
            <td style="padding: 1rem;">${escapeHTML(resident.email)}<br>${escapeHTML(resident.phone)}</td>
            <td style="padding: 1rem;"><span class="status-badge active">${escapeHTML(resident.accountStatus)}</span></td>
            <td style="padding: 1rem; text-align: center;">${residentActionButtons(resident)}</td>
        </tr>
    `).join('');

    body.querySelectorAll('.resident-status-btn').forEach(button => {
        button.addEventListener('click', () => updateResidentStatus(button.dataset.id, button.dataset.status));
    });

    // Re-rendering resets row visibility; re-apply whichever filter is selected so the
    // 20-second refresh doesn't silently undo it.
    filterResidents(window.currentResidentFilter || 'all');
}

async function updateResidentStatus(residentId, accountStatus) {
    let rejectionReason = '';
    if (accountStatus === 'rejected') {
        const reason = prompt('Reason for rejection (optional):');
        if (reason === null) return;
        rejectionReason = reason.trim();
    }
    const response = await adminFetch(`/api/admin/residents/${residentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ accountStatus, rejectionReason })
    });
    if (!response.ok || !response.data.success) return showAdminToast(response.data.message || 'Unable to update resident');
    await Promise.all([loadAdminResidents(), loadAdminStats()]);
    showAdminToast(`Resident account ${accountStatus}.`);
}

// --- DUES LEDGER ---
function renderAdminDues(residents) {
    const body = document.getElementById('duesTableBody');
    if (!body) return;
    const billable = residents.filter(resident => resident.accountStatus === 'active');
    if (!billable.length) {
        body.innerHTML = '<tr><td colspan="6" style="padding: 1rem; color: var(--text-muted);">No approved residents to bill yet.</td></tr>';
        return;
    }
    const naira = value => `₦${Number(value || 0).toLocaleString()}`;
    body.innerHTML = billable.map(resident => {
        const outstanding = Math.max((Number(resident.dueAmount) || 0) - (Number(resident.amountPaid) || 0), 0);
        const badgeColors = {
            Paid: 'background: rgba(40, 167, 69, 0.12); color: #28a745;',
            Overdue: 'background: rgba(220, 53, 69, 0.12); color: #dc3545;'
        };
        const badgeStyle = badgeColors[resident.paymentStatus] || 'background: rgba(255, 193, 7, 0.18); color: #a67c00;';
        const fullName = [resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(' ');
        return `
        <tr class="dues-row">
            <td style="padding: 1rem;">${escapeHTML(fullName)}<br><small style="color: var(--text-muted);">${escapeHTML(resident.username)}</small></td>
            <td style="padding: 1rem;">${escapeHTML(resident.propertyType)}</td>
            <td style="padding: 1rem;">${naira(resident.dueAmount)}</td>
            <td style="padding: 1rem;"><span style="padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; ${badgeStyle}">${escapeHTML(resident.paymentStatus || 'Pending')}</span>${outstanding ? `<br><small style="color: var(--text-muted);">${naira(outstanding)} outstanding</small>` : ''}</td>
            <td style="padding: 1rem;">${resident.lastPaymentDate ? new Date(resident.lastPaymentDate).toLocaleDateString() : '—'}</td>
            <td style="padding: 1rem; text-align: right;">${outstanding ? `<button class="btn btn-primary dues-pay-btn" data-id="${escapeHTML(resident._id)}" data-outstanding="${outstanding}">Record Payment</button>` : ''}</td>
        </tr>`;
    }).join('');

    body.querySelectorAll('.dues-pay-btn').forEach(button => {
        button.addEventListener('click', () => recordResidentPayment(button.dataset.id, Number(button.dataset.outstanding)));
    });
}

async function recordResidentPayment(residentId, outstanding) {
    const input = prompt('Amount received (₦):', outstanding);
    if (input === null) return;
    const amount = Number(String(input).replace(/[₦,\s]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return showAdminToast('Enter a valid amount greater than zero.');

    const response = await adminFetch(`/api/admin/residents/${residentId}/payment`, {
        method: 'POST',
        body: JSON.stringify({ amount })
    });
    if (!response.ok || !response.data.success) return showAdminToast(response.data.message || 'Unable to record payment');
    await Promise.all([loadAdminResidents(), loadAdminStats()]);
    showAdminToast('Payment recorded.');
}

async function loadAdminTickets() {
    const response = await adminFetch('/api/admin/tickets');
    if (!response.ok || !response.data.success) return reportLoadError('tickets', response);
    const container = document.getElementById('complaintsContainer');
    if (!container) return;
    container.innerHTML = response.data.data.length ? response.data.data.map(ticket => `
        <div class="card complaint-card" style="margin-bottom: 1rem;">
            <div class="card-header" style="display:flex; justify-content:space-between; gap:1rem;">
                <div class="card-title">${escapeHTML(ticket.category)}</div>
                <span class="status-badge active">${escapeHTML(String(ticket.status).replace('_', ' '))}</span>
            </div>
            <p>${escapeHTML(ticket.description)}</p>
            <p style="color: var(--text-muted);">${escapeHTML([ticket.resident?.firstName, ticket.resident?.lastName].filter(Boolean).join(' ') || 'Unknown resident')}${ticketLocation(ticket.resident)} | ${new Date(ticket.createdAt).toLocaleDateString()}${ticket.priority === 'urgent' ? ' | <strong style="color: #dc2626;">URGENT</strong>' : ''}${ticket.assignedTo ? ` | Handled by ${escapeHTML(ticket.assignedTo.firstName)}` : ''}</p>
            <select class="ticket-status-select" data-id="${ticket._id}">
                ${['open', 'in_progress', 'resolved', 'closed'].map(status => `<option value="${status}" ${status === ticket.status ? 'selected' : ''}>${status.replace('_', ' ')}</option>`).join('')}
            </select>
        </div>
    `).join('') : '<div class="card"><p>No maintenance tickets yet.</p></div>';

    container.querySelectorAll('.ticket-status-select').forEach(select => {
        select.addEventListener('change', () => updateTicketStatus(select.dataset.id, select.value));
    });
}

function ticketLocation(resident) {
    if (!resident) return '';
    const parts = [];
    if (resident.unit && resident.unit !== 'Not Assigned') parts.push(`Unit ${resident.unit}`);
    if (resident.block && resident.block !== 'Not Assigned') parts.push(`Block ${resident.block}`);
    return parts.length ? ` | ${escapeHTML(parts.join(', '))}` : '';
}

async function updateTicketStatus(ticketId, status) {
    const response = await adminFetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
    if (!response.ok || !response.data.success) return showAdminToast(response.data.message || 'Unable to update ticket');
    await Promise.all([loadAdminTickets(), loadAdminStats()]);
    showAdminToast('Ticket status updated.');
}

async function loadAdminAnnouncements() {
    const response = await adminFetch('/api/admin/announcements');
    if (!response.ok || !response.data.success) return reportLoadError('announcements', response);
    const container = document.getElementById('adminAnnouncementsList');
    if (!container) return;
    container.innerHTML = response.data.data.length ? response.data.data.map(item => `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                <h3 style="margin:0;">${escapeHTML(item.title)}</h3>
                <span class="status-badge active">${escapeHTML(item.category)}</span>
            </div>
            <p style="color:var(--text-muted);">Posted: ${new Date(item.createdAt).toLocaleDateString()}</p>
            <p>${escapeHTML(item.content)}</p>
        </div>
    `).join('') : '<div class="card"><p>No announcements published yet.</p></div>';
}

function showAdminToast(message) {
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    Object.assign(toast.style, { display: 'block', position: 'fixed', bottom: '24px', right: '24px', background: '#0f172a', color: '#fff', padding: '14px 24px', borderRadius: '8px', zIndex: '99999' });
    clearTimeout(window.adminToastTimeout);
    window.adminToastTimeout = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// --- HELPER UTILITIES ---
function escapeHTML(value = '') {
    return String(value ?? '').replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- KEYBOARD & INITIALIZATION ---
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => modal.classList.remove('active'));
    }
});

// --- PROFILE MODAL ---
function viewResidentProfile(residentName) {
    // Sample data for residents (in a real app, this would come from a database)
    const residentData = {
        'David Udoinyang': {
            name: 'David Udoinyang',
            unit: 'Block A, Flat 12',
            status: 'Owner',
            email: 'david@email.com',
            phone: '+234 801 234 5678',
            property: 'Flat',
            payment: 'Paid',
            joinDate: '15 Mar 2024'
        },
        'Chioma Okafor': {
            name: 'Chioma Okafor',
            unit: 'Block B, Flat 5',
            status: 'Tenant',
            email: 'chioma@email.com',
            phone: '+234 802 987 6543',
            property: 'Flat',
            payment: 'Paid',
            joinDate: '22 Apr 2024'
        },
        'James Adeyemi': {
            name: 'James Adeyemi',
            unit: 'Block C, Duplex 8',
            status: 'Owner',
            email: 'james@email.com',
            phone: '+234 803 456 7890',
            property: 'Detached Duplex',
            payment: 'Overdue',
            joinDate: '10 Feb 2024'
        },
        'Zainab Hassan': {
            name: 'Zainab Hassan',
            unit: 'Block A, Flat 8',
            status: 'Tenant',
            email: 'zainab@email.com',
            phone: '+234 704 567 8901',
            property: 'Flat',
            payment: 'Pending',
            joinDate: '30 May 2024'
        },
        'Ifeanyi Nwosu': {
            name: 'Ifeanyi Nwosu',
            unit: 'Block D, Flat 15',
            status: 'Owner',
            email: 'ifeanyi@email.com',
            phone: '+234 805 678 9012',
            property: 'Flat',
            payment: 'Paid',
            joinDate: '08 Mar 2024'
        }
    };
 
    const resident = residentData[residentName];
    if (resident) {
        // Update modal with resident data
        document.getElementById('profileName').textContent = resident.name;
        document.getElementById('profileUnit').textContent = resident.unit;
        document.getElementById('profileStatus').textContent = resident.status;
        document.getElementById('profileEmail').textContent = resident.email;
        document.getElementById('profilePhone').textContent = resident.phone;
        document.getElementById('profileProperty').textContent = resident.property;
        
        // Set payment status with badge
        const paymentBadge = resident.payment === 'Paid' 
            ? '<span class="badge-paid">Paid</span>' 
            : resident.payment === 'Pending'
            ? '<span class="badge-pending">Pending</span>'
            : '<span class="badge-overdue">Overdue</span>';
        document.getElementById('profilePayment').innerHTML = paymentBadge;
        
        document.getElementById('profileDate').textContent = resident.joinDate;
 
        // Get initials for avatar
        const initials = resident.name.split(' ').map(n => n[0]).join('');
        document.querySelector('.profile-avatar-large').textContent = initials;
 
        openModal('profileModal');
    }
}

// --- FILTER FUNCTIONALITY ---
function filterResidents(filterValue) {
    window.currentResidentFilter = filterValue;

    // Update active button
    const residentFilterBtns = document.querySelectorAll('#residents .filter-btn');
    residentFilterBtns.forEach(b => b.classList.remove('active'));
    
    // Find and mark the clicked button as active
    const activeBtn = Array.from(residentFilterBtns).find(btn => btn.getAttribute('data-filter') === filterValue);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Filter resident rows
    const residentRows = document.querySelectorAll('.resident-row');
    residentRows.forEach(row => {
        // "Pending Approval" is an account state, not an Owner/Tenant status.
        const attribute = filterValue === 'pending' ? 'data-account-status' : 'data-status';
        if (filterValue === 'all' || row.getAttribute(attribute) === filterValue) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
 
// --- DOM CONTENT LOADED - EVENT LISTENER SETUP ---
document.addEventListener('DOMContentLoaded', function() {
    // Setup tab navigation
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-tab');
            if (sectionId) switchSection(sectionId);
        });
    });

    // Setup action buttons
    const actionBtns = document.querySelectorAll('[data-action]');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.getAttribute('data-action');
            
            if (action === 'openAnnouncement') {
                openModal('announcementModal');
            } else if (action === 'postAnnouncement') {
                postAnnouncement();
            }
        });
    });

    // Setup tab buttons (data-tab on all buttons, not just nav-tab)
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            if (tabId) switchSection(tabId);
        });
    });

    // Setup modal close buttons
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-close-modal');
            closeModal(modalId);
        });
    });

    // Setup filter buttons
    const filterBtns = document.querySelectorAll('[data-filter]');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const filterValue = this.getAttribute('data-filter');
            
            // Update active button styling
            const filterGroup = this.parentElement.querySelectorAll('[data-filter]');
            filterGroup.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Call appropriate filter function
            if (this.parentElement.closest('#residents')) {
                filterResidents(filterValue);
            }
        });
    });

    // Resident filter buttons (more specific)
    const residentFilterBtns = document.querySelectorAll('#residents .filter-btn');
    residentFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');
            filterResidents(filterValue);
        });
    });
});

// --- RESIDENT SEARCH ---
const residentSearch = document.getElementById('residentSearch');
if (residentSearch) {
    residentSearch.addEventListener('input', function() {
        const searchValue = this.value.toLowerCase();
        const residentRows = document.querySelectorAll('.resident-row');
 
        residentRows.forEach(row => {
            const rowText = row.textContent.toLowerCase();
            row.style.display = rowText.includes(searchValue) ? '' : 'none';
        });
    });
}

// --- COMPLAINT FILTER ---
const complaintFilterBtns = document.querySelectorAll('#complaints .filter-btn');
complaintFilterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const filterValue = this.getAttribute('data-filter');
        
        complaintFilterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
 
        const complaintCards = document.querySelectorAll('.complaint-card');
        complaintCards.forEach(card => {
            let shouldShow = false;
            if (filterValue === 'all') {
                shouldShow = true;
            } else {
                const badges = card.querySelectorAll('.status-badge');
                badges.forEach(badge => {
                    if (badge.textContent.toLowerCase().includes(filterValue)) {
                        shouldShow = true;
                    }
                });
            }
            card.style.display = shouldShow ? '' : 'none';
        });
    });
});

// --- QUICK STATS ANIMATION ---
function animateCounter(element, target, duration = 1000) {
    let current = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}
 
// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Animate stat numbers on first load
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const text = stat.textContent;
        const number = parseInt(text);
        if (!isNaN(number)) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !stat.animated) {
                    animateCounter(stat, number, 500);
                    stat.animated = true;
                }
            });
            observer.observe(stat);
        }
    });
});
 
// --- KEYBOARD NAVIGATION ---
document.addEventListener('keydown', function(e) {
    // Escape closes modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => modal.classList.remove('active'));
    }
 
    // Ctrl/Cmd + K opens search (you can implement quick search modal)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Implement quick search if needed
    }
});
 
// --- TABLE SORTING (Optional Enhancement) ---
function setupTableSorting() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                sortTable(table, index);
            });
        });
    });
}
 
function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        // Try numeric sort first
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        
        // Fallback to string sort
        return aValue.localeCompare(bValue);
    });
 
    rows.forEach(row => tbody.appendChild(row));
}
 
// Initialize on page load
document.addEventListener('DOMContentLoaded', setupTableSorting);
 
// --- LOCAL STORAGE FOR SETTINGS (Optional) ---
function saveSettings(key, value) {
    localStorage.setItem(`admin_${key}`, JSON.stringify(value));
}
 
function loadSettings(key, defaultValue) {
    const stored = localStorage.getItem(`admin_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
}
 
// --- NOTIFICATION BADGE ---
function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.textContent = count;
        if (count > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}
 
// --- DEFAULT ACTIVE SECTION ---
window.addEventListener('load', function() {
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection && !dashboardSection.classList.contains('active')) {
        switchSection('dashboard');
    }
});
 
// --- FORM VALIDATION (Optional) ---
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;
 
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = 'var(--danger)';
            isValid = false;
        } else {
            input.style.borderColor = 'var(--border-light)';
        }
    });
 
    return isValid;
}
 
// --- EXPORT DATA (Optional Enhancement) ---
function exportTableToCSV(tableSelector, filename) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
 
    let csv = [];
    
    // Get headers
    const headers = table.querySelectorAll('th');
    const headerRow = Array.from(headers).map(h => `"${h.textContent.trim()}"`).join(',');
    csv.push(headerRow);
 
    // Get rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => `"${cell.textContent.trim()}"`).join(',');
        csv.push(rowData);
    });
 
    // Download CSV
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}
 
// --- DARK MODE TOGGLE (Optional) ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    saveSettings('darkMode', isDarkMode);
}
 
// Load dark mode preference on page load
document.addEventListener('DOMContentLoaded', function() {
    const darkMode = loadSettings('darkMode', false);
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
});

// ============================================
// ADMIN LOGOUT HANDLER
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('adminToken')) {
        window.location.href = 'admin-login.html';
        return;
    }
    loadAdminData();
    window.adminRefreshTimer = setInterval(loadAdminData, 20000);
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && localStorage.getItem('adminToken')) loadAdminData();
});

function logoutAdmin() {
    // 1. Clear stored administrative credentials
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    sessionStorage.clear();

    // 2. Redirect back to admin login
    window.location.href = 'admin-login.html'; // Ensure this matches your login filename
}

// Attach listener cleanly after DOM renders
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutAdmin();
        });
    }
});

console.log('Admin Portal initialized successfully');
