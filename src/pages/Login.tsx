import React, { useState } from 'react';
import '../styles/Login.css';

const Login = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Check if the server is reachable
      const response = await fetch('http://18.215.27.1:8888/health-check', { method: 'GET' });

      if (response.ok) {
        // Server is reachable, proceed with redirect
        window.location.href = 'http://18.215.27.1:8888/login';
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
        
        <button onClick={handleLogin} className="login-button" disabled={loading}>
          {loading ? "Checking server..." : "Log in with Spotify"}
        </button>

        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>
    </>
  );
};

export default Login;