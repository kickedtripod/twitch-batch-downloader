import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import config from "../config/config";
import { FC } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  login: () => void;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('twitch_access_token');
    if (token) {
      setAccessToken(token);
      setIsAuthenticated(true);
    }
    console.log('Auth state:', { isAuthenticated, accessToken });
  }, []);

  const login = () => {
    try {
      // Log the config values first
      console.log('Pre-login config:', config);

      // Validate required values
      if (!config.TWITCH_CLIENT_ID) {
        throw new Error('Twitch Client ID is not configured');
      }
      if (!config.TWITCH_REDIRECT_URI) {
        throw new Error('Redirect URI is not configured');
      }

      // Construct the URL directly
      const authUrl = 'https://id.twitch.tv/oauth2/authorize' + 
        `?client_id=${encodeURIComponent(config.TWITCH_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(config.TWITCH_REDIRECT_URI)}` +
        '&response_type=token' +
        `&scope=${encodeURIComponent(config.REQUIRED_SCOPES.join(' '))}` +
        '&force_verify=true';

      console.log('Generated auth URL:', authUrl);

      // Navigate to the auth URL
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during login:', error);
      // You might want to show an error message to the user here
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('twitch_access_token');
    setAccessToken(null);
    setIsAuthenticated(false);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      accessToken, 
      setAccessToken,
      setIsAuthenticated,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 