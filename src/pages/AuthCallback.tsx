import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setAccessToken, setIsAuthenticated } = useAuth();

  useEffect(() => {
    // Get the access token from the URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
      localStorage.setItem('twitch_access_token', accessToken);
      setAccessToken(accessToken);
      setIsAuthenticated(true);
      navigate('/');
    } else {
      console.error('No access token found in URL');
      navigate('/');
    }
  }, [navigate, setAccessToken, setIsAuthenticated]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Completing authentication...</p>
    </div>
  );
};

export default AuthCallback; 