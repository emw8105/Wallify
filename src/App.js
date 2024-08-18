import React, { useState, useEffect, useRef } from 'react';
import Login from './Login';
import Options from './Options';
import TopContent from'./TopContent';

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
  
  // fetch the tokens from the URL parameters and save them to the state
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

        tokensFetchedRef.current = true; // prevent repeated fetching

        console.log('Tokens fetched: ' + JSON.stringify({
          accessToken: paramAccessToken,
          refreshToken: paramRefreshToken,
          expiresIn: paramExpiresIn
        }));

        // clear the URL parameters after saving the values to prevent reuse
        window.history.replaceState({}, document.title, "/");
      }
    }
  }, []);

  // gather the user's desired generation options and trigger the grid generation
  const handleOptionsSubmit = (type, size, includePic) => {
    setSelectionType(type);
    setGridSize(size);
    setIncludeProfilePicture(includePic);
    setGenerateGrid(true);
  };

  // if the user is not logged in, display the login component, otherwise display the options and the subsequent results after submission
  return (
    <div className={isLoggedIn ? 'app-container' : 'login-container'}>
      {!isLoggedIn ? (
        <Login />
      ) : (
        <>
          <Options onSubmit={handleOptionsSubmit} />
          {generateGrid && (
            <TopContent
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

