/**
 * User Dashboard functionality for Restaurant Slot Machine
 */

import { APP_STATE, $, $$ } from './app.js';
import ApiClient from './apiClient.js';

// Format date from ISO string to readable format
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Create tab element for restaurant
function createRestaurantTab(restaurant, isActive = false) {
    const tab = document.createElement('button');
    tab.className = `restaurant-tab ${isActive ? 'active' : ''}`;
    tab.dataset.restaurantId = restaurant.restaurant_id;
    tab.textContent = restaurant.restaurant_name;
    return tab;
}

// Create reward card with redeemed status
function createRewardCard(reward, restaurantName) {
    const card = document.createElement('div');
    card.className = `reward-card ${reward.redeemed ? 'redeemed' : 'active'}`;
    
    const formattedDate = formatDate(reward.claimed_at);
    
    card.innerHTML = `
        <div class="restaurant-tag">${restaurantName}</div>
        <h3 class="reward-title">${reward.reward_name}</h3>
        <p class="reward-info">Claimed on: ${formattedDate}</p>
        <div class="reward-code">${reward.coupon_code}</div>
        ${reward.redeemed ? 
            '<div class="redeemed-badge">USED</div>' : 
            '<div class="active-badge">AVAILABLE</div>'}
    `;
    
    return card;
}

// Load restaurant tabs and rewards from backend
async function loadUserDashboard(uid) {
    const rewardsList = $('#rewardsList');
    const tabsContainer = $('#restaurantTabs');
    
    if (!rewardsList || !tabsContainer) return;
    
    if (!APP_STATE.currentUser || !uid) {
        rewardsList.innerHTML = '<p class="no-rewards">Please log in to view your rewards.</p>';
        return;
    }
    
    try {
        rewardsList.innerHTML = '<p class="loading">Loading your rewards...</p>';
        
        // Fetch user dashboard data from API
        const dashboardData = await ApiClient.dashboard.getUserDashboard(uid);
        
        if (!dashboardData || !dashboardData.dashboard || dashboardData.dashboard.length === 0) {
            rewardsList.innerHTML = '<p class="no-rewards">You haven\'t claimed any rewards yet. Spin to win!</p>';
            return;
        }
        
        // Clear existing tabs and create new tabs
        tabsContainer.innerHTML = '';
        const restaurants = dashboardData.dashboard;
        
        // Set up restaurant tabs
        restaurants.forEach((restaurant, index) => {
            const tab = createRestaurantTab(restaurant, index === 0);
            tabsContainer.appendChild(tab);
            
            // Add event listener to switch between restaurant tabs
            tab.addEventListener('click', () => {
                // Deactivate all tabs
                document.querySelectorAll('.restaurant-tab').forEach(t => {
                    t.classList.remove('active');
                });
                
                // Activate clicked tab
                tab.classList.add('active');
                
                // Show rewards for selected restaurant
                showRestaurantRewards(dashboardData, restaurant.restaurant_id);
            });
        });
        
        // Show rewards for the first restaurant by default
        showRestaurantRewards(dashboardData, restaurants[0].restaurant_id);
        
    } catch (error) {
        console.error('Failed to load user dashboard:', error);
        rewardsList.innerHTML = '<p class="error">Failed to load rewards. Please try again later.</p>';
        
        // Fallback to local storage data
        loadLocalRewards();
    }
}

// Show rewards for a specific restaurant
function showRestaurantRewards(dashboardData, restaurantId) {
    const rewardsList = $('#rewardsList');
    if (!rewardsList) return;
    
    rewardsList.innerHTML = '';
    
    // Find restaurant data
    const restaurant = dashboardData.dashboard.find(r => r.restaurant_id === restaurantId);
    if (!restaurant) {
        rewardsList.innerHTML = '<p class="no-rewards">No rewards found for this restaurant.</p>';
        return;
    }
    
    // Add restaurant info section
    const restaurantInfo = document.createElement('div');
    restaurantInfo.className = 'restaurant-info';
    restaurantInfo.innerHTML = `
        <h3 class="restaurant-name">${restaurant.restaurant_name}</h3>
        <div class="restaurant-stats">
            <div class="stat">
                <span class="stat-label">Spin Points:</span>
                <span class="stat-value">${restaurant.spin_progress.current_spin_points}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Total Spins:</span>
                <span class="stat-value">${restaurant.spin_progress.number_of_spins}</span>
            </div>
        </div>
    `;
    rewardsList.appendChild(restaurantInfo);
    
    // Add rewards section
    if (restaurant.claimed_rewards && restaurant.claimed_rewards.length > 0) {
        const rewardsHeader = document.createElement('h4');
        rewardsHeader.className = 'rewards-section-title';
        rewardsHeader.textContent = 'Your Claimed Rewards';
        rewardsList.appendChild(rewardsHeader);
        
        // Sort rewards: active first, then redeemed
        const sortedRewards = [...restaurant.claimed_rewards].sort((a, b) => {
            if (a.redeemed === b.redeemed) return new Date(b.claimed_at) - new Date(a.claimed_at);
            return a.redeemed ? 1 : -1;
        });
        
        sortedRewards.forEach(reward => {
            const card = createRewardCard(reward, restaurant.restaurant_name);
            rewardsList.appendChild(card);
        });
    } else {
        const noRewards = document.createElement('p');
        noRewards.className = 'no-rewards';
        noRewards.textContent = 'No rewards claimed yet at this restaurant. Spin to win!';
        rewardsList.appendChild(noRewards);
    }
}

// Fallback to show locally stored rewards if API fails
function loadLocalRewards() {
    if (!APP_STATE.currentUser) return;
    
    const rewardsList = $('#rewardsList');
    if (!rewardsList) return;
    
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
    
    rewardsList.innerHTML = '<h4 class="rewards-section-title">Your Local Rewards</h4>';
    
    // Group rewards by restaurant
    const rewardsByRestaurant = {};
    rewards.forEach(reward => {
        if (!rewardsByRestaurant[reward.restaurantId]) {
            rewardsByRestaurant[reward.restaurantId] = [];
        }
        rewardsByRestaurant[reward.restaurantId].push(reward);
    });
    
    // Create local tabs for restaurants
    const tabsContainer = $('#restaurantTabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = '';
        Object.keys(rewardsByRestaurant).forEach((restaurantId, index) => {
            const restaurantName = rewardsByRestaurant[restaurantId][0].restaurantName;
            const tab = document.createElement('button');
            tab.className = `restaurant-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = restaurantName;
            tab.dataset.localRestaurantId = restaurantId;
            tabsContainer.appendChild(tab);
            
            tab.addEventListener('click', () => {
                document.querySelectorAll('.restaurant-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                showLocalRestaurantRewards(restaurantId);
            });
        });
    }
    
    // Show first restaurant's rewards
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
