import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import GridDisplay from "../components/GridDisplay";
import { Alert, AlertDescription, AlertTitle } from '../components/Alert';

interface GridSize {
  x: number;
  y: number;
}

interface TopContentProps {
  accessToken: string;
  selectionType: string;
  gridSize: GridSize;
  includeProfilePicture: boolean;
  excludeNullImages: boolean;
  useGradient: boolean;
  color1: string;
  color2: string;
}

interface ContentInstance {
  images?: { url: string }[];
  album?: { images: { url: string }[] };
  external_urls?: { spotify: string };
  name: string;
}

// utility to debounce functions, helps avoid making too many requests in quick succession
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

const TopContent: React.FC<TopContentProps> = ({
  accessToken,
  selectionType,
  gridSize,
  includeProfilePicture,
  excludeNullImages,
  useGradient,
  color1,
  color2,
}) => {
  const [artistsCache, setArtistsCache] = useState<ContentInstance[]>([]);
  const [tracksCache, setTracksCache] = useState<ContentInstance[]>([]);
  const [content, setContent] = useState<ContentInstance[]>([]);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const getTopContent = useCallback(debounce(async (retryCount: number = 0) => {
    if (retryCount === 0) { // add the loading flag and clear errors if this is the first attempt
      setIsLoading(true);
      setError(null);
    }
  
    try {
      // determine the content type and the cached data source based on the selected type (artists or tracks)
      const contentType = selectionType === "artists" ? "top-artists" : "top-tracks"; // if selectionType is not "artists", it is assumed to be "tracks"
      const cachedData = selectionType === "artists" ? artistsCache : tracksCache;
      let newContent = cachedData.length === 99 ? cachedData : [];
  
      // used cached data if available and complete, otherwise initialize an empty array
      let content: ContentInstance[] = cachedData.length === 99 ? cachedData : [];
  
      // fetch the data only if the cache is empty
      if (content.length === 0) {
        const response = await axios.get(
          `https://wallify-server.doypid.com/${contentType}`,
          {
            headers: {
              "x-token-key": accessToken,
            },
          }
        );
  
        console.log(`Successfully fetched top ${selectionType}:`, response.data);


        // check if response is empty, i.e. new user without any listening history
        if (response.data.length === 0) {
          setError(`No ${selectionType} data available. Try again after listening to more music on Spotify.`);
          setIsLoading(false);
          return;
        }
  
        // cache the result so further requests aren't necessary
        newContent = response.data;
        if (selectionType === "artists") setArtistsCache(newContent);
        else setTracksCache(newContent);
      }
  
      // optionally filter out results with null or missing images
      if (excludeNullImages) {
        console.log("Excluding null images");
        newContent = newContent.filter((item) => {
          const images = selectionType === "artists" ? item.images : item.album?.images;
          return images && images.length > 0 && images[0].url;
        });
      }
  
      // check if the grid size is larger than the available content, warn if there isnt enough
      const totalGridItems = gridSize.x * gridSize.y;
      if (newContent.length < totalGridItems) {
        setError(`Only ${newContent.length} ${selectionType} available due to missing images. Please reduce the grid size.`);
      }
  
      setContent(newContent.slice(0, totalGridItems)); // set the content to be displayed based on the grid size and update state
      setIsLoading(false); // set loading to false when data is successfully fetched
    } catch (error) {
      console.error(`Error fetching top ${selectionType}:`, error);
      if (retryCount < 3) { // retry up to 3 times if the request fails
        console.log(`Retrying... (Attempt ${retryCount + 1})`);
        setTimeout(() => getTopContent(retryCount + 1), 2000);
      } else {
        setError(`Failed to fetch top ${selectionType}. Please try again later.`);
        setIsLoading(false); // set loading to false if retries are exhausted
      }
    }
  }, 500), [accessToken, selectionType, gridSize, excludeNullImages, artistsCache, tracksCache]);

  const fetchProfilePicture = useCallback(async (retryCount: number = 0) => {
    if (profilePictureUrl) {
      console.log("Using cached profile picture");
      return; // return if the profile picture is already cached
    }
  
    try {
      const response = await axios.get("https://wallify-server.doypid.com/profile", {
        headers: {
          "x-token-key": accessToken,
        },
      });
      console.log("Successfully fetched profile picture:", response.data.profilePictureUrl);
      setProfilePictureUrl(response.data.profilePictureUrl); // cache the profile picture URL
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      if (retryCount < 3) {
        console.log(`Retrying profile picture fetch... (Attempt ${retryCount + 1})`);
        setTimeout(() => fetchProfilePicture(retryCount + 1), 2000);
      } else {
        setError("Failed to fetch profile picture. Please try again later.");
      }
    }
  }, [accessToken, profilePictureUrl]);

  // fetch the top content and profile picture when component mounts or dependencies change
  useEffect(() => {
    if (includeProfilePicture) {
      fetchProfilePicture();
    }
  }, [accessToken, includeProfilePicture]);
  
  useEffect(() => {
    getTopContent();
  }, [accessToken, selectionType, getTopContent]);

  return (
    <div className="flex flex-col items-center w-full min-w-0 text-center">
      <h1 className="mb-5 text-3xl font-bold font-sans">
        Your Top {selectionType.charAt(0).toUpperCase() + selectionType.slice(1)}
      </h1>
      {isLoading && <p>Loading...</p>}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!isLoading && !error && content.length > 0 && (
        <GridDisplay
          content={content}
          gridSize={gridSize}
          includeProfilePicture={includeProfilePicture}
          profilePictureUrl={profilePictureUrl}
          useGradient={useGradient}
          color1={color1}
          color2={color2}
        />
      )}
    </div>
  );
};

export default TopContent;