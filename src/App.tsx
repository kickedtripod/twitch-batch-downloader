import { FC } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VideoProvider } from './contexts/VideoContext';
import HomePage from './pages/HomePage';
import AuthCallback from './pages/AuthCallback';

const App: FC = () => {
  return (
    <AuthProvider>
      <VideoProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </Router>
      </VideoProvider>
    </AuthProvider>
  );
}

export default App; 