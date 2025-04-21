// Slot machine functionality

import { showWinningOffer } from './ui.js';

// Constants
const SPIN_DURATION = 3000; // 3 seconds for the spin animation
const SPIN_SPEED = 100; // Speed between slot items change in ms
const SLOT_ITEM_HEIGHT = 184; // Height of each slot item in pixels

let slotItems;
let spinInterval;

// Initialize the slot machine with offers
function initSlotMachine() {
    const slotItemsContainer = $('#slotItems');
    slotItemsContainer.innerHTML = '';
    
    if (!APP_STATE.offers || APP_STATE.offers.length === 0) return;
    
    // Create slot items (3x the number of offers for continuous looping effect)
    for (let i = 0; i < 3; i++) {
        APP_STATE.offers.forEach(offer => {
            const slotItem = document.createElement('div');
            slotItem.className = 'slot-item';
            slotItem.textContent = offer;
            slotItemsContainer.appendChild(slotItem);
        });
    }
    
    slotItems = slotItemsContainer;
}

// Spin the slot machine
function spinSlotMachine() {
    if (APP_STATE.spinning) return;
    
    APP_STATE.spinning = true;
    $('#spinBtn').disabled = true;
    $('#result').textContent = '';
    
    // Calculate total height of all items
    const totalItems = APP_STATE.offers.length;
    const totalHeight = totalItems * SLOT_ITEM_HEIGHT;
    
    // Start spinning animation
    let counter = 0;
    spinInterval = setInterval(() => {
        counter++;
        const position = -(counter % totalItems) * SLOT_ITEM_HEIGHT;
        slotItems.style.transform = `translateY(${position}px)`;
    }, SPIN_SPEED);
    
    // Stop spinning after the duration
    setTimeout(() => {
        clearInterval(spinInterval);
        APP_STATE.spinning = false;
        $('#spinBtn').disabled = false;
        
        // Select random offer
        const randomIndex = Math.floor(Math.random() * APP_STATE.offers.length);
        APP_STATE.currentOffer = APP_STATE.offers[randomIndex];
        
        // Position slot machine to show the winning offer
        const finalPosition = -(randomIndex * SLOT_ITEM_HEIGHT);
        slotItems.style.transition = 'transform 0.5s ease-out';
        slotItems.style.transform = `translateY(${finalPosition}px)`;
        
        setTimeout(() => {
            slotItems.style.transition = 'transform 0.1s ease-out';
            showWinningOffer();
        }, 500);
        
    }, SPIN_DURATION);
}

export { initSlotMachine, spinSlotMachine };
