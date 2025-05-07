/**
 * Main application file for Restaurant Slot Machine
 */

import ApiClient from './apiClient.js';
import { loadUserDashboard } from './userDashboard.js';

// Constants
const SPIN_DURATION = 3000; // 3 seconds for the spin animation
const SPIN_SPEED = 100; // Speed between slot items change in ms
const SLOT_ITEM_HEIGHT = 184; // Height of each slot item in pixels
const DAILY_SPIN_LIMIT = 3;
const SPIN_STORAGE_KEY = 'dailySpinData';
const USER_SPINS_STORAGE_KEY = 'userSpinsData'; // New storage key for user spins

// State management
const APP_STATE = {
    currentRestaurant: null,
    currentUser: null,
    offers: [],
    currentOffer: null,
    spinning: false,
    slotItems: null,
    spinInterval: null,
    currentOfferClaimed: false,
    pendingClaim: false,
    otpVerification: {
        inProgress: false,
        phoneNumber: null,
        signupData: null
    }
};

// Helper functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Modal management functions
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    });
    
    // Also close dashboard if needed
    if (document.getElementById('dashboard')) {
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('dashboard').style.display = 'none';
    }
}

// Slot machine functions
function spinSlotMachine() {
    const data = getSpinData();
    if (data.count >= DAILY_SPIN_LIMIT) {
        updateSpinStatsUI();
        return;
    }

    if (APP_STATE.spinning) return;

    APP_STATE.spinning = true;
    $('#spinBtn').disabled = true;
    $('#result').textContent = '';

    const totalItems = APP_STATE.offers.length;
    const totalHeight = totalItems * SLOT_ITEM_HEIGHT;

    let counter = 0;
    APP_STATE.spinInterval = setInterval(() => {
        counter++;
        const position = -(counter % totalItems) * SLOT_ITEM_HEIGHT;
        APP_STATE.slotItems.style.transform = `translateY(${position}px)`;
    }, SPIN_SPEED);

    setTimeout(() => {
        clearInterval(APP_STATE.spinInterval);
        APP_STATE.spinning = false;
        $('#spinBtn').disabled = false;

        const randomIndex = Math.floor(Math.random() * APP_STATE.offers.length);
        APP_STATE.currentOffer = APP_STATE.offers[randomIndex];

        const finalPosition = -(randomIndex * SLOT_ITEM_HEIGHT);
        APP_STATE.slotItems.style.transition = 'transform 0.5s ease-out';
        APP_STATE.slotItems.style.transform = `translateY(${finalPosition}px)`;

        setTimeout(() => {
            APP_STATE.slotItems.style.transition = 'transform 0.1s ease-out';
            showWinningOffer();

            // Update spin count and points
            const newCount = data.count + 1;
            const newPoints = (data.totalPoints || 0) + 10; // Example: 10 points per spin
            setSpinData(newCount, newPoints);
            updateSpinStatsUI();
        }, 500);

    }, SPIN_DURATION);
}

function showWinningOffer() {
    const offerText = $('#offerText');
    const rewardModal = $('#rewardModal');
    const couponCode = $('#couponCode');
    const claimBtn = $('#claimBtn');
    const spinAgainBtn = $('#spinAgainBtn');
    
    if (offerText) offerText.textContent = APP_STATE.currentOffer || '';
    if (rewardModal) {
        rewardModal.classList.remove('hidden');
        rewardModal.style.display = 'block';
    }
    
    if (couponCode) couponCode.classList.add('hidden');
    APP_STATE.currentOfferClaimed = false;
    if (claimBtn) claimBtn.style.display = 'block';
    if (spinAgainBtn) spinAgainBtn.style.display = 'block';
}

function generateAndShowCoupon() {
    const couponCode = generateCouponCode();
    $('#couponValue').textContent = couponCode;
    $('#couponCode').classList.remove('hidden');

    // Hide the claim button to prevent multiple claims
    $('#claimBtn').style.display = 'none';

    // Add a flag to indicate this offer was claimed
    APP_STATE.currentOfferClaimed = true;

    // Save claimed reward to local storage
    saveClaimedReward(couponCode);
}

function generateCouponCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

function saveClaimedReward(couponCode) {
    if (!APP_STATE.currentUser) return;
    
    const reward = {
        restaurantId: APP_STATE.currentRestaurant.id,
        restaurantName: APP_STATE.currentRestaurant.name,
        offer: APP_STATE.currentOffer,
        couponCode: couponCode,
        claimedDate: new Date().toISOString()
    };
    
    try {
        // Get existing rewards for this user
        let claimedRewards = [];
        const storedRewards = localStorage.getItem(`rewards_${APP_STATE.currentUser.email}`);
        
        if (storedRewards) {
            claimedRewards = JSON.parse(storedRewards);
        }
        
        // Add the new reward
        claimedRewards.push(reward);
        
        // Save back to localStorage
        localStorage.setItem(`rewards_${APP_STATE.currentUser.email}`, JSON.stringify(claimedRewards));
        
        console.log(`Reward saved for user ${APP_STATE.currentUser.email}`);
    } catch (error) {
        console.error("Error saving reward:", error);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Add hashchange event listener to handle restaurant changes via hash
window.addEventListener('hashchange', function() {
    const newHash = window.location.hash.substring(2);
    const currentRestaurantId = APP_STATE.currentRestaurant?.id;
    
    // Only reload if the restaurant has actually changed
    if (newHash && RESTAURANTS[newHash] && newHash !== currentRestaurantId) {
        console.log(`Restaurant changed from ${currentRestaurantId} to ${newHash}, reloading...`);
        window.location.reload();
    } else {
        console.log(`Hash changed but restaurant is the same or invalid, not reloading.`);
    }
});

// Load our restaurants database
const RESTAURANTS = {
    "awesome-burgers": {
        name: "Awesome Burgers",
        description: "Home of the most delicious burgers in town.",
        offers: [
            "Free Burger", "10% Off", "Free Drink", "Free Fries", "Buy 1 Get 1 Free", 
            "20% Off", "Free Dessert", "Free Appetizer", "30% Off Combo"
        ]
    },
    "pizza-palace": {
        name: "Pizza Palace",
        description: "Experience the authentic taste of Italy.",
        offers: [
            "Free Pizza", "15% Off", "Free Garlic Bread", "Free Soda"
        ]
    },
    "peakskitchen": {
        name: "Peaks Kitchen",
        description: "Delicious fusion cuisine with local ingredients.",
        offers: [
            "5% off", "15% Off", "10% off", "Free tea", "Buy 1 Get 1 Free", "25% off", "35% Off", "Free Coffee" 
        ]
    },
    "sushi-heaven": {
        name: "Sushi Heaven",
        description: "Fresh and authentic Japanese cuisine. Our master chefs prepare the finest sushi rolls and sashimi with locally sourced ingredients.",
        offers: [
            "Free Roll", "20% Off", "Free Miso Soup", "Free Green Tea", "Buy 1 Get 1 Free", 
            "15% Off", "Free Dessert", "Free Edamame", "30% Off Party Platter"
        ]
    },
    "paddingtoncoffeehouse": {
        name: "Paddington Coffee House",
        description: "Experience the authentic taste of Food and Drinks at Paddington Coffee House",
        offers: [
            "5% off", "15% Off", "10% off", "Free tea", "Buy 1 Get 1 Free","25% off", "35% Off", "Free Coffee" 
        ]
    },
};

// Initialize application based on current URL
function initApp() {
    // Extract restaurant ID from URL - support both direct paths and hash-based routes
    const path = window.location.pathname;
    const hash = window.location.hash.substring(2); // Remove the #/ prefix
    let restaurantId = '';
    
    console.log("Path:", path);
    console.log("Hash:", hash);
    
    // Case 1: We have a hash-based restaurant ID
    if (hash && RESTAURANTS[hash]) {
        restaurantId = hash;
        console.log(`Using restaurant from hash: ${restaurantId}`);
    } 
    // Case 2: We have a path-based restaurant ID
    else {
        const pathSegments = path.split('/').filter(segment => segment.length > 0);
        const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
        
        if (lastSegment && RESTAURANTS[lastSegment]) {
            restaurantId = lastSegment;
            console.log(`Using restaurant from path: ${restaurantId}`);
            
            // Important: DO NOT modify the URL when using a path-based restaurant ID
            APP_STATE.currentRestaurant = {
                id: restaurantId,
                ...RESTAURANTS[restaurantId]
            };
            
            // Load data without changing URL
            loadRestaurantData();
            checkLoginStatus();
            updateSpinStatsUI();
            return;
        }
    }
    
    console.log("Final Resolved Restaurant ID:", restaurantId);
    
    if (restaurantId && RESTAURANTS[restaurantId]) {
        APP_STATE.currentRestaurant = {
            id: restaurantId,
            ...RESTAURANTS[restaurantId]
        };
    } else {
        // Only if no valid restaurant is found, default to peakskitchen
        const defaultRestaurantId = "peakskitchen";
        APP_STATE.currentRestaurant = {
            id: defaultRestaurantId,
            ...RESTAURANTS[defaultRestaurantId]
        };
        
        // Only update URL if we had no valid restaurant ID
        const newPath = `#/${defaultRestaurantId}`;
        window.history.pushState({}, '', newPath);
    }
    
    loadRestaurantData();
    checkLoginStatus();
    updateSpinStatsUI();
}

// Update checkLoginStatus to better handle token verification
function checkLoginStatus() {
    const savedUserStr = localStorage.getItem('currentUser');
    if (!savedUserStr) return;
    
    try {
        const savedUser = JSON.parse(savedUserStr);
        
        // If we have a Bearer token, verify it with the API
        if (savedUser && savedUser.bearerToken) {
            ApiClient.auth.verifyToken(savedUser.bearerToken)
                .then(response => {
                    // Check if token is valid using the improved response
                    if (!response || response.valid === false) {
                        console.log('Token invalid or expired, logging out user');
                        localStorage.removeItem('currentUser');
                        return;
                    }
                    
                    // Token is still valid
                    console.log('✅ Token verified successfully, user logged in');
                    APP_STATE.currentUser = savedUser;
                    
                    // Update UI for logged in state
                    if ($('#loginBtn')) $('#loginBtn').classList.add('hidden');
                    if ($('#logoutBtn')) $('#logoutBtn').classList.remove('hidden');
                    if ($('#dashboardBtn')) $('#dashboardBtn').classList.remove('hidden');
                    
                    console.log('User logged in:', savedUser.email);
                })
                .catch(error => {
                    // Just log the error and clear the user - don't alert as this happens on page load
                    console.error("Token verification failed:", error);
                    localStorage.removeItem('currentUser');
                });
        }
    } catch (error) {
        console.error("Error checking login status:", error);
        localStorage.removeItem('currentUser');
    }
}

// Load the restaurant data into the UI
function loadRestaurantData() {
    if (!APP_STATE.currentRestaurant) return;
    
    // Set restaurant info
    $('#restaurantName').textContent = APP_STATE.currentRestaurant.name;
    $('#restaurantDescription').textContent = APP_STATE.currentRestaurant.description;
    
    // Also set welcome screen info
    if ($('#welcomeRestaurantName') && $('#welcomeRestaurantDescription')) {
        $('#welcomeRestaurantName').textContent = APP_STATE.currentRestaurant.name;
        $('#welcomeRestaurantDescription').textContent = APP_STATE.currentRestaurant.description;
    }
    
    // Set slot machine offers
    APP_STATE.offers = APP_STATE.currentRestaurant.offers;
    initializeSlotMachine();
    
    // Show welcome screen instead of main content
    setTimeout(() => {
        $('#loading').classList.add('hidden');
        $('#welcomeScreen').classList.remove('hidden');
    }, 1000);
}

function initializeSlotMachine() {
    const slotItems = $('#slotItems');
    slotItems.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        APP_STATE.offers.forEach(offer => {
            const slotItem = document.createElement('div');
            slotItem.className = 'slot-item';
            slotItem.textContent = offer;
            slotItems.appendChild(slotItem);
        });
    }
    
    APP_STATE.slotItems = slotItems;
}

// Add the missing updateSpinStatsUI function
function updateSpinStatsUI() {
    // Get spin data from localStorage
    const data = getSpinData();
    
    // Update UI elements with spin data if they exist
    if ($('#dailySpinsCount')) {
        $('#dailySpinsCount').textContent = `${data.count}/${DAILY_SPIN_LIMIT}`;
    }
    
    if ($('#dashboardSpinCount')) {
        $('#dashboardSpinCount').textContent = data.count;
    }
    
    if ($('#dashboardSpinLimit')) {
        $('#dashboardSpinLimit').textContent = DAILY_SPIN_LIMIT;
    }
    
    if ($('#totalPointsValue')) {
        $('#totalPointsValue').textContent = data.totalPoints || 0;
    }
    
    if ($('#dashboardTotalPoints')) {
        $('#dashboardTotalPoints').textContent = data.totalPoints || 0;
    }
    
    // Handle spin button state
    if ($('#spinBtn')) {
        if (data.count >= DAILY_SPIN_LIMIT) {
            $('#spinBtn').disabled = true;
            if ($('#spinLimitMessage')) $('#spinLimitMessage').classList.remove('hidden');
        } else {
            $('#spinBtn').disabled = false;
            if ($('#spinLimitMessage')) $('#spinLimitMessage').classList.add('hidden');
        }
    }
}

// Update spin data management functions to handle user-specific data
function getSpinData() {
    // Get the current restaurant ID
    const restaurantId = APP_STATE.currentRestaurant?.id || 'default';
    
    // Get today's date string
    const today = getTodayDateStr();
    
    // Try to get user-specific spin data first (if user is logged in)
    const userId = APP_STATE.currentUser?.uid || 'anonymous';
    
    // First check if we have data in the persistent user spins storage
    const allUserSpinsData = JSON.parse(localStorage.getItem(USER_SPINS_STORAGE_KEY) || '{}');
    
    // Check if we have data for this user and restaurant combination
    if (allUserSpinsData[userId] && 
        allUserSpinsData[userId][restaurantId] && 
        allUserSpinsData[userId][restaurantId].date === today) {
        // Return user's restaurant-specific data for today
        return allUserSpinsData[userId][restaurantId];
    }
    
    // If no user-specific data or not for today, check general spin data
    const generalData = JSON.parse(localStorage.getItem(SPIN_STORAGE_KEY) || '{}');
    if (!generalData.date || generalData.date !== today) {
        // If general data isn't from today, return fresh data
        return { date: today, count: 0, totalPoints: generalData.totalPoints || 0 };
    }
    
    // Return the general data
    return generalData;
}

function setSpinData(count, totalPoints) {
    // Get the current restaurant ID
    const restaurantId = APP_STATE.currentRestaurant?.id || 'default';
    
    // Get today's date string
    const today = getTodayDateStr();
    
    // Create the spin data object
    const spinData = { date: today, count, totalPoints };
    
    // Save to general storage
    localStorage.setItem(SPIN_STORAGE_KEY, JSON.stringify(spinData));
    
    // Also save to user-specific storage
    const userId = APP_STATE.currentUser?.uid || 'anonymous';
    const allUserSpinsData = JSON.parse(localStorage.getItem(USER_SPINS_STORAGE_KEY) || '{}');
    
    // Initialize nested objects if they don't exist
    if (!allUserSpinsData[userId]) {
        allUserSpinsData[userId] = {};
    }
    
    // Store the spin data for this user and restaurant
    allUserSpinsData[userId][restaurantId] = spinData;
    
    // Save back to localStorage
    localStorage.setItem(USER_SPINS_STORAGE_KEY, JSON.stringify(allUserSpinsData));
    
    console.log(`📊 Spin data updated for user ${userId}, restaurant ${restaurantId}: ${count}/${DAILY_SPIN_LIMIT}`);
}

function getTodayDateStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

// Add setupEventListeners function which is called at startup
function setupEventListeners() {
    // Safely adding event listeners with optional chaining
    $('#spinBtn')?.addEventListener('click', spinSlotMachine);
    $('#loginBtn')?.addEventListener('click', openAuthModal);
    $('#logoutBtn')?.addEventListener('click', handleLogout);
    
    // Reward related
    $('#claimBtn')?.addEventListener('click', showClaimForm);
    $('#spinAgainBtn')?.addEventListener('click', handleSpinAgain);
    
    // Dashboard related
    $('#dashboardBtn')?.addEventListener('click', openDashboard);
    $('#closeDashboard')?.addEventListener('click', closeDashboard);
    
    // Welcome screen buttons
    $('#spinButton')?.addEventListener('click', () => {
        $('#welcomeScreen').classList.add('hidden');
        $('#mainContent').classList.remove('hidden');
        
        // Update to use HTTPS
        fetch('https://funk-456015.uc.r.appspot.com/')
            .then(response => {
                console.log('🌐 API Response Status:', response.status, response.statusText);
                return response.text();
            })
            .then(data => {
                console.log('🌐 API Response from API server:');
                console.log(data.substring(0, 500) + (data.length > 500 ? '...' : ''));
            })
            .catch(error => {
                console.error('🌐 API Error from API server:', error);
                console.log('Make sure your backend server is running with HTTPS enabled');
            });
    });
    
    // Menu button navigation
    $('#menuButton')?.addEventListener('click', () => {
        const restaurantId = APP_STATE.currentRestaurant?.id || 'peakskitchen';
        const baseUrl = window.location.origin;
        window.location.href = `${baseUrl}/menu.html#/${restaurantId}`;
    });
    
    // Auth tabs
    $('#loginTab')?.addEventListener('click', () => switchAuthTab('login'));
    $('#signupTab')?.addEventListener('click', () => switchAuthTab('signup'));
    
    // Auth forms
    $('#loginSubmit')?.addEventListener('click', handleLogin);
    $('#signupSubmit')?.addEventListener('click', handleSignup);
    
    // Close modals
    $$('.close-modal')?.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Profile management
    $('#editProfileBtn')?.addEventListener('click', openEditProfileModal);
    $('#closeEditProfileModal')?.addEventListener('click', closeEditProfileModal);
    $('#saveProfileBtn')?.addEventListener('click', (e) => saveProfileChanges(e));
    $('#editProfileForm')?.addEventListener('submit', saveProfileChanges);
    
    // OTP verification
    $('#otpForm')?.addEventListener('submit', handleOTPSubmit);
    $('#resendOTPBtn')?.addEventListener('click', handleResendOTP);
    $('#closeOTPModal')?.addEventListener('click', () => {
        $('#otpModal').classList.add('hidden');
        $('#otpModal').style.display = 'none';
        if ($('#signupSubmit')) {
            $('#signupSubmit').disabled = false;
            $('#signupSubmit').textContent = 'Sign Up';
        }
        APP_STATE.otpVerification.inProgress = false;
    });

    // Modal backdrop click to close
    $$('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });

    console.log("Event listeners set up");
}

// Fix the handleLogin function to properly handle successful login
function handleLogin(e) {
    if (e) e.preventDefault();
    
    const email = $('#loginEmail').value;
    const password = $('#loginPassword').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    $('#loginSubmit').disabled = true;
    $('#loginSubmit').textContent = 'Logging in...';

    console.log('🔐 Starting login process for:', email);

    // Use API to login
    ApiClient.auth.login({
        email: email,
        password: password
    })
    .then(loginData => {
        console.log('✅ Login Success - API Response:', loginData);

        // Create user object with token
        const user = {
            uid: loginData.uid,
            email: loginData.email,
            name: loginData.name || email.split('@')[0],
            bearerToken: loginData.id_token,
            refreshToken: loginData.refresh_token,
            expiresIn: loginData.expires_in
        };

        // Log in the user
        loginUser(user);
        closeAllModals();

        // Handle pending claim if needed
        if (APP_STATE.pendingClaim && APP_STATE.currentOffer) {
            setTimeout(() => {
                $('#rewardModal').classList.remove('hidden');
                $('#rewardModal').style.display = 'block';
                generateAndShowCoupon();
                APP_STATE.pendingClaim = false;
            }, 500);
        }
    })
    .catch(error => {
        console.error('❌ Login error:', error);
        alert(`Login failed: ${error.message}`);
    })
    .finally(() => {
        $('#loginSubmit').disabled = false;
        $('#loginSubmit').textContent = 'Login';
    });
}

// Fix the handleLogout function to preserve spin data
function handleLogout() {
    // Store the current user ID before logging out
    const userId = APP_STATE.currentUser?.uid;
    
    // Clear user state
    APP_STATE.currentUser = null;
    
    // Remove stored user data but NOT the spin data
    localStorage.removeItem('currentUser');
    
    // Update UI for logged out state
    $('#loginBtn').classList.remove('hidden');
    $('#logoutBtn').classList.add('hidden');
    $('#dashboardBtn').classList.add('hidden');
    
    // Update UI with current spin data (which is now preserved)
    updateSpinStatsUI();
    
    // Close any open modals including dashboard
    closeAllModals();
    
    // Show logout message
    $('#result').textContent = 'You have been logged out';
    setTimeout(() => {
        $('#result').textContent = '';
    }, 3000);
    
    console.log(`✅ User logged out. Spin data preserved.`);
}

// Fix showClaimForm to ensure proper reward claiming flow
function showClaimForm() {
    if (!APP_STATE || APP_STATE.currentOfferClaimed) {
        return;
    }
    
    if (APP_STATE.currentUser) {
        generateAndShowCoupon();
        
        // Also call the backend API to store the reward claim if user is logged in
        claimRewardApi($('#couponValue').textContent);
    } else {
        APP_STATE.pendingClaim = true;
        $('#rewardModal').style.display = 'none';
        setTimeout(() => {
            $('#authModal').classList.remove('hidden');
            $('#authModal').style.display = 'block';
            // Switch to signup tab
            $('#loginTab').classList.remove('active');
            $('#signupTab').classList.add('active');
            $('#loginForm').classList.add('hidden');
            $('#signupForm').classList.remove('hidden');
        }, 100);
    }
}

// Add function to call the reward claim API
function claimRewardApi(couponCode) {
    if (!APP_STATE.currentUser || !APP_STATE.currentUser.bearerToken) {
        console.log('User not logged in or missing Bearer token, skipping API call');
        return;
    }

    const now = new Date();
    const payload = {
        id: 0,
        uid: APP_STATE.currentUser.uid,
        restaurant_id: APP_STATE.currentRestaurant.id,
        reward_name: APP_STATE.currentOffer,
        threshold_id: 0,
        whatsapp_number: APP_STATE.currentUser.phone || "",
        user_name: APP_STATE.currentUser.name || "",
        claimed_at: now.toISOString(),
        redeemed: false,
        redeemed_at: null,
        coupon_code: couponCode
    };

    console.log('🎁 Claiming reward with payload:', payload);

    ApiClient.rewards.claim(payload)
        .then(data => {
            console.log('✅ Reward claim success:', data);
        })
        .catch(error => {
            console.error('❌ Reward claim error:', error);
            // Don't alert the user as local storage save already worked
        });
}

// Update openDashboard to properly show user info and load rewards
function openDashboard() {
    if (!APP_STATE.currentUser) return;

    // Show user information
    $('#userName').textContent = APP_STATE.currentUser.name || APP_STATE.currentUser.email;
    if ($('#userPhone')) {
        $('#userPhone').textContent = APP_STATE.currentUser.phone || '';
    }

    // Show dashboard
    $('#dashboard').classList.remove('hidden');
    $('#dashboard').style.display = 'block';
    
    setTimeout(() => {
        $('#dashboard').classList.add('show');
    }, 10);

    // Load user rewards from API
    loadUserDashboard(APP_STATE.currentUser.uid);
}

// Fix the missing closeDashboard function
function closeDashboard() {
    $('#dashboard').classList.remove('show');
    
    setTimeout(() => {
        $('#dashboard').classList.add('hidden');
        $('#dashboard').style.display = 'none';
    }, 400);
}

// Update loginUser function to restore user spin data
function loginUser(user) {
    APP_STATE.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Update UI for logged in state
    $('#loginBtn').classList.add('hidden');
    $('#logoutBtn').classList.remove('hidden');
    $('#dashboardBtn').classList.remove('hidden');
    
    // Restore user's spin data if available
    updateSpinStatsUI();
    
    // Show welcome message
    $('#result').textContent = `Welcome, ${user.name}!`;
    setTimeout(() => {
        $('#result').textContent = '';
    }, 3000);
    
    console.log(`✅ User logged in: ${user.email}`);
}

// Add missing openAuthModal and handleLogout functions 
function openAuthModal() {
    $('#authModal').classList.remove('hidden');
    $('#authModal').style.display = 'block';
}

// Add missing functions for reward claiming
function handleSpinAgain() {
    closeAllModals();
    setTimeout(() => {
        spinSlotMachine();
    }, 300);
}

// Update handleSignup function to properly integrate with OTP and API
function handleSignup() {
    const name = $('#signupName').value;
    const email = $('#signupEmail').value;
    const password = $('#signupPassword').value;
    const phone = $('#signupPhone').value;
    
    if (!name || !email || !password || !phone) {
        alert('Please fill in all fields');
        return;
    }
    
    // Basic phone validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
        alert('Please enter a valid WhatsApp number');
        return;
    }
    
    $('#signupSubmit').disabled = true;
    $('#signupSubmit').textContent = 'Signing up...';
    
    console.log('🔐 Starting signup process for:', email);
    
    // Store signup data for later use
    const signupData = {
        email: email,
        password: password,
        name: name
    };
    
    // First try signup
    ApiClient.auth.signup(signupData)
        .then(data => {
            console.log('✅ Signup successful:', data);
            
            // Store this phone number for OTP verification
            APP_STATE.otpVerification = {
                inProgress: true,
                phoneNumber: cleanPhone,
                signupData: signupData,
                signupResponse: data
            };
            
            // Always proceed to OTP verification after successful signup
            console.log('📱 Proceeding to OTP verification for phone:', cleanPhone);
            
            // Hide auth modal before showing OTP modal
            $('#authModal').classList.add('hidden');
            $('#authModal').style.display = 'none';
            
            // Send OTP and show verification modal
            sendOTP(cleanPhone)
                .then(otpResponse => {
                    console.log('✅ OTP sent successfully:', otpResponse);
                    
                    // Show OTP verification modal
                    showOTPModal(cleanPhone, () => {
                        // This function will be called after successful OTP verification
                        completeSignup(signupData, cleanPhone, data);
                    });
                })
                .catch(error => {
                    console.error('❌ Error sending OTP:', error);
                    alert(`Failed to send OTP: ${error.message}`);
                    
                    // Re-enable signup button
                    $('#signupSubmit').disabled = false;
                    $('#signupSubmit').textContent = 'Sign Up';
                });
        })
        .catch(error => {
            console.error('❌ Signup error:', error);
            alert(`Signup failed: ${error.message}`);
            
            $('#signupSubmit').disabled = false;
            $('#signupSubmit').textContent = 'Sign Up';
        });
}

// Function to send OTP - make sure it returns the API promise
async function sendOTP(phoneNumber) {
    console.log('🔄 Sending OTP to:', phoneNumber);
    return ApiClient.otp.send(phoneNumber);
}

// Add/Update showOTPModal function to ensure it displays properly
function showOTPModal(phoneNumber, afterVerification) {
    // Make sure all other modals are closed first
    closeAllModals();
    
    // Show OTP modal
    $('#otpModal').classList.remove('hidden');
    $('#otpModal').style.display = 'block';
    $('#otpPhoneDisplay').textContent = phoneNumber;
    $('#otpInput').value = '';
    $('#otpInput').focus(); // Auto-focus the OTP input field
    
    // Store the callback function to execute after verification
    APP_STATE.otpVerification = {
        inProgress: true,
        phoneNumber: phoneNumber,
        afterVerification: afterVerification
    };
    
    console.log('🔐 OTP modal displayed for phone:', phoneNumber);
}

// Update handleOTPSubmit function to verify OTP with API
function handleOTPSubmit(e) {
    if (e) e.preventDefault();
    
    const otp = $('#otpInput').value.trim();
    if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
        alert('Please enter a valid 4-digit OTP');
        return;
    }
    
    $('#verifyOTPBtn').disabled = true;
    $('#verifyOTPBtn').textContent = 'Verifying...';
    
    if (!APP_STATE.otpVerification || !APP_STATE.otpVerification.phoneNumber) {
        console.error('OTP verification not properly initialized');
        $('#verifyOTPBtn').disabled = false;
        $('#verifyOTPBtn').textContent = 'Verify OTP';
        return;
    }
    
    console.log('🔄 Verifying OTP:', otp, 'for phone:', APP_STATE.otpVerification.phoneNumber);
    
    // Verify OTP with API
    ApiClient.otp.verify(APP_STATE.otpVerification.phoneNumber, otp)
        .then(response => {
            console.log('✅ OTP verified successfully:', response);
            
            // Close OTP modal
            $('#otpModal').classList.add('hidden');
            $('#otpModal').style.display = 'none';
            
            // Call the callback function if exists
            if (APP_STATE.otpVerification.afterVerification) {
                APP_STATE.otpVerification.afterVerification();
            }
        })
        .catch(error => {
            console.error('❌ OTP verification failed:', error);
            alert(`OTP Verification failed: ${error.message}`);
        })
        .finally(() => {
            $('#verifyOTPBtn').disabled = false;
            $('#verifyOTPBtn').textContent = 'Verify OTP';
        });
}

// Update handleResendOTP function to use API
function handleResendOTP() {
    if (!APP_STATE.otpVerification || !APP_STATE.otpVerification.phoneNumber) {
        console.error('OTP verification not properly initialized');
        return;
    }
    
    $('#resendOTPBtn').disabled = true;
    $('#resendOTPBtn').textContent = 'Sending...';
    
    // Call the API to resend OTP
    sendOTP(APP_STATE.otpVerification.phoneNumber)
        .then(response => {
            console.log('✅ OTP resent successfully:', response);
            alert('OTP has been resent to your phone');
        })
        .catch(error => {
            console.error('❌ Error resending OTP:', error);
            alert(`Failed to resend OTP: ${error.message}`);
        })
        .finally(() => {
            $('#resendOTPBtn').disabled = false;
            $('#resendOTPBtn').textContent = 'Resend OTP';
        });
}

// Function to complete signup after OTP verification
function completeSignup(signupData, phoneNumber, signupResponse) {
    console.log('📤 Completing signup after OTP verification');
    
    // After successful signup and OTP verification, call the login endpoint to get the Bearer token
    console.log('🔄 Calling login endpoint to get Bearer token...');
    
    ApiClient.auth.login({
        email: signupData.email,
        password: signupData.password
    })
    .then(loginData => {
        console.log('✅ Login after signup success:', loginData);
        
        // Create new user object with Bearer token
        const newUser = {
            uid: loginData.uid || signupResponse.uid,
            email: loginData.email || signupData.email,
            name: signupData.name,
            phone: phoneNumber,
            bearerToken: loginData.id_token,
            refreshToken: loginData.refresh_token,
            expiresIn: loginData.expires_in
        };
        
        // Log in the user with the complete user object
        loginUser(newUser);
        closeAllModals();
        
        // Handle pending claim if needed
        if (APP_STATE.pendingClaim && APP_STATE.currentOffer) {
            setTimeout(() => {
                $('#rewardModal').classList.remove('hidden');
                $('#rewardModal').style.display = 'block';
                generateAndShowCoupon();
                APP_STATE.pendingClaim = false;
            }, 500);
        }
    })
    .catch(error => {
        console.error('❌ Login after signup error:', error);
        alert(`Login after signup failed: ${error.message}`);
    })
    .finally(() => {
        APP_STATE.otpVerification.inProgress = false;
    });
}

// Add profile management functions
function openEditProfileModal() {
    if (!APP_STATE.currentUser) return;
    $('#editProfileModal').classList.remove('hidden');
    $('#editProfileModal').style.display = 'block';
    $('#editName').value = APP_STATE.currentUser.name || '';
    $('#editPhone').value = APP_STATE.currentUser.phone || '';
    $('#editName').focus();
}

function closeEditProfileModal() {
    $('#editProfileModal').classList.add('hidden');
    $('#editProfileModal').style.display = 'none';
}

function saveProfileChanges(e) {
    e.preventDefault();
    const newName = $('#editName').value.trim();
    const newPhone = $('#editPhone').value.trim();

    if (!newName) {
        alert('Name cannot be empty');
        $('#editName').focus();
        return;
    }
    
    if (newPhone && !/^\d{10,15}$/.test(newPhone)) {
        alert('Please enter a valid mobile number');
        $('#editPhone').focus();
        return;
    }

    if (APP_STATE.currentUser) {
        APP_STATE.currentUser.name = newName;
        APP_STATE.currentUser.phone = newPhone;
        localStorage.setItem('currentUser', JSON.stringify(APP_STATE.currentUser));

        // Update UI
        $('#userName').textContent = newName;
        if ($('#userPhone')) {
            $('#userPhone').textContent = newPhone;
        }

        closeEditProfileModal();
        alert('Profile updated!');
    }
}

// Add missing function for auth tab switching
function switchAuthTab(tab) {
    if (tab === 'login') {
        $('#loginTab').classList.add('active');
        $('#signupTab').classList.remove('active');
        $('#loginForm').classList.remove('hidden');
        $('#signupForm').classList.add('hidden');
    } else {
        $('#loginTab').classList.remove('active');
        $('#signupTab').classList.add('active');
        $('#loginForm').classList.add('hidden');
        $('#signupForm').classList.remove('hidden');
    }
}

// Exporting the main functions for use in other modules
export { 
    APP_STATE, 
    closeAllModals, 
    spinSlotMachine, 
    showWinningOffer, 
    generateAndShowCoupon,
    claimRewardApi,
    updateSpinStatsUI,
    openDashboard,
    closeDashboard,
    handleLogout,
    handleLogin,
    loginUser,
    handleSignup,
    openAuthModal,
    switchAuthTab,
    showClaimForm,
    handleSpinAgain,
    showOTPModal,
    handleOTPSubmit,
    handleResendOTP,
    openEditProfileModal,
    closeEditProfileModal,
    saveProfileChanges,
    $,
    $$
};
