/// <reference types="vite/client" />

// Debug: Log all environment variables
console.log('All env vars:', import.meta.env);

// Validate environment variables
const TWITCH_CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID;
if (!TWITCH_CLIENT_ID) {
  throw new Error('VITE_TWITCH_CLIENT_ID is not set in environment variables');
}

export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  TWITCH_CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID!,
  TWITCH_REDIRECT_URI: import.meta.env.VITE_TWITCH_REDIRECT_URI!,
  REQUIRED_SCOPES: ['user:read:follows', 'user:read:subscriptions']
} as const;

// Debug: Log final config
console.log('Final config:', config); 