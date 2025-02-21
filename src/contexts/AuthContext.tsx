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
    const params = new URLSearchParams();
    params.append('client_id', config.TWITCH_CLIENT_ID);
    params.append('redirect_uri', config.TWITCH_REDIRECT_URI);
    params.append('response_type', 'token');
    params.append('scope', config.REQUIRED_SCOPES.join(' '));

    const authUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    
    console.log('Auth configuration:', {
      clientId: config.TWITCH_CLIENT_ID,
      redirectUri: config.TWITCH_REDIRECT_URI,
      scopes: config.REQUIRED_SCOPES,
      fullUrl: authUrl
    });

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