import React, { useState, useEffect, useRef } from 'react';
import Login from './Login';
import Options from './Options';
import TopArtists from'./TopArtists';
import axios from 'axios';

const App = () => {
  // login and tokens
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const tokensFetchedRef = useRef(false);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);

  // options and results
  const [selectionType, setSelectionType] = useState('artists');
  const [gridSize, setGridSize] = useState({ x: 3, y: 3 });
  const [includeProfilePicture, setIncludeProfilePicture] = useState(false);
  const [generateGrid, setGenerateGrid] = useState(false);
  const [artists, setArtists] = useState([]);

  
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

  const handleOptionsSubmit = (type, size, includePic) => {
    setSelectionType(type);
    setGridSize(size);
    setIncludeProfilePicture(includePic);
    setGenerateGrid(true); // Trigger grid generation
  };

  return (
    <div className={isLoggedIn ? 'app-container' : 'login-container'}>
      {!isLoggedIn ? (
        <Login />
      ) : (
        <>
          <Options onSubmit={handleOptionsSubmit} />
          {generateGrid && (
            <TopArtists
              accessToken={accessToken}
              selectionType={selectionType}
              gridSize={gridSize}
              includeProfilePicture={includeProfilePicture}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;

