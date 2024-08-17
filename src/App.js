import React, { useState, useEffect, useRef } from 'react';
import Login from './Login';
import TopArtists from'./TopArtists';
import axios from 'axios';

const App = () => {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [topArtists, setTopArtists] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const tokensFetchedRef = useRef(false);
  
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
        setIsLoggedIn(true);

        tokensFetchedRef.current = true; // Prevent further execution of this block

        console.log('Tokens fetched: ' + JSON.stringify({
          accessToken: paramAccessToken,
          refreshToken: paramRefreshToken,
          expiresIn: paramExpiresIn
        }));

        // Clear the URL parameters to prevent reuse
        window.history.replaceState({}, document.title, "/");
      }
    }
  }, []);

  return (
    <div>
      {!isLoggedIn ? (
        <Login />
      ) : (
        <TopArtists accessToken={accessToken} />
      )}
    </div>
  );
};

export default App;

