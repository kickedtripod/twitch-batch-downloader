import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { config } from '../config/env';

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  login: () => void;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('twitch_access_token');
    if (token) {
      setAccessToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  const login = () => {
    // Build the authorization URL with minimal parameters
    const params = new URLSearchParams();
    params.append('client_id', config.TWITCH_CLIENT_ID);
    params.append('redirect_uri', 'http://localhost:3007/auth/callback');
    params.append('response_type', 'token');
    params.append('scope', 'user:read:broadcast channel:read:vods');

    const authUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;

    // Debug logging
    console.log('Client ID:', config.TWITCH_CLIENT_ID);
    console.log('Redirect URI:', 'http://localhost:3007/auth/callback');
    console.log('Full Auth URL:', authUrl);

    window.location.href = authUrl;
  };

  const logout = () => {
    localStorage.removeItem('twitch_access_token');
    setAccessToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 