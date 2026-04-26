import React, { useState } from 'react';
import '../styles/Login.css';
import { apiUrl } from '../config/api';

interface LoginProps {
  loginError?: string | null;
}

const Login: React.FC<LoginProps> = ({ loginError }) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Check if the server is reachable
      const response = await fetch(apiUrl('/health-check'), { method: 'GET' });

      if (response.ok) {
        // Server is reachable, proceed with redirect
        const clientOrigin = encodeURIComponent(window.location.origin);
        window.location.href = apiUrl(`/login?client_origin=${clientOrigin}`);
      } else {
        throw new Error('Server response not OK');
      }
    } catch (error) {
      // Server is unreachable or an error occurred
      setErrorMessage('The server is currently down. Please try again later.');
      console.error('Server check failed:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <div className="powered-by-spotify">
        <span>Powered by</span>
        <img src="/Full_Logo_Green_CMYK.svg" alt="Spotify Logo" />
      </div>

      <div className="login-container">
        <h1 className="font-bold">Welcome to Wallify</h1>

        {loginError && (
          <div className="dev-mode-notice">
            <p>
              Wallify is in <strong>Spotify development mode</strong> and currently
              limited to approved accounts. A quota extension has been submitted &mdash;
              full access will be available once approved.
            </p>
          </div>
        )}

        <button onClick={handleLogin} className="login-button" disabled={loading}>
          {loading ? "Checking server..." : "Log in with Spotify"}
        </button>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <p className="privacy-notice">
          By logging in, you agree to our{' '}
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </>
  );
};

export default Login;