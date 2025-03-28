import { Platform } from 'react-native';

let baseURL = '';

// Set the API base URL based on platform
if (Platform.OS === 'android') {
    baseURL = 'http://192.168.100.177:5000/api/v1/';
} else {
  // For iOS and other platforms
  baseURL = 'http://192.168.1.5:4000/api/v1/';
}

// Log the configured baseURL for debugging
console.log('API BaseURL:', baseURL);

export default baseURL;