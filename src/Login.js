import React from 'react';

const Login = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:8888/login';
  };

  return (
    <div><h1>Welcome to SpotiWall</h1><button onClick={handleLogin}>Log in with Spotify</button></div>
  );
};

export default Login;
