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

  const getTopContent = useCallback(async (retryCount: number = 0) => {
    if (retryCount === 0) {
      setIsLoading(true);
      setError(null);
    }
  
    try {
      const totalItems = 99;
      const contentType = selectionType === "artists" ? "top-artists" : "top-tracks";
      let cachedData = selectionType === "artists" ? artistsCache : tracksCache;
  
      let content: ContentInstance[] = cachedData.length === totalItems ? cachedData : [];
  
      if (content.length === 0) {
        const response = await axios.get(
          `https://wallify-server.doypid.com/${contentType}`,
          {
            headers: {
              "x-token-key": accessToken,
            },
            params: {
              limit: totalItems,
            },
          }
        );
  
        console.log(`Successfully fetched top ${selectionType}:`, response.data);
        content = response.data;
  
        if (selectionType === "artists") {
          setArtistsCache(content);
        } else if (selectionType === "tracks") {
          setTracksCache(content);
        }
      } else {
        console.log(`Using cached ${selectionType} data`);
      }
  
      if (excludeNullImages) {
        console.log("Excluding null images");
        content = content.filter((item) => {
          const images = selectionType === "artists" ? item.images : item.album?.images;
          return images && images.length > 0 && images[0].url;
        });
      }
  
      const totalGridItems = gridSize.x * gridSize.y;
      if (content.length < totalGridItems) {
        setError(`Only ${content.length} ${selectionType} available due to missing images. Please reduce the grid size.`);
      }
  
      setContent(content.slice(0, totalGridItems));
      setIsLoading(false); // set loading to false when data is successfully fetched
    } catch (error) {
      console.error(`Error fetching top ${selectionType}:`, error);
      if (retryCount < 3) {
        console.log(`Retrying... (Attempt ${retryCount + 1})`);
        setTimeout(() => getTopContent(retryCount + 1), 2000);
      } else {
        setError(`Failed to fetch top ${selectionType}. Please try again later.`);
        setIsLoading(false); // set loading to false if retries are exhausted
      }
    }
  }, [accessToken, selectionType, gridSize, excludeNullImages, artistsCache, tracksCache]);

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

  useEffect(() => {
    if (includeProfilePicture) {
      fetchProfilePicture();
    }
    getTopContent();
  }, [accessToken, selectionType, gridSize, includeProfilePicture, excludeNullImages, getTopContent, fetchProfilePicture]);

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