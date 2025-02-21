/// <reference types="vite/client" />

// Debug: Log all environment variables
console.log('All env vars:', import.meta.env);

// Validate environment variables
const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID;
if (!TWITCH_CLIENT_ID) {
  throw new Error('VITE_TWITCH_CLIENT_ID is not set in environment variables');
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set in environment variables');
}

const REDIRECT_URI = import.meta.env.VITE_TWITCH_REDIRECT_URI;
if (!REDIRECT_URI) {
  throw new Error('VITE_TWITCH_REDIRECT_URI is not set in environment variables');
}

// Log each value individually
console.log('TWITCH_CLIENT_ID:', TWITCH_CLIENT_ID);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('REDIRECT_URI:', REDIRECT_URI);

console.log('API URL:', import.meta.env.VITE_API_BASE_URL);

export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  TWITCH_CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID!,
  TWITCH_REDIRECT_URI: import.meta.env.VITE_TWITCH_REDIRECT_URI!,
  REQUIRED_SCOPES: ['user:read:follows', 'user:read:subscriptions']
} as const;

// Debug: Log final config
console.log('Final config:', config); 