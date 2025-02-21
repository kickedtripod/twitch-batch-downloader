import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    console.log('Auth callback hash:', hash); // Debug log

    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        console.log('Got access token:', accessToken); // Debug log
        localStorage.setItem('twitch_access_token', accessToken);
        navigate('/', { replace: true });
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Completing authentication...</p>
    </div>
  );
}

export default AuthCallback; 