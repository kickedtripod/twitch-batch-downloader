interface ClientConfig {
  API_BASE_URL: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_REDIRECT_URI: string;
  REQUIRED_SCOPES: string[];
}

const config: ClientConfig = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  TWITCH_CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID,
  TWITCH_REDIRECT_URI: import.meta.env.VITE_TWITCH_REDIRECT_URI,
  REQUIRED_SCOPES: [
    'viewing_activity_read'  // This is the correct scope for reading videos
  ]
};

// Add this debug log
console.log('Config loaded:', config);

export default config; 