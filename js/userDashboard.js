/**
 * User Dashboard functionality for Restaurant Slot Machine
 */

import { APP_STATE, $, $$ } from './app.js';
import ApiClient from './apiClient.js';

// Format date from ISO string to readable format
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Date formatting error:', e);
        return dateString;
    }
}

// Create tab element for restaurant
function createRestaurantTab(restaurantId, restaurantName, isActive = false) {
    const tab = document.createElement('button');
    tab.className = `restaurant-tab ${isActive ? 'active' : ''}`;
    tab.dataset.restaurantId = restaurantId;
    tab.textContent = restaurantName || capitalizeRestaurantId(restaurantId);
    return tab;
}

// Capitalize restaurant ID for display if no name is provided
function capitalizeRestaurantId(restaurantId) {
    if (!restaurantId) return 'Unknown';
    return restaurantId
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Create reward card with redeemed status
function createRewardCard(reward) {
    const card = document.createElement('div');
    card.className = `reward-card ${reward.redeemed ? 'redeemed' : 'active'}`;
    
    // Format the date
    const formattedClaimedDate = formatDate(reward.claimed_at);
    const formattedRedeemedDate = reward.redeemed_at ? formatDate(reward.redeemed_at) : '';
    
    // Create the reward card HTML
    card.innerHTML = `
        <div class="restaurant-tag">${capitalizeRestaurantId(reward.restaurant_id)}</div>
        <h3 class="reward-title">${reward.reward_name}</h3>
        <p class="reward-info">Claimed on: ${formattedClaimedDate}</p>
        <div class="reward-code">${reward.coupon_code}</div>
        ${reward.redeemed 
            ? `<div class="redeemed-badge">REDEEMED</div>
               <p class="redemption-date">Redeemed on: ${formattedRedeemedDate}</p>` 
            : `<div class="active-badge">AVAILABLE</div>`}
    `;
    
    return card;
}

// Load restaurant tabs and rewards from backend
async function loadUserDashboard(uid) {
    if (!uid) return;
    
    const rewardsList = $('#rewardsList');
    const tabsContainer = $('#restaurantTabs');
    
    if (!rewardsList || !tabsContainer) return;
    
    // Show loading state
    rewardsList.innerHTML = '<p class="loading">Loading your rewards...</p>';
    tabsContainer.innerHTML = '';
    
    try {
        console.log('🔄 Loading user dashboard for UID:', uid);
        const dashboardData = await ApiClient.dashboard.getUserDashboard(uid);
        console.log('📊 Dashboard data received:', dashboardData);
        
        // Check if we have claimed rewards
        if (!dashboardData.claimed_rewards || dashboardData.claimed_rewards.length === 0) {
            rewardsList.innerHTML = '<p class="no-rewards">You haven\'t claimed any rewards yet. Spin to win some!</p>';
            return;
        }
        
        // Process the claimed_rewards data
        const claimedRewards = dashboardData.claimed_rewards;
        
        // Group rewards by restaurant
        const restaurantRewards = {};
        claimedRewards.forEach(reward => {
            if (!restaurantRewards[reward.restaurant_id]) {
                restaurantRewards[reward.restaurant_id] = [];
            }
            restaurantRewards[reward.restaurant_id].push(reward);
        });
        
        // Create tabs for each restaurant
        const restaurantIds = Object.keys(restaurantRewards);
        
        restaurantIds.forEach((restaurantId, index) => {
            const tab = createRestaurantTab(
                restaurantId, 
                capitalizeRestaurantId(restaurantId),
                index === 0
            );
            
            tabsContainer.appendChild(tab);
            
            // Add click event to switch tabs
            tab.addEventListener('click', () => {
                // Deactivate all tabs
                $$('.restaurant-tab').forEach(t => t.classList.remove('active'));
                
                // Activate this tab
                tab.classList.add('active');
                
                // Show rewards for this restaurant
                showRestaurantRewards(restaurantRewards[restaurantId]);
            });
        });
        
        // Show first restaurant's rewards by default
        if (restaurantIds.length > 0) {
            showRestaurantRewards(restaurantRewards[restaurantIds[0]]);
        }
        
    } catch (error) {
        console.error('❌ Failed to load user dashboard:', error);
        rewardsList.innerHTML = '<p class="error">Failed to load rewards. Please try again later.</p>';
        
        // Try to load local rewards as fallback
        loadLocalRewards();
    }
}

// Show rewards for a specific restaurant
function showRestaurantRewards(rewards) {
    const rewardsList = $('#rewardsList');
    if (!rewardsList || !rewards || rewards.length === 0) return;
    
    rewardsList.innerHTML = '';
    
    // Add restaurant header using the first reward's restaurant_id
    const restaurantInfo = document.createElement('div');
    restaurantInfo.className = 'restaurant-info';
    restaurantInfo.innerHTML = `
        <h3 class="restaurant-name">${capitalizeRestaurantId(rewards[0].restaurant_id)}</h3>
    `;
    rewardsList.appendChild(restaurantInfo);
    
    // Add rewards section title
    const rewardsHeader = document.createElement('h4');
    rewardsHeader.className = 'rewards-section-title';
    rewardsHeader.textContent = 'Your Claimed Rewards';
    rewardsList.appendChild(rewardsHeader);
    
    // Create status counters
    const activeRewards = rewards.filter(reward => !reward.redeemed).length;
    const redeemedRewards = rewards.filter(reward => reward.redeemed).length;
    
    const statusSummary = document.createElement('div');
    statusSummary.className = 'rewards-status-summary';
    statusSummary.innerHTML = `
        <span class="status-count active">Available: ${activeRewards}</span>
        <span class="status-count redeemed">Redeemed: ${redeemedRewards}</span>
    `;
    rewardsList.appendChild(statusSummary);
    
    // Sort rewards: active first, then by date (newest first)
    const sortedRewards = [...rewards].sort((a, b) => {
        // First compare redeemed status (active first)
        if (a.redeemed !== b.redeemed) {
            return a.redeemed ? 1 : -1;
        }
        
        // Then compare by claimed date (newest first)
        return new Date(b.claimed_at) - new Date(a.claimed_at);
    });
    
    // Add each reward card
    sortedRewards.forEach(reward => {
        const card = createRewardCard(reward);
        rewardsList.appendChild(card);
    });
}

// Fallback to show locally stored rewards if API fails
function loadLocalRewards() {
    if (!APP_STATE.currentUser) return;
    
    const rewardsList = $('#rewardsList');
    const tabsContainer = $('#restaurantTabs');
    if (!rewardsList || !tabsContainer) return;
    
    const email = APP_STATE.currentUser.email;
    const storedRewards = localStorage.getItem(`rewards_${email}`);
    
    if (!storedRewards) {
        rewardsList.innerHTML = '<p class="no-rewards">You haven\'t claimed any rewards yet. Spin to win!</p>';
        return;
    }
    
    const rewards = JSON.parse(storedRewards);
    
    if (rewards.length === 0) {
        rewardsList.innerHTML = '<p class="no-rewards">You haven\'t claimed any rewards yet. Spin to win!</p>';
        return;
    }
    
    // Group rewards by restaurant
    const rewardsByRestaurant = {};
    rewards.forEach(reward => {
        if (!rewardsByRestaurant[reward.restaurantId]) {
            rewardsByRestaurant[reward.restaurantId] = [];
        }
        rewardsByRestaurant[reward.restaurantId].push(reward);
    });
    
    // Clear existing tabs
    tabsContainer.innerHTML = '';
    
    // Create local tabs for restaurants
    Object.keys(rewardsByRestaurant).forEach((restaurantId, index) => {
        const restaurantName = rewardsByRestaurant[restaurantId][0].restaurantName;
        const tab = createRestaurantTab(restaurantId, restaurantName, index === 0);
        tabsContainer.appendChild(tab);
        
        tab.addEventListener('click', () => {
            $$('.restaurant-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            showLocalRestaurantRewards(restaurantId);
        });
    });
    
    // Show the first restaurant's rewards
    const firstRestaurantId = Object.keys(rewardsByRestaurant)[0];
    showLocalRestaurantRewards(firstRestaurantId);
}

// Show locally stored rewards for a specific restaurant
function showLocalRestaurantRewards(restaurantId) {
    if (!APP_STATE.currentUser) return;
    
    const rewardsList = $('#rewardsList');
    if (!rewardsList) return;
    
    const email = APP_STATE.currentUser.email;
    const storedRewards = localStorage.getItem(`rewards_${email}`);
    
    if (!storedRewards) return;
    
    const rewards = JSON.parse(storedRewards);
    const restaurantRewards = rewards.filter(r => r.restaurantId === restaurantId);
    
    if (restaurantRewards.length === 0) return;
    
    rewardsList.innerHTML = '';
    
    // Add restaurant header
    const restaurantInfo = document.createElement('div');
    restaurantInfo.className = 'restaurant-info';
    restaurantInfo.innerHTML = `
        <h3 class="restaurant-name">${restaurantRewards[0].restaurantName}</h3>
    `;
    rewardsList.appendChild(restaurantInfo);
    
    const rewardsHeader = document.createElement('h4');
    rewardsHeader.className = 'rewards-section-title';
    rewardsHeader.textContent = 'Your Claimed Rewards (Local)';
    rewardsList.appendChild(rewardsHeader);
    
    restaurantRewards.forEach(reward => {
        const card = document.createElement('div');
        card.className = 'reward-card active';
        
        const formattedDate = formatDate(reward.claimedDate);
        
        card.innerHTML = `
            <div class="restaurant-tag">${reward.restaurantName}</div>
            <h3 class="reward-title">${reward.offer}</h3>
            <p class="reward-info">Claimed on: ${formattedDate}</p>
            <div class="reward-code">${reward.couponCode}</div>
            <div class="active-badge">AVAILABLE</div>
        `;
        
        rewardsList.appendChild(card);
    });
}

export { loadUserDashboard };
