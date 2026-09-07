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
function postAnnouncement() {
    const category = document.getElementById('newAnnouncementCategory')?.value;
    const title = document.getElementById('newAnnouncementTitle')?.value;
    const body = document.getElementById('newAnnouncementBody')?.value;

    if (!title || !body) {
        alert('Please fill in both the title and body for the announcement.');
        return;
    }

    const announcementsList = document.getElementById('adminAnnouncementsList');
    if (announcementsList) {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '1rem';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <h3 style="margin: 0;">${escapeHTML(title)}</h3>
                <span class="status-badge active">${escapeHTML(category)}</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Posted: Just now</p>
            <p>${escapeHTML(body)}</p>
        `;
        announcementsList.prepend(card);
    }

    // Clear inputs and close modal
    document.getElementById('newAnnouncementTitle').value = '';
    document.getElementById('newAnnouncementBody').value = '';
    closeModal('announcementModal');
}

// --- HELPER UTILITIES ---
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
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
        const status = row.getAttribute('data-status');
        if (filterValue === 'all' || status === filterValue) {
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