// This file will load Firebase from a local source for CSP compatibility

// Function to load a script dynamically
function loadScript(src, callback) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
}

// Create global container for Firebase
window.firebaseScripts = {};

// Define the Firebase scripts to load
const scripts = [
    { name: 'app', src: 'firebase/firebase-app-compat.js' },
    { name: 'auth', src: 'firebase/firebase-auth-compat.js' }
];

// Load scripts sequentially
let loadedCount = 0;
function loadNextScript() {
    if (loadedCount < scripts.length) {
        const script = scripts[loadedCount];
        loadScript(script.src, function() {
            window.firebaseScripts[script.name] = true;
            loadedCount++;
            loadNextScript();
        });
    } else {
        // All scripts loaded
        console.log('All Firebase scripts loaded');
        
        // Initialize Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyALZiqfQXlCGqRCI_NN3127oZhIkFd6unk",
            authDomain: "spinthewheel-e14a6.firebaseapp.com",
            projectId: "spinthewheel-e14a6",
            storageBucket: "spinthewheel-e14a6.appspot.com",
            messagingSenderId: "186691676465",
            appId: "1:186691676465:web:a67ad5afc60424d586e810",
            measurementId: "G-SC1JQLBXHY"
        };

        // Initialize Firebase only when everything is loaded
        firebase.initializeApp(firebaseConfig);
        
        // Signal the main app that Firebase is ready
        const event = new Event('firebase-ready');
        document.dispatchEvent(event);
    }
}

// Start loading
loadNextScript();
