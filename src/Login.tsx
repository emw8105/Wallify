import React from 'react';
import './Login.css';

const Login = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:8888/login';
  };

  return (
    <div className="login-container">
      <h1 className="font-bold">Welcome to Wallify</h1>
      <button onClick={handleLogin} className="login-button">
        Log in with Spotify
      </button>
    </div>
  );
};

export default Login;