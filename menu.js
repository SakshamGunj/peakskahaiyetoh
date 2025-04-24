document.addEventListener('DOMContentLoaded', () => {

    // Get restaurant ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let restaurantId = urlParams.get('restaurant');
    
    // If no restaurant in URL params, check hash
    if (!restaurantId) {
        const hash = window.location.hash.substring(2); // Remove the #/ prefix
        if (hash) {
            restaurantId = hash;
        }
    }
    
    // Default to peakskitchen if no restaurant ID found
    if (!restaurantId) {
        restaurantId = 'peakskitchen';
    }
    
    console.log(`Loading menu for restaurant: ${restaurantId}`);
    
    // Load the restaurant menu (assuming you have a function for this)
    loadRestaurantMenu(restaurantId);

    const categoryNav = document.getElementById('category-nav');
    const mainContent = document.querySelector('.main-content'); // Use main content area

    // --- Smooth Scrolling & Active Tab ---
    const navLinks = document.querySelectorAll('.category-navbar a');
    const menuSections = document.querySelectorAll('.menu-section');

    function getStickyNavHeight() {
        // Calculate height only if it's currently sticky
        if (categoryNav && getComputedStyle(categoryNav).position === 'sticky') {
            return categoryNav.offsetHeight;
        }
        return 0;
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const navHeight = getStickyNavHeight();
                // Calculate offset relative to the main scrollable container if needed,
                // but window scroll usually works if body is the main scroll area.
                const offsetTop = targetSection.offsetTop - navHeight - 15; // Extra buffer

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                updateActiveLink(link);
            }
        });
    });

    // --- Function to update active link ---
    function updateActiveLink(activeLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (activeLink) {
            activeLink.classList.add('active');

            // Scroll the nav itself to keep the active link visible
             activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    // --- Active Tab Highlighting on Scroll ---
     const observerOptions = {
         root: null,
         // Adjust rootMargin based on sticky nav height. Negative top margin 'pulls up' the intersection boundary.
         // Bottom margin ensures sections lower down trigger correctly.
         rootMargin: `-${getStickyNavHeight() + 20}px 0px -40% 0px`,
         threshold: 0
     };


    // Debounce function to limit rapid observer calls during scroll
    function debounce(func, wait = 20, immediate = false) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    const handleIntersect = debounce((entries, observer) => {
         // Check intersection from bottom up to prioritize lower sections when multiple are visible
        let bestIntersectingEntry = null;
         entries.forEach(entry => {
             if (entry.isIntersecting) {
                  // Simple check: if it's intersecting, consider it.
                 // More complex logic could check entry.intersectionRatio or boundingClientRect.top
                 bestIntersectingEntry = entry;
             }
         });

        if(bestIntersectingEntry) {
            const intersectingId = bestIntersectingEntry.target.id;
            const correspondingLink = document.querySelector(`.category-navbar a[href="#${intersectingId}"]`);
            updateActiveLink(correspondingLink);
        }
    }, 50); // Debounce observer calls slightly


     // Re-calculate observer rootMargin if window resizes (nav height might change)
     let sectionObserver;
     function setupObserver() {
        if (sectionObserver) sectionObserver.disconnect(); // Disconnect previous if exists

        const currentNavHeight = getStickyNavHeight(); // Recalculate height
        observerOptions.rootMargin = `-${currentNavHeight + 20}px 0px -40% 0px`;

        sectionObserver = new IntersectionObserver(handleIntersect, observerOptions);
        menuSections.forEach(section => {
             sectionObserver.observe(section);
        });
     }

     setupObserver(); // Initial setup
     window.addEventListener('resize', debounce(setupObserver, 250)); // Re-setup on resize


    // --- Simple Menu Search Filter (No changes needed from previous version) ---
    const searchInput = document.getElementById('menu-search');
    const allMenuItems = document.querySelectorAll('.menu-item'); // Select ALL items, including top picks

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        allMenuItems.forEach(item => {
            const itemNameElement = item.querySelector('h3');
            const itemDescElement = item.querySelector('.item-description');
            const itemTags = item.dataset.tags ? item.dataset.tags.toLowerCase() : '';
            const itemPriceElement = item.querySelector('.price');

            const itemName = itemNameElement ? itemNameElement.textContent.toLowerCase() : '';
            const itemDesc = itemDescElement ? itemDescElement.textContent.toLowerCase() : '';
            const itemPrice = itemPriceElement ? itemPriceElement.textContent.toLowerCase() : '';

            const itemText = `${itemName} ${itemDesc} ${itemTags} ${itemPrice}`;

            // Consider the container: only hide items within #menu-container, not .top-pick-card
            const parentContainer = item.closest('#menu-container') || item.closest('.top-picks-container');
            const isSearchableItem = parentContainer && parentContainer.id === 'menu-container'; // Only filter main list for now

            if (!isSearchableItem || itemText.includes(searchTerm)) {
                item.style.display = 'flex'; // Show matching or non-filterable items
            } else {
                item.style.display = 'none'; // Hide non-matching items in main list
            }
        });

        // Show/hide category titles if all items within are hidden (applies only to main sections)
        menuSections.forEach(section => {
             const visibleItems = section.querySelectorAll('.menu-item[style*="display: flex"], .menu-item:not([style*="display"])');
             const title = section.querySelector('h2');
             if(title){
                  title.style.display = visibleItems.length > 0 ? 'block' : 'none'; // Use block display for H2
             }
        });
    });

    // ====== Added Cart and Order Functionality =====
    
    // Shopping cart data structure
    const cart = {
        items: [],
        get totalItems() {
            return this.items.reduce((sum, item) => sum + item.quantity, 0);
        },
        get subtotal() {
            return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },
        get total() {
            return this.subtotal + 25; // Adding delivery fee
        },
        addItem(item) {
            // Check if item already exists
            const existingItem = this.items.find(i => i.id === item.id);
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                this.items.push(item);
            }
            // Save cart to localStorage
            this.saveToLocalStorage();
            this.updateCartUI();
        },
        removeItem(itemId) {
            this.items = this.items.filter(item => item.id !== itemId);
            this.saveToLocalStorage();
            this.updateCartUI();
        },
        updateItemQuantity(itemId, quantity) {
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                item.quantity = quantity;
                this.saveToLocalStorage();
                this.updateCartUI();
            }
        },
        clear() {
            this.items = [];
            this.saveToLocalStorage();
            this.updateCartUI();
        },
        saveToLocalStorage() {
            localStorage.setItem('menuCart', JSON.stringify(this.items));
        },
        loadFromLocalStorage() {
            const savedCart = localStorage.getItem('menuCart');
            if (savedCart) {
                this.items = JSON.parse(savedCart);
                this.updateCartUI();
            }
        },
        updateCartUI() {
            // Update cart count
            const cartCount = document.getElementById('cart-count');
            cartCount.textContent = this.totalItems;
            
            // Update cart modal
            const cartItemsContainer = document.getElementById('cart-items');
            cartItemsContainer.innerHTML = '';
            
            if (this.items.length === 0) {
                cartItemsContainer.innerHTML = '<p class="empty-cart-message">Your cart is empty</p>';
            } else {
                this.items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'cart-item';
                    itemElement.innerHTML = `
                        <div class="cart-item-details">
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-price">₹${item.price} × ${item.quantity}</div>
                            <div class="cart-item-quantity">Total: ₹${item.price * item.quantity}</div>
                        </div>
                        <div class="remove-item" data-id="${item.id}">×</div>
                    `;
                    cartItemsContainer.appendChild(itemElement);
                });
            }
            
            // Update cart summary
            document.getElementById('subtotal').textContent = this.subtotal;
            document.getElementById('cart-total').textContent = this.total;
            
            // Add event listeners to remove buttons
            const removeButtons = document.querySelectorAll('.remove-item');
            removeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const itemId = button.getAttribute('data-id');
                    this.removeItem(itemId);
                });
            });
        }
    };
    
    // Initialize cart from localStorage
    cart.loadFromLocalStorage();
    
    // Quantity modal elements
    const quantityModal = document.getElementById('quantity-modal');
    const itemNameEl = document.getElementById('item-name');
    const itemDescriptionEl = document.getElementById('item-description');
    const itemPriceEl = document.getElementById('item-price');
    const quantityInput = document.getElementById('quantity');
    const totalPriceEl = document.getElementById('total-price');
    const closeModalBtn = document.querySelector('.close-modal');
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');
    const addToCartBtn = document.getElementById('add-to-cart');
    
    // Cart modal elements
    const cartModal = document.getElementById('cart-modal');
    const cartButton = document.getElementById('cart-button');
    const closeCartModalBtn = document.querySelector('.close-cart-modal');
    const placeOrderBtn = document.getElementById('place-order');
    
    // Success modal elements
    const successModal = document.getElementById('success-modal');
    const closeSuccessModalBtn = document.querySelector('.close-success-modal');
    const continueShoppingBtn = document.getElementById('continue-shopping');
    const viewOrdersBtn = document.getElementById('view-orders');
    
    // Order dashboard elements - using the notification bell icon instead
    const orderDashboardBtn = document.getElementById('order-dashboard-button');
    const orderDashboard = document.getElementById('order-dashboard');
    const closeOrderDashboardBtn = document.getElementById('close-order-dashboard');
    
    // Current item being added
    let currentItem = null;
    
    // Add click event listeners to all add buttons
    const addButtons = document.querySelectorAll('.add-button');
    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const menuItem = button.closest('.menu-item');
            
            if (menuItem) {
                // Get item details
                const id = generateItemId(menuItem);
                const name = menuItem.querySelector('h3').textContent;
                const description = menuItem.querySelector('.item-description')?.textContent || '';
                const priceText = menuItem.querySelector('.price').textContent;
                const price = parseInt(priceText.replace('₹', '').trim());
                
                // Update modal with item details
                itemNameEl.textContent = name;
                itemDescriptionEl.textContent = description;
                itemPriceEl.textContent = price;
                quantityInput.value = 1;
                totalPriceEl.textContent = price;
                
                // Set current item
                currentItem = { id, name, description, price, quantity: 1 };
                
                // Show modal
                quantityModal.style.display = 'flex';
            }
        });
    });
    
    // Generate unique ID for menu item
    function generateItemId(menuItem) {
        const name = menuItem.querySelector('h3').textContent;
        return 'item_' + name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substring(2, 8);
    }
    
    // Close modal
    closeModalBtn.addEventListener('click', () => {
        quantityModal.style.display = 'none';
    });
    
    // Close cart modal
    closeCartModalBtn.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
    
    // Close success modal
    closeSuccessModalBtn.addEventListener('click', () => {
        successModal.style.display = 'none';
    });
    
    // Continue shopping
    continueShoppingBtn.addEventListener('click', () => {
        successModal.style.display = 'none';
    });
    
    // View orders
    viewOrdersBtn.addEventListener('click', () => {
        successModal.style.display = 'none';
        openOrderDashboard();
    });
    
    // Decrease quantity
    decreaseBtn.addEventListener('click', () => {
        const currentQuantity = parseInt(quantityInput.value);
        if (currentQuantity > 1) {
            quantityInput.value = currentQuantity - 1;
            updateTotalPrice();
        }
    });
    
    // Increase quantity
    increaseBtn.addEventListener('click', () => {
        const currentQuantity = parseInt(quantityInput.value);
        if (currentQuantity < 10) {
            quantityInput.value = currentQuantity + 1;
            updateTotalPrice();
        }
    });
    
    // Update total price when quantity changes
    quantityInput.addEventListener('change', () => {
        let value = parseInt(quantityInput.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 10) value = 10;
        quantityInput.value = value;
        updateTotalPrice();
    });
    
    // Update total price
    function updateTotalPrice() {
        const quantity = parseInt(quantityInput.value);
        const price = parseInt(itemPriceEl.textContent);
        totalPriceEl.textContent = quantity * price;
    }
    
    // Add to cart
    addToCartBtn.addEventListener('click', () => {
        if (currentItem) {
            // Update quantity from input
            currentItem.quantity = parseInt(quantityInput.value);
            
            // Add special instructions if any
            const instructions = document.getElementById('instructions').value;
            if (instructions.trim()) {
                currentItem.instructions = instructions.trim();
            }
            
            // Add to cart
            cart.addItem(currentItem);
            
            // Close modal
            quantityModal.style.display = 'none';
            
            // Show confirmation toast
            showToast(`${currentItem.name} added to cart!`);
        }
    });
    
    // Show toast message
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove toast after 2 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }
    
    // Show cart modal
    cartButton.addEventListener('click', () => {
        cartModal.style.display = 'flex';
    });
    
    // Place order
    placeOrderBtn.addEventListener('click', () => {
        if (cart.items.length === 0) {
            showToast('Your cart is empty!');
            return;
        }
        
        // Get user info from localStorage or create a guest user
        let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        if (!currentUser.uid) {
            // Create a guest user instead of redirecting
            currentUser = {
                uid: 'guest_' + Date.now() + Math.random().toString(36).substring(2, 8),
                name: 'Guest',
                email: 'guest@example.com',
                isGuest: true
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        // Create order object
        const order = {
            userId: currentUser.uid,
            userName: currentUser.name || 'Guest',
            items: cart.items,
            subtotal: cart.subtotal,
            deliveryFee: 25,
            total: cart.total,
            status: 'pending',
            orderTime: new Date().toISOString(),
            restaurantId: restaurantId || 'Guest'
        };
        
        // Save order to localStorage for now (in a real app, this would be an API call)
        const orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
        order.id = 'order_' + Date.now();
        orders.push(order);
        localStorage.setItem('userOrders', JSON.stringify(orders));
        
        // Clear cart
        cart.clear();
        
        // Close cart modal
        cartModal.style.display = 'none';
        
        // Show order ID in success modal
        document.getElementById('order-id').textContent = order.id;
        
        // Update notification badge
        updateNotificationBadge();
        
        // Show success modal
        successModal.style.display = 'flex';
    });
    
    // Open order dashboard
    function openOrderDashboard() {
        // Check if user is logged in, create guest user if not
        let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        // Instead of redirecting, create a guest user
        if (!currentUser.uid) {
            currentUser = {
                uid: 'guest_' + Date.now() + Math.random().toString(36).substring(2, 8),
                name: 'Guest',
                email: 'guest@example.com',
                isGuest: true
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        // Show the dashboard
        orderDashboard.style.display = 'block';
        setTimeout(() => {
            orderDashboard.classList.add('show');
            loadOrders();
        }, 10);
    }
    
    // Load orders
    function loadOrders() {
        const orderList = document.getElementById('order-list');
        if (!orderList) return;
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.uid) return;
        
        // Get orders from localStorage
        const allOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
        const userOrders = allOrders.filter(order => order.userId === currentUser.uid);
        
        // Update user info
        const userName = document.getElementById('dashboard-user-name');
        if (userName) {
            userName.textContent = currentUser.name || currentUser.email;
        }
        
        // Clear order list
        orderList.innerHTML = '';
        
        // Check if there are any orders
        if (userOrders.length === 0) {
            orderList.innerHTML = '<div class="no-orders">You have not placed any orders yet.</div>';
            return;
        }
        
        // Sort orders by time (newest first)
        userOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
        
        // Create order cards
        userOrders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            
            // Format date
            const orderDate = new Date(order.orderTime);
            const formattedDate = orderDate.toLocaleString('en-US', {
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Create order status badge
            const statusClass = getStatusClass(order.status);
            
            // Generate order items HTML
            const itemsHTML = order.items.map(item => `
                <div class="order-item">
                    <span class="item-quantity">${item.quantity}×</span>
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">₹${item.price * item.quantity}</span>
                </div>
            `).join('');
            
            orderCard.innerHTML = `
                <div class="order-header">
                    <div>
                        <h3 class="order-id">Order #${order.id.split('_')[1]}</h3>
                        <p class="order-date">${formattedDate}</p>
                    </div>
                    <span class="order-status ${statusClass}">${capitalizeFirstLetter(order.status)}</span>
                </div>
                <div class="order-items">
                    ${itemsHTML}
                </div>
                <div class="order-total">
                    <p>Total: <span>₹${order.total}</span></p>
                </div>
            `;
            orderList.appendChild(orderCard);
        });
    }
    
    // Close order dashboard
    function closeOrderDashboard() {
        orderDashboard.classList.remove('show');
        setTimeout(() => {
            orderDashboard.style.display = 'none';
        }, 300);
    }
    
    // Handle clicks on order dashboard button
    orderDashboardBtn?.addEventListener('click', openOrderDashboard);
    
    // Handle clicks on close order dashboard button
    closeOrderDashboardBtn?.addEventListener('click', closeOrderDashboard);
    
    // Helper function to get status class
    function getStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'pending': return 'status-pending';
            case 'processing': return 'status-processing';
            case 'delivered': return 'status-delivered';
            case 'cancelled': return 'status-cancelled';
            default: return 'status-pending';
        }
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Add CSS for toasts
    const style = document.createElement('style');
    style.innerHTML = `
        .toast {
            position: fixed;
            bottom: calc(var(--bottom-nav-height) + 20px);
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background-color: var(--card-bg);
            color: var(--text-color);
            padding: 12px 20px;
            border-radius: var(--border-radius);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            border: 1px solid var(--border-color);
        }
        
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        
        .empty-cart-message {
            text-align: center;
            color: var(--text-light);
            padding: 20px 0;
        }
        
        /* Notification badge styles */
        .notification-icon {
            position: relative;
            cursor: pointer;
        }
        
        .notification-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background-color: var(--primary-color);
            color: white;
            font-size: 12px;
            font-weight: bold;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
            100% {
                transform: scale(1);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Function to update the notification badge on the bell icon
    function updateNotificationBadge() {
        const bellIcon = document.querySelector('.notification-icon');
        if (!bellIcon) return;
        
        // Create badge if it doesn't exist
        let badge = bellIcon.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            bellIcon.appendChild(badge);
        }
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.uid) {
            badge.style.display = 'none';
            return;
        }
        
        // Get orders from localStorage
        const allOrders = JSON.parse(localStorage.getItem('userOrders') || '[]');
        const userOrders = allOrders.filter(order => order.userId === currentUser.uid);
        
        // Update badge count
        if (userOrders.length > 0) {
            badge.textContent = userOrders.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Update notification badge on page load
    updateNotificationBadge();

}); // End DOMContentLoaded

// This function would be specific to your menu.html implementation
function loadRestaurantMenu(restaurantId) {
    // Set restaurant name and description in the menu page
    const restaurantName = document.getElementById('restaurantName');
    const restaurantDesc = document.getElementById('restaurantDescription');
    
    if (restaurantName && restaurantDesc) {
        // Set to Peaks Kitchen if available
        if (restaurantId === 'peakskitchen') {
            restaurantName.textContent = "Peaks Kitchen";
            restaurantDesc.textContent = "Experience the authentic taste of Italy with our hand-tossed pizzas, baked in wood-fired ovens and topped with premium ingredients.";
        } else {
            // Handle other restaurants or fallback to Peaks Kitchen
            restaurantName.textContent = "Peaks Kitchen";
            restaurantDesc.textContent = "Experience the authentic taste of Italy with our hand-tossed pizzas, baked in wood-fired ovens and topped with premium ingredients.";
        }
    }
    
    // Load menu items specific to this restaurant
    // This part would depend on your menu.html structure
}