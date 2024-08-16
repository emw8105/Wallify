import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const App = () => {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [topArtists, setTopArtists] = useState([]);
  const tokensFetchedRef = useRef(false);

  // Function to log messages to localStorage
  // const logMessage = (message) => {
  //   const logs = JSON.parse(localStorage.getItem('logs')) || [];
  //   logs.push({ timestamp: new Date().toISOString(), message });
  //   localStorage.setItem('logs', JSON.stringify(logs));
  // };
  
  // Fetch tokens from the backend
  useEffect(() => {
    if (!tokensFetchedRef.current) {
      const params = new URLSearchParams(window.location.search);
      const paramAccessToken = params.get('access_token');
      const paramRefreshToken = params.get('refresh_token');
      const paramExpiresIn = params.get('expires_in');

      if (paramAccessToken && paramRefreshToken && paramExpiresIn) {
        setAccessToken(paramAccessToken);
        setRefreshToken(paramRefreshToken);
        setExpiresIn(paramExpiresIn);

        tokensFetchedRef.current = true; // Prevent further execution of this block

        console.log('Tokens fetched: ' + JSON.stringify({
          accessToken: paramAccessToken,
          refreshToken: paramRefreshToken,
          expiresIn: paramExpiresIn
        }));

        // Clear the URL parameters to prevent reuse
        window.history.replaceState({}, document.title, "/");
      } else {
        console.log('Redirecting to login');
        window.location.href = 'http://localhost:8888/login';
      }
    }
  }, []);

  // Fetch top artists using the access token
  useEffect(() => {
    const getTopArtists = async () => {
      try {
        const response = await axios.get('http://localhost:8888/top-artists', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        setTopArtists(response.data);
        console.log('Top artists fetched: ' + JSON.stringify(response.data));
      } catch (error) {
        console.log('Error fetching top artists: ' + error.message);
      }
    };

    if (accessToken) {
      getTopArtists();
    }
  }, [accessToken]);

  return (
    <div>
      <h1>Your Top Artists</h1>
      <ul>
        {topArtists.map((artist, index) => (
          <li key={index}>{artist.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default App;

