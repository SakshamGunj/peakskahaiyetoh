/**
 * Test file for checking API connectivity to localhost:8000
 */

// DOM elements for displaying results
document.addEventListener('DOMContentLoaded', () => {
  // Create UI elements for the test
  const testContainer = document.createElement('div');
  testContainer.style.padding = '20px';
  testContainer.style.margin = '20px';
  testContainer.style.backgroundColor = '#f5f5f5';
  testContainer.style.border = '1px solid #ddd';
  testContainer.style.borderRadius = '5px';

  const heading = document.createElement('h2');
  heading.textContent = 'API Connectivity Test';
  
  const statusElement = document.createElement('div');
  statusElement.id = 'api-status';
  statusElement.textContent = 'Testing connection to localhost:8000...';
  statusElement.style.margin = '10px 0';
  statusElement.style.padding = '10px';
  statusElement.style.backgroundColor = '#fffde7';
  
  const resultElement = document.createElement('pre');
  resultElement.id = 'api-result';
  resultElement.style.maxHeight = '300px';
  resultElement.style.overflow = 'auto';
  resultElement.style.padding = '10px';
  resultElement.style.backgroundColor = '#f8f9fa';
  resultElement.style.border = '1px solid #e9ecef';
  resultElement.style.borderRadius = '4px';
  
  const testButton = document.createElement('button');
  testButton.textContent = 'Test API Connection';
  testButton.style.padding = '8px 16px';
  testButton.style.margin = '10px 0';
  testButton.style.backgroundColor = '#4CAF50';
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.borderRadius = '4px';
  testButton.style.cursor = 'pointer';
  
  // Append elements
  testContainer.appendChild(heading);
  testContainer.appendChild(statusElement);
  testContainer.appendChild(testButton);
  testContainer.appendChild(resultElement);
  document.body.appendChild(testContainer);
  
  // Add event listener for test button
  testButton.addEventListener('click', testApiConnection);
  
  // Run test automatically on page load
  testApiConnection();
});

// Function to test API connection
async function testApiConnection() {
  const statusElement = document.getElementById('api-status');
  const resultElement = document.getElementById('api-result');
  
  statusElement.textContent = 'Testing connection to localhost:8000...';
  statusElement.style.backgroundColor = '#fffde7';
  resultElement.textContent = '';
  
  console.log('------ TESTING API CONNECTION TO LOCALHOST:8000 ------');
  
  try {
    // Make fetch request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    console.log('Sending request to http://localhost:8000/...');
    
    const response = await fetch('http://localhost:8000/', {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()])
    });
    
    // Get response data
    const data = await response.text();
    console.log('Response data (first 500 chars):', data.substring(0, 500));
    
    // Display success
    statusElement.textContent = `Connected successfully! Status: ${response.status} ${response.statusText}`;
    statusElement.style.backgroundColor = '#e8f5e9';
    resultElement.textContent = data.substring(0, 2000) + 
      (data.length > 2000 ? '\n\n[Content truncated, total length: ' + data.length + ' chars]' : '');
    
    // Try fetching API endpoint
    testApiEndpoint();
    
  } catch (error) {
    // Display error
    console.error('Connection error:', error);
    console.log('Connection failed. Is the API server running on port 8000?');
    
    statusElement.textContent = `Connection failed: ${error.message}`;
    statusElement.style.backgroundColor = '#ffebee';
    resultElement.textContent = `Error details:\n${error.stack}`;
  }
}

// Test a specific API endpoint
async function testApiEndpoint() {
  console.log('------ TESTING API ENDPOINT /api/auth/signup ------');
  
  try {
    const testData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    
    console.log('Sending POST request with data:', testData);
    
    const response = await fetch('http://localhost:8000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()])
    });
    
    const data = await response.json().catch(e => {
      console.error('Error parsing response as JSON:', e);
      return { error: 'Invalid JSON response' };
    });
    
    console.log('Response data:', data);
    
    const endpointElement = document.createElement('div');
    endpointElement.style.margin = '10px 0';
    endpointElement.style.padding = '10px';
    
    if (response.ok) {
      console.log('API request successful!');
      endpointElement.textContent = 'API endpoint test successful!';
      endpointElement.style.backgroundColor = '#e8f5e9';
    } else {
      console.log('API request failed with status:', response.status);
      endpointElement.textContent = `API endpoint test failed: ${response.status} ${response.statusText}`;
      endpointElement.style.backgroundColor = '#ffebee';
    }
    
    document.getElementById('api-status').after(endpointElement);
    
    // Display the response
    const responseElement = document.createElement('pre');
    responseElement.style.maxHeight = '200px';
    responseElement.style.overflow = 'auto';
    responseElement.style.padding = '10px';
    responseElement.style.backgroundColor = '#f8f9fa';
    responseElement.style.border = '1px solid #e9ecef';
    responseElement.textContent = JSON.stringify(data, null, 2);
    
    endpointElement.after(responseElement);
    
  } catch (error) {
    console.error('API endpoint error:', error);
    
    const endpointElement = document.createElement('div');
    endpointElement.textContent = `API endpoint test error: ${error.message}`;
    endpointElement.style.margin = '10px 0';
    endpointElement.style.padding = '10px';
    endpointElement.style.backgroundColor = '#ffebee';
    document.getElementById('api-status').after(endpointElement);
  }
}
