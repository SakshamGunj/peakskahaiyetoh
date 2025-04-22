/**
 * Dashboard integration for the slot machine app
 */

import ApiClient from './apiClient.js';
import { loadUserDashboard } from './userDashboard.js';

// Initialize dashboard functionality
function initDashboard() {
    setupDashboardEventListeners();
}

// Set up dashboard event listeners
function setupDashboardEventListeners() {
    const dashboardBtn = document.getElementById('dashboardBtn');
    const closeDashboardBtn = document.getElementById('closeDashboard');
    
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', openDashboard);
    }
    
    if (closeDashboardBtn) {
        closeDashboardBtn.addEventListener('click', closeDashboard);
    }
}

// Open the dashboard and load user rewards
function openDashboard() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || !currentUser.uid) return;
    
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;
    
    // Show user information
    const userNameElem = document.getElementById('userName');
    const userPhoneElem = document.getElementById('userPhone');
    
    if (userNameElem) userNameElem.textContent = currentUser.name || currentUser.email;
    if (userPhoneElem) userPhoneElem.textContent = currentUser.phone || '';
    
    // Setup edit and logout buttons
    if (document.getElementById('editProfileBtn')) {
        document.getElementById('editProfileBtn').onclick = openEditProfileModal;
    }
    
    if (document.getElementById('logoutBtnDashboard')) {
        document.getElementById('logoutBtnDashboard').onclick = handleLogout;
    }
    
    // Show dashboard
    dashboard.classList.remove('hidden');
    dashboard.style.display = 'block';
    
    // Load user rewards from API
    loadUserDashboard();
    
    setTimeout(() => {
        dashboard.classList.add('show');
    }, 10);
}

// Close the dashboard
function closeDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;
    
    dashboard.classList.remove('show');
    
    setTimeout(() => {
        dashboard.classList.add('hidden');
        dashboard.style.display = 'none';
    }, 400);
}

// Placeholder for profile modal functions - these would be imported from a profile module
function openEditProfileModal() {
    // This would be handled by the profile module
    console.log('Opening edit profile modal');
    const event = new CustomEvent('open-profile-modal');
    document.dispatchEvent(event);
}

// Placeholder for logout function - would be imported from auth module
function handleLogout() {
    // This would be handled by the auth module
    console.log('Logging out user');
    const event = new CustomEvent('logout-user');
    document.dispatchEvent(event);
}

export { initDashboard, openDashboard, closeDashboard };
