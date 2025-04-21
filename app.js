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
    pendingClaim: false
};

// Helper functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

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
    setupDashboard();
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

// Set up all event listeners
function setupEventListeners() {
    $('#spinBtn').addEventListener('click', spinSlotMachine);
    $$('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    $('#loginBtn').addEventListener('click', openAuthModal);
    $('#logoutBtn').addEventListener('click', handleLogout);
    $('#loginTab').addEventListener('click', () => switchAuthTab('login'));
    $('#signupTab').addEventListener('click', () => switchAuthTab('signup'));
    $('#loginSubmit').addEventListener('click', handleLogin);
    $('#signupSubmit').addEventListener('click', handleSignup);
    $('#claimBtn').addEventListener('click', showClaimForm);
    $('#spinAgainBtn').addEventListener('click', handleSpinAgain);
    $('#dashboardBtn').addEventListener('click', openDashboard);
    $('#closeDashboard').addEventListener('click', closeDashboard);
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Add welcome screen button listeners
    if ($('#spinButton')) {
        $('#spinButton').addEventListener('click', () => {
            $('#welcomeScreen').classList.add('hidden');
            $('#mainContent').classList.remove('hidden');
        });
    }
    
    // Update the menu button to ensure it routes to peakskitchen
    if ($('#menuButton')) {
        $('#menuButton').addEventListener('click', () => {
            const restaurantId = APP_STATE.currentRestaurant?.id || 'peakskitchen';
            window.location.href = `menu.html?restaurant=${restaurantId}`;
        });
    }
}

function spinSlotMachine() {
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
        }, 500);
        
    }, SPIN_DURATION);
}

function showWinningOffer() {
    $('#offerText').textContent = APP_STATE.currentOffer;
    $('#rewardModal').classList.remove('hidden');
    $('#rewardModal').style.display = 'block';
    
    $('#couponCode').classList.add('hidden');
    APP_STATE.currentOfferClaimed = false;
    $('#claimBtn').style.display = 'block';
    $('#spinAgainBtn').style.display = 'block';
}

function closeAllModals() {
    const modals = $$('.modal');
    modals.forEach(modal => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    });
    
    $('#dashboard').classList.remove('show');
    APP_STATE.currentOfferClaimed = false;
}

function handleSpinAgain() {
    closeAllModals();
    setTimeout(() => {
        spinSlotMachine();
    }, 300);
}

function showClaimForm() {
    if (APP_STATE.currentOfferClaimed) {
        return;
    }
    
    if (APP_STATE.currentUser) {
        generateAndShowCoupon();
    } else {
        APP_STATE.pendingClaim = true;
        $('#rewardModal').style.display = 'none';
        setTimeout(() => {
            $('#authModal').classList.remove('hidden');
            $('#authModal').style.display = 'block';
            switchAuthTab('signup');
        }, 100);
    }
}

function generateAndShowCoupon() {
    const couponCode = generateCouponCode();
    $('#couponValue').textContent = couponCode;
    $('#couponCode').classList.remove('hidden');
    $('#claimBtn').style.display = 'none';
    APP_STATE.currentOfferClaimed = true;
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

function openAuthModal(mode = 'login') {
    $('#authModal').classList.remove('hidden');
    $('#authModal').style.display = 'block';
    if (mode === 'claim') {
        switchAuthTab('signup');
    } else {
        switchAuthTab('login');
    }
}

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

function handleLogin() {
    const email = $('#loginEmail').value;
    const password = $('#loginPassword').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    $('#loginSubmit').disabled = true;
    $('#loginSubmit').textContent = 'Logging in...';
    
    window.firebaseAuth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            const userData = users[email] || {};
            
            const user = {
                uid: userCredential.user.uid,
                email: email,
                name: userData.name || email.split('@')[0],
                phone: userData.phone || ''
            };
            
            loginUser(user);
            closeAllModals();
            
            if (APP_STATE.pendingClaim && APP_STATE.currentOffer) {
                setTimeout(() => {
                    $('#rewardModal').classList.remove('hidden');
                    $('#rewardModal').style.display = 'block';
                    generateAndShowCoupon();
                    APP_STATE.pendingClaim = false;
                }, 500);
            }
        })
        .catch((error) => {
            console.error("Login error:", error);
            alert(`Login failed: ${error.message}`);
        })
        .finally(() => {
            $('#loginSubmit').disabled = false;
            $('#loginSubmit').textContent = 'Login';
        });
}

function handleSignup() {
    const name = $('#signupName').value;
    const email = $('#signupEmail').value;
    const password = $('#signupPassword').value;
    const phone = $('#signupPhone').value;
    
    if (!name || !email || !password || !phone) {
        alert('Please fill in all fields');
        return;
    }
    
    $('#signupSubmit').disabled = true;
    $('#signupSubmit').textContent = 'Signing up...';
    
    window.firebaseAuth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const newUser = { 
                uid: userCredential.user.uid,
                name, 
                email, 
                password,
                phone 
            };
            
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            users[email] = newUser;
            localStorage.setItem('users', JSON.stringify(users));
            
            loginUser({
                uid: userCredential.user.uid,
                email,
                name,
                phone
            });
            
            closeAllModals();
            
            if (APP_STATE.pendingClaim && APP_STATE.currentOffer) {
                setTimeout(() => {
                    $('#rewardModal').classList.remove('hidden');
                    $('#rewardModal').style.display = 'block';
                    generateAndShowCoupon();
                    APP_STATE.pendingClaim = false;
                }, 500);
            }
        })
        .catch((error) => {
            console.error("Signup error:", error);
            alert(`Signup failed: ${error.message}`);
        })
        .finally(() => {
            $('#signupSubmit').disabled = false;
            $('#signupSubmit').textContent = 'Sign Up';
        });
}

function handleLogout() {
    window.firebaseAuth.signOut()
        .then(() => {
            APP_STATE.currentUser = null;
            localStorage.removeItem('currentUser');
            
            $('#loginBtn').classList.remove('hidden');
            $('#logoutBtn').classList.add('hidden');
            $('#dashboardBtn').classList.add('hidden');
            
            $('#result').textContent = 'You have been logged out';
            setTimeout(() => {
                $('#result').textContent = '';
            }, 3000);
        })
        .catch((error) => {
            console.error("Logout error:", error);
        });
}

function checkLoginStatus() {
    window.firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    APP_STATE.currentUser = JSON.parse(savedUser);
                    
                    $('#loginBtn').classList.add('hidden');
                    $('#logoutBtn').classList.remove('hidden');
                    $('#dashboardBtn').classList.remove('hidden');
                } catch (e) {
                    console.error("Error parsing saved user", e);
                }
            }
        }
    });
}

function setupDashboard() {
    $('#dashboardBtn').addEventListener('click', openDashboard);
    $('#closeDashboard').addEventListener('click', closeDashboard);
}

function openDashboard() {
    if (!APP_STATE.currentUser) return;
    
    loadUserRewards();
    
    $('#dashboard').classList.remove('hidden');
    $('#dashboard').style.display = 'block';
    
    setTimeout(() => {
        $('#dashboard').classList.add('show');
    }, 10);
}

function closeDashboard() {
    $('#dashboard').classList.remove('show');
    
    setTimeout(() => {
        $('#dashboard').classList.add('hidden');
        $('#dashboard').style.display = 'none';
    }, 400);
}

function loadUserRewards() {
    const rewardsList = $('#rewardsList');
    rewardsList.innerHTML = '';
    
    if (!APP_STATE.currentUser) return;
    
    $('#userName').textContent = APP_STATE.currentUser.name;
    rewardsList.innerHTML = '<p>Loading your rewards...</p>';
    
    const claimedRewards = JSON.parse(localStorage.getItem(`rewards_${APP_STATE.currentUser.email}`)) || [];
    
    if (claimedRewards.length === 0) {
        rewardsList.innerHTML = '<p class="no-rewards">You haven\'t claimed any rewards yet. Spin to win!</p>';
        return;
    }
    
    rewardsList.innerHTML = '';
    
    const rewardsByRestaurant = {};
    claimedRewards.forEach((reward) => {
        const restaurantId = reward.restaurantId || 'unknown';
        
        if (!rewardsByRestaurant[restaurantId]) {
            rewardsByRestaurant[restaurantId] = [];
        }
        
        rewardsByRestaurant[restaurantId].push(reward);
    });
    
    Object.entries(rewardsByRestaurant).forEach(([restaurantId, rewards]) => {
        rewards.forEach(reward => {
            const card = createRewardCard(reward);
            rewardsList.appendChild(card);
        });
    });
}

function createRewardCard(reward) {
    const card = document.createElement('div');
    card.className = 'reward-card';
    
    const formattedDate = new Date(reward.claimedDate).toLocaleDateString();
    
    card.innerHTML = `
        <div class="restaurant-tag">${reward.restaurantName}</div>
        <h3 class="reward-title">${reward.offer}</h3>
        <p class="reward-info">Claimed on: ${formattedDate}</p>
        <div class="reward-code">${reward.couponCode}</div>
    `;
    
    return card;
}

function showError(message) {
    $('#loading').innerHTML = `
        <div class="error-message">
            <h2>Oops!</h2>
            <p>${message}</p>
            <button id="goHomeBtn">Go to Homepage</button>
        </div>
    `;
    
    $('#goHomeBtn').addEventListener('click', () => {
        window.location.href = '/';
    });
}
