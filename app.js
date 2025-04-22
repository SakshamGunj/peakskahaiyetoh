// Restaurant Slot Machine Game - Main Application

// Constants
const SPIN_DURATION = 3000; // 3 seconds for the spin animation
const SPIN_SPEED = 100; // Speed between slot items change in ms
const SLOT_ITEM_HEIGHT = 184; // Height of each slot item in pixels

// Restaurants database (simulated)
const RESTAURANTS = {
    "awesome-burgers": {
        name: "Awesome Burgers",
        description: "Home of the most delicious burgers in town. Our juicy burgers are made with 100% premium beef and fresh ingredients.",
        offers: [
            "Free Burger", "10% Off", "Free Drink", "Free Fries", "Buy 1 Get 1 Free", 
            "20% Off", "Free Dessert", "Free Appetizer", "30% Off Combo"
        ]
    },
    "pizza-palace": {
        name: "Pizza Palace",
        description: "Experience the authentic taste of Italy with our hand-tossed pizzas, baked in wood-fired ovens and topped with premium ingredients.",
        offers: [
            "Free Pizza", "15% Off", "Free Garlic Bread", "Free Soda", "Buy 1 Get 1 Free", 
            "25% Off", "Free Dessert", "Free Side", "30% Off Large Pizza"
        ]
    },
    "peakskitchen": {
        name: "Peaks Kitchen",
        description: "Experience the authentic taste of Italy with our hand-tossed pizzas, baked in wood-fired ovens and topped with premium ingredients.",
        offers: [
            "5% off", "15% Off", "10% off", "Free tea", "Buy 1 Get 1 Free","25% off", "35% Off", "Free Coffee" 
        ]
    },
    "sushi-heaven": {
        name: "Sushi Heaven",
        description: "Fresh and authentic Japanese cuisine. Our master chefs prepare the finest sushi rolls and sashimi with locally sourced ingredients.",
        offers: [
            "Free Roll", "20% Off", "Free Miso Soup", "Free Green Tea", "Buy 1 Get 1 Free", 
            "15% Off", "Free Dessert", "Free Edamame", "30% Off Party Platter"
        ]
    }
};

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

// API configuration - Update to use proxy to avoid CSP issues
const API_CONFIG = {
    // Use relative URL instead of absolute to avoid CSP issues
    baseUrl: '/api-proxy',
    headers: {
        'Content-Type': 'application/json'
    }
};

// Add API client functions with detailed console logging
const ApiClient = {
    // Make API request with optional token and console logging
    async request(endpoint, method = 'GET', data = null, token = null) {
        const url = `http://localhost:8000${endpoint}`;
        
        console.log(`🔄 API Request: ${method} ${url}`);
        console.time(`API ${method} ${endpoint}`);
        
        const headers = { 'Content-Type': 'application/json' };
        
        // Use bearer token from current user if available
        if (APP_STATE.currentUser && APP_STATE.currentUser.bearerToken) {
            headers['Authorization'] = `Bearer ${APP_STATE.currentUser.bearerToken}`;
            console.log('🔑 Using stored bearer token for request');
        } else if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            method,
            headers,
            credentials: 'include'
        };
        
        if (data) {
            config.body = JSON.stringify(data);
            console.log('📤 Request Payload:', data);
        }
        
        try {
            const response = await fetch(url, config);
            console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
            
            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
                console.log('📥 Response Data:', responseData);
            } else {
                responseData = await response.text();
                console.log('📥 Response Text:', responseData.substring(0, 200) + 
                    (responseData.length > 200 ? '...' : ''));
            }
            
            console.timeEnd(`API ${method} ${endpoint}`);
            
            if (!response.ok) {
                throw new Error(responseData.detail || 'API request failed');
            }
            
            return responseData;
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            console.timeEnd(`API ${method} ${endpoint}`);
            throw error;
        }
    },
    
    // API Auth endpoints 
    auth: {
        signup: (userData) => ApiClient.request('/api/auth/signup', 'POST', userData),
        verifyToken: (idToken) => ApiClient.request('/api/auth/verify-token', 'POST', { id_token: idToken })
    }
};

// Mock Firebase auth implementation (CSP-friendly)
const mockFirebase = {
    auth() {
        return {
            signInWithCustomToken: (token) => {
                console.log('Mock Firebase: Sign in with custom token', token);
                
                // Extract user ID from token
                const uid = token.replace('mock_token_', '');
                
                // Find user with this UID
                const users = JSON.parse(localStorage.getItem('users') || '{}');
                const user = Object.values(users).find(u => u.uid === uid);
                
                if (!user) {
                    return Promise.reject(new Error('User not found'));
                }
                
                // Create userCredential object similar to Firebase
                return Promise.resolve({
                    user: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.name,
                        getIdToken: () => Promise.resolve(token)
                    }
                });
            },
            
            signInWithEmailAndPassword: (email, password) => {
                console.log('Mock Firebase: Sign in with email and password', email);
                
                // Check user credentials
                const users = JSON.parse(localStorage.getItem('users') || '{}');
                const user = users[email];
                
                if (!user || user.password !== password) {
                    return Promise.reject(new Error('Invalid email or password'));
                }
                
                // Create mock token
                const token = 'mock_token_' + user.uid;
                
                // Create userCredential object
                return Promise.resolve({
                    user: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.name,
                        getIdToken: () => Promise.resolve(token)
                    }
                });
            },
            
            signOut: () => {
                console.log('Mock Firebase: Sign out');
                return Promise.resolve();
            }
        };
    }
};

// Set mock Firebase in global scope
window.firebase = mockFirebase;

// Import necessary functions from modules
import { loadUserDashboard, openDashboard, closeDashboard } from './js/userDashboard.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

// Initialize application based on current URL
function initApp() {
    // Set default restaurant to "peakskitchen"
    const defaultRestaurantId = "peakskitchen";
    
    // Extract restaurant ID from URL - support both direct paths and hash-based routes
    const path = window.location.pathname;
    const hash = window.location.hash.substring(2); // Remove the #/ prefix
    let restaurantId = '';
    
    if (hash && RESTAURANTS[hash]) {
        // Hash-based routing: /#/restaurant-id
        restaurantId = hash;
    } else {
        // Direct path routing: /restaurant-id
        // Extract the last segment of the path and remove any trailing slash
        const pathSegments = path.split('/').filter(segment => segment.length > 0);
        const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
        
        if (lastSegment && RESTAURANTS[lastSegment]) {
            restaurantId = lastSegment;
        }
    }
    
    console.log("Path:", path);
    console.log("Hash:", hash);
    console.log("Resolved Restaurant ID:", restaurantId);
    
    if (restaurantId && RESTAURANTS[restaurantId]) {
        APP_STATE.currentRestaurant = {
            id: restaurantId,
            ...RESTAURANTS[restaurantId]
        };
    } else {
        // Default to peakskitchen
        APP_STATE.currentRestaurant = {
            id: defaultRestaurantId,
            ...RESTAURANTS[defaultRestaurantId]
        };
        
        // Update URL for proper routing
        const newPath = `#/${defaultRestaurantId}`;
        window.history.pushState({}, '', newPath);
    }
    
    loadRestaurantData();
    
    // Check if user is already logged in
    checkLoginStatus();
    
    // Set up dashboard
    setupDashboardEventListeners();
}

window.addEventListener('hashchange', function() {
    window.location.reload();
});

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

// Add the missing closeAllModals function if it doesn't exist
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

// Add the missing showClaimForm function
function showClaimForm() {
    if (!APP_STATE || APP_STATE.currentOfferClaimed) {
        return;
    }
    
    if (APP_STATE.currentUser) {
        generateAndShowCoupon();
    } else {
        APP_STATE.pendingClaim = true;
        document.getElementById('rewardModal').style.display = 'none';
        setTimeout(() => {
            document.getElementById('authModal').classList.remove('hidden');
            document.getElementById('authModal').style.display = 'block';
            switchAuthTab('signup');
        }, 100);
    }
}

// Add missing handleSpinAgain function
function handleSpinAgain() {
    closeAllModals();
    setTimeout(() => {
        spinSlotMachine();
    }, 300);
}

// Provide comprehensive error prevention by adding any potentially missing essential functions
function showWinningOffer() {
    const offerText = document.getElementById('offerText');
    const rewardModal = document.getElementById('rewardModal');
    const couponCode = document.getElementById('couponCode');
    const claimBtn = document.getElementById('claimBtn');
    const spinAgainBtn = document.getElementById('spinAgainBtn');
    
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

// Add a function to switch auth tabs if it doesn't exist
function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (tab === 'login') {
        if (loginTab) loginTab.classList.add('active');
        if (signupTab) signupTab.classList.remove('active');
        if (loginForm) loginForm.classList.remove('hidden');
        if (signupForm) signupForm.classList.add('hidden');
    } else {
        if (loginTab) loginTab.classList.remove('active');
        if (signupTab) signupTab.classList.add('active');
        if (loginForm) loginForm.classList.add('hidden');
        if (signupForm) signupForm.classList.remove('hidden');
    }
}

// Add openAuthModal function if it doesn't exist
function openAuthModal(mode = 'login') {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.remove('hidden');
        authModal.style.display = 'block';
    }
    
    if (mode === 'claim') {
        switchAuthTab('signup');
    } else {
        switchAuthTab('login');
    }
}

// Ensure handleOTPSubmit function exists
function handleOTPSubmit(e) {
    if (e) e.preventDefault();
    
    const otpInput = document.getElementById('otpInput');
    const verifyOTPBtn = document.getElementById('verifyOTPBtn');
    
    if (!otpInput || !APP_STATE.otpVerification) {
        console.error('OTP verification not properly initialized');
        return;
    }
    
    const otp = otpInput.value.trim();
    if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
        alert('Please enter a valid 4-digit OTP');
        return;
    }
    
    if (verifyOTPBtn) {
        verifyOTPBtn.disabled = true;
        verifyOTPBtn.textContent = 'Verifying...';
    }
    
    // Simulate success since we can't call the real API function without full implementation
    if (APP_STATE.otpVerification.afterVerification) {
        setTimeout(() => {
            const otpModal = document.getElementById('otpModal');
            if (otpModal) {
                otpModal.classList.add('hidden');
                otpModal.style.display = 'none';
            }
            
            APP_STATE.otpVerification.afterVerification();
            
            if (verifyOTPBtn) {
                verifyOTPBtn.disabled = false;
                verifyOTPBtn.textContent = 'Verify OTP';
            }
        }, 1000);
    }
}

// Ensure handleResendOTP function exists
function handleResendOTP() {
    const resendOTPBtn = document.getElementById('resendOTPBtn');
    
    if (!APP_STATE.otpVerification || !APP_STATE.otpVerification.phoneNumber) {
        console.error('OTP verification not properly initialized');
        return;
    }
    
    if (resendOTPBtn) {
        resendOTPBtn.disabled = true;
        resendOTPBtn.textContent = 'Sending...';
    }
    
    // Simulate success since we can't call the real sendOTP function without full implementation
    setTimeout(() => {
        alert('OTP has been resent to your phone');
        
        if (resendOTPBtn) {
            resendOTPBtn.disabled = false;
            resendOTPBtn.textContent = 'Resend OTP';
        }
    }, 1000);
}

// Set up all event listeners
function setupEventListeners() {
    // Use safe selection for all elements to avoid null reference errors
    if (document.getElementById('spinBtn')) {
        document.getElementById('spinBtn').addEventListener('click', spinSlotMachine);
    }
    
    // Use optional chaining with forEach to avoid errors if elements don't exist
    document.querySelectorAll('.close-modal')?.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Continue with other event listeners, each with safe selection
    if (document.getElementById('loginBtn')) {
        document.getElementById('loginBtn').addEventListener('click', openAuthModal);
    }
    
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    }
    
    if (document.getElementById('loginTab')) {
        document.getElementById('loginTab').addEventListener('click', () => switchAuthTab('login'));
    }
    
    if (document.getElementById('signupTab')) {
        document.getElementById('signupTab').addEventListener('click', () => switchAuthTab('signup'));
    }
    
    if (document.getElementById('loginSubmit')) {
        document.getElementById('loginSubmit').addEventListener('click', handleLogin);
    }
    
    if (document.getElementById('signupSubmit')) {
        document.getElementById('signupSubmit').addEventListener('click', handleSignup);
    }
    
    if (document.getElementById('claimBtn')) {
        document.getElementById('claimBtn').addEventListener('click', showClaimForm);
    }
    
    if (document.getElementById('spinAgainBtn')) {
        document.getElementById('spinAgainBtn').addEventListener('click', handleSpinAgain);
    }
    
    if (document.getElementById('dashboardBtn')) {
        document.getElementById('dashboardBtn').addEventListener('click', openDashboard);
    }
    
    if (document.getElementById('closeDashboard')) {
        document.getElementById('closeDashboard').addEventListener('click', closeDashboard);
    }
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Add welcome screen button listeners
    if (document.getElementById('spinButton')) {
        document.getElementById('spinButton').addEventListener('click', () => {
            document.getElementById('welcomeScreen').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
            
            // Make API request to localhost:8000 when spin button is clicked
            fetch('http://localhost:8000/')
                .then(response => {
                    console.log('🌐 API Response Status:', response.status, response.statusText);
                    return response.text();
                })
                .then(data => {
                    console.log('🌐 API Response from localhost:8000:');
                    console.log(data.substring(0, 500) + (data.length > 500 ? '...' : ''));
                })
                .catch(error => {
                    console.error('🌐 API Error from localhost:8000:', error);
                    console.log('Make sure your backend server is running at http://localhost:8000');
                });
        });
    }
    
    // Fix menu button navigation for Vercel deployment
    if (document.getElementById('menuButton')) {
        document.getElementById('menuButton').addEventListener('click', () => {
            const restaurantId = APP_STATE.currentRestaurant?.id || 'peakskitchen';
            
            // Check if we're on Vercel or another deployment
            const baseUrl = window.location.origin;
            
            // Navigate to menu.html with proper parameters
            window.location.href = `${baseUrl}/menu.html#/${restaurantId}`;
        });
    }

    // OTP related listeners
    if (document.getElementById('otpForm')) document.getElementById('otpForm').onsubmit = handleOTPSubmit;
    if (document.getElementById('resendOTPBtn')) document.getElementById('resendOTPBtn').onclick = handleResendOTP;
    if (document.getElementById('closeOTPModal')) document.getElementById('closeOTPModal').onclick = () => {
        document.getElementById('otpModal').classList.add('hidden');
        document.getElementById('otpModal').style.display = 'none';
        document.getElementById('signupSubmit').disabled = false;
        document.getElementById('signupSubmit').textContent = 'Sign Up';
        APP_STATE.otpVerification.inProgress = false;
    };

    // Add dashboard event listeners
    setupDashboardEventListeners();
}

// Make sure we're attaching event listeners correctly
function setupDashboardEventListeners() {
    document.getElementById('dashboardBtn').addEventListener('click', openDashboard);
    document.getElementById('closeDashboard').addEventListener('click', closeDashboard);
    document.getElementById('logoutBtnDashboard').addEventListener('click', handleLogout);
    document.getElementById('editProfileBtn').addEventListener('click', openEditProfileModal);
}

// Update the loadUserRewards function to call the new API-based loadUserDashboard
function loadUserRewards() {
    loadUserDashboard();
}
