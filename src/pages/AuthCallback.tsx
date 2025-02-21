import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Debug: Log full URL
      console.log('Full URL:', window.location.href);
      
      // Get the hash fragment from the URL
      const hash = window.location.hash;
      console.log('Hash:', hash);

      if (!hash) {
        console.error('No hash fragment found in URL');
        navigate('/');
        return;
      }

      // Parse the hash (remove the leading #)
      const params = new URLSearchParams(hash.substring(1));
      
      // Debug: Log all params
      console.log('All params:', Object.fromEntries(params.entries()));

      const accessToken = params.get('access_token');
      const scope = params.get('scope');
      
      console.log('Access Token:', accessToken ? 'Found' : 'Not found');
      console.log('Scope:', scope);

      if (accessToken) {
        localStorage.setItem('twitch_access_token', accessToken);
        console.log('Token saved to localStorage');
        navigate('/', { replace: true });
      } else {
        console.error('No access token found in URL params');
        navigate('/');
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Completing authentication...</p>
    </div>
  );
} 