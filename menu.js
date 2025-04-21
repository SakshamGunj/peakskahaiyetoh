document.addEventListener('DOMContentLoaded', () => {

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


}); // End DOMContentLoaded