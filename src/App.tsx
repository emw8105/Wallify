import React, { useState, useEffect, useRef } from "react";
import Login from "./pages/Login";
import Options from "./components/Options";
import TopContent from "./pages/TopContent";
import { apiUrl } from "./config/api";
import "./styles/App.css";

interface GridSize {
  x: number;
  y: number;
}

const TOKEN_COOKIE_NAME = "wallify_token_key";
const TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const getCookieValue = (name: string): string | null => {
  const cookiePrefix = `${name}=`;
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(cookiePrefix)) {
      return decodeURIComponent(trimmed.substring(cookiePrefix.length));
    }
  }

  return null;
};

const setCookieValue = (name: string, value: string, maxAgeSeconds: number) => {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
};

const clearCookieValue = (name: string) => {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
};

const App: React.FC = () => {
  // login and tokens
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const tokensFetchedRef = useRef(false);
  const [accessToken, setAccessToken] = useState("");

  // options and results
  const [selectionType, setSelectionType] = useState("artists");
  const [gridSize, setGridSize] = useState<GridSize>({ x: 3, y: 3 });
  const [includeProfilePicture, setIncludeProfilePicture] = useState(false);
  const [generateGrid, setGenerateGrid] = useState(false);
  const [excludeNullImages, setExcludeNullImages] = useState(false);
  const [useGradient, setUseGradient] = useState(false);
  const [color1, setColor1] = useState("#ffffff");
  const [color2, setColor2] = useState("#000000");

  // fetch the tokens from the URL parameters and save them to the state
  useEffect(() => {
    if (!tokensFetchedRef.current) {
      const params = new URLSearchParams(window.location.search);
      const paramAccessToken = params.get("token_key");
      const cookieAccessToken = getCookieValue(TOKEN_COOKIE_NAME);
      const resolvedToken = paramAccessToken || cookieAccessToken;

      if (resolvedToken) {
        setAccessToken(resolvedToken);
        setIsLoggedIn(true);

        setCookieValue(TOKEN_COOKIE_NAME, resolvedToken, TOKEN_COOKIE_MAX_AGE_SECONDS);

        tokensFetchedRef.current = true; // prevent repeated fetching

        console.log(
          "Tokens fetched: " +
          JSON.stringify({
            accessToken: resolvedToken,
          })
        );

        // clear the URL parameters after saving the values to prevent reuse
        window.history.replaceState({}, document.title, "/");
      }
    }
  }, []);

  const handleLogout = async () => {
    const tokenToInvalidate = accessToken;

    clearCookieValue(TOKEN_COOKIE_NAME);
    setAccessToken("");
    setIsLoggedIn(false);
    setGenerateGrid(false);

    if (!tokenToInvalidate) {
      return;
    }

    try {
      await fetch(apiUrl("/logout"), {
        method: "POST",
        headers: {
          "x-token-key": tokenToInvalidate,
        },
      });
    } catch (error) {
      console.error("Failed to invalidate server session:", error);
    }
  };

  // gather the user's desired generation options and trigger the grid generation
  const handleOptionsSubmit = (
    type: string,
    size: GridSize,
    includePic: boolean,
    excludeNullImages: boolean,
    useGradient: boolean,
    color1: string,
    color2: string
  ) => {
    setSelectionType(type);
    setGridSize(size);
    setIncludeProfilePicture(includePic);
    setExcludeNullImages(excludeNullImages);
    setUseGradient(useGradient);
    setColor1(color1);
    setColor2(color2);
    setGenerateGrid(true);
  };

  // if the user is not logged in, display the login component, otherwise display the options and the subsequent results after submission
  return (
    <div className={isLoggedIn ? "app-container" : "login-container"}>
      {!isLoggedIn ? (
        <Login />
      ) : (
        <>
          <div className="connected-spotify-tag" aria-label="Spotify session controls">
            <span className="connected-label">Connected via</span>
            <img src="/Full_Logo_Green_CMYK.svg" alt="Spotify" className="connected-spotify-logo" />
            <button className="disconnect-button" onClick={handleLogout}>
              Disconnect
            </button>
          </div>
          <Options onSubmit={handleOptionsSubmit} />
          {console.log(
            "gridSize",
            gridSize,
            "includeProfilePicture",
            includeProfilePicture,
            "excludeNullImages",
            excludeNullImages,
            "useGradient",
            useGradient,
            "color1",
            color1,
            "color2",
            color2
          )}
          {generateGrid && (
            <TopContent
              accessToken={accessToken}
              selectionType={selectionType}
              gridSize={gridSize}
              includeProfilePicture={includeProfilePicture}
              excludeNullImages={excludeNullImages}
              useGradient={useGradient}
              color1={color1}
              color2={color2}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
