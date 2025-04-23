/**
 * API Client for Restaurant Slot Machine Game
 */

// Update Base API URL to use HTTPS
const API_BASE_URL = 'https://funk-456015.uc.r.appspot.com';

// API client for making requests to the backend
const ApiClient = {
    /**
     * Make an API request with proper error handling and logging
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        console.log(`🔄 API Request: ${method} ${url}`);
        console.time(`API ${method} ${endpoint}`);
        
        const headers = { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Use bearer token from current user if available
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && currentUser.bearerToken) {
            headers['Authorization'] = `Bearer ${currentUser.bearerToken}`;
            console.log('🔑 Using stored bearer token for request');
        }
        
        const config = {
            method,
            headers,
            // For signup endpoint specifically, use 'no-cors' mode
            mode: endpoint === '/api/auth/signup' ? 'no-cors' : 'cors',
            credentials: 'omit' // Keep credentials omitted to avoid CORS errors
        };
        
        if (data) {
            config.body = JSON.stringify(data);
            console.log('📤 Request Payload:', data);
        }
        
        try {
            // Add custom handling for signup endpoint to deal with CORS
            if (endpoint === '/api/auth/signup') {
                // Use XMLHttpRequest for signup which handles CORS differently
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open(method, url, true);
                    
                    // Add the headers
                    Object.entries(headers).forEach(([key, value]) => {
                        xhr.setRequestHeader(key, value);
                    });
                    
                    xhr.onload = function() {
                        console.log(`📥 Response Status: ${xhr.status} ${xhr.statusText}`);
                        
                        if (xhr.status >= 200 && xhr.status < 300) {
                            // Success
                            try {
                                const responseData = JSON.parse(xhr.responseText);
                                console.log('📥 Response Data:', responseData);
                                console.timeEnd(`API ${method} ${endpoint}`);
                                resolve(responseData);
                            } catch (e) {
                                console.timeEnd(`API ${method} ${endpoint}`);
                                // If it's not JSON but still a success, return a standard response
                                resolve({ success: true, message: 'User created successfully' });
                            }
                        } else {
                            console.timeEnd(`API ${method} ${endpoint}`);
                            reject(new Error(`Signup failed with status ${xhr.status}`));
                        }
                    };
                    
                    xhr.onerror = function() {
                        console.error(`❌ API Error (${endpoint}): Network error`);
                        console.timeEnd(`API ${method} ${endpoint}`);
                        reject(new Error('Network error during signup'));
                    };
                    
                    // Send the request with data
                    xhr.send(data ? JSON.stringify(data) : null);
                });
            }
            
            // For all other endpoints, use standard fetch
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
                let errorMessage;
                
                // Better error handling for different response types
                if (typeof responseData === 'object' && responseData !== null) {
                    // If it's an object, try to extract a meaningful error message
                    if (responseData.detail) {
                        if (Array.isArray(responseData.detail)) {
                            errorMessage = responseData.detail.map(item => 
                                typeof item === 'object' ? JSON.stringify(item) : item
                            ).join(', ');
                        } else {
                            errorMessage = responseData.detail;
                        }
                    } else {
                        errorMessage = `API request failed with status ${response.status}`;
                    }
                } else if (typeof responseData === 'string') {
                    errorMessage = responseData || `API request failed with status ${response.status}`;
                } else {
                    errorMessage = `API request failed with status ${response.status}`;
                }
                
                throw new Error(errorMessage);
            }
            
            return responseData;
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            console.timeEnd(`API ${method} ${endpoint}`);
            throw error;
        }
    },
    
    // Auth endpoints - improved with better error handling
    auth: {
        login: (credentials) => ApiClient.request('/api/auth/login', 'POST', credentials),
        
        signup: (userData) => {
            console.log('Original userData:', userData);
            
            // Get the phone number directly from the form
            const phoneInput = document.getElementById('signupPhone');
            const phoneNumber = phoneInput ? phoneInput.value : '';
            
            // Ensure we send a clean phone number (digits only)
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            
            // Create a new object with the correctly formatted number field
            const signupPayload = { 
                ...userData,
                number: cleanPhone // Properly formatted phone number for the API
            };
            
            console.log('📱 Sending signup with WhatsApp number:', cleanPhone);
            console.log('Complete signup payload:', signupPayload);
            
            return ApiClient.request('/api/auth/signup', 'POST', signupPayload);
        },
        
        verifyToken: async (token) => {
            try {
                // Improve the token payload format based on the error
                console.log(token)
                const tokenPayload = {token};
                console.log('🔑 Verifying token:', tokenPayload);
                
                return await ApiClient.request('/api/auth/verify-token', 'POST', token);
            } catch (error) {
                // Provide more detailed error information
                console.error('🔑 Token verification error details:', error);
                
                // Extract error details if it's an object
                let errorMessage = 'Token verification failed';
                if (typeof error === 'object') {
                    if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    // Log the detailed error object
                    console.log('Error object details:', JSON.stringify(error));
                }
                
                // If the error is a 422 (validation error), it's expected for expired tokens
                if (errorMessage.includes('422') || errorMessage.includes('[object Object]')) {
                    console.log('🔑 Token likely expired or invalid, proceeding as logged out');
                    return { valid: false, reason: 'Token expired or invalid' };
                }
                
                // Don't propagate errors from token verification to avoid breaking the app
                return { valid: false, reason: errorMessage };
            }
        }
    },
    
    // OTP endpoints without fallback mock implementations
    otp: {
        send: (phoneNumber) => ApiClient.request('/api/otp/send', 'POST', { number: phoneNumber }),
        verify: (phoneNumber, otp) => ApiClient.request('/api/otp/verify', 'POST', { number: phoneNumber, otp })
    },
    
    // Rewards endpoints
    rewards: {
        claim: (rewardData) => ApiClient.request('/api/rewards/', 'POST', rewardData)
    },
    
    // User dashboard endpoints
    dashboard: {
        getUserDashboard: (uid) => ApiClient.request(`/api/userdashboard/?uid=${uid}`)
    }
};

export default ApiClient;
