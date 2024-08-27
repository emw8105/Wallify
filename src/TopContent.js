import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GridDisplay from './GridDisplay';

const TopContent = ({ accessToken, selectionType, gridSize, includeProfilePicture, useGradient, color1, color2 }) => {
  const [artistsCache, setArtistsCache] = useState([]);
  const [tracksCache, setTracksCache] = useState([]);
  const [content, setContent] = useState([]);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);

  useEffect(() => {
    const fetchTopContent = async () => {
      try {
        // check if there is existing cached data for the selected type
        if (selectionType === 'artists' && artistsCache.length === 99) {
          console.log('Using cached artists data');
          setContent(artistsCache.slice(0, gridSize.x * gridSize.y)); // slice just the necessary amount
        } else if (selectionType === 'tracks' && tracksCache.length === 99) {
          console.log('Using cached tracks data');
          setContent(tracksCache.slice(0, gridSize.x * gridSize.y)); // slice just the necessary amount
        } else {
          // fetch data if not already cached
          const contentType = selectionType === 'artists' ? 'top-artists' : 'top-tracks';
          const totalItems = 99; // request the maximum number of items to cache for future use
          const response = await axios.get(`http://localhost:8888/${contentType}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              limit: totalItems,
            },
          });

          console.log(`Successfully fetched top ${selectionType}:`, response.data);

          // cache the response content for future use to avoid subsequent API calls
          if (selectionType === 'artists') {
            setArtistsCache(response.data);
            setContent(response.data.slice(0, gridSize.x * gridSize.y)); // slice just the necessary amount
          } else if (selectionType === 'tracks') {
            setTracksCache(response.data);
            setContent(response.data.slice(0, gridSize.x * gridSize.y)); // slice just the necessary amount
          }
        }
      } catch (error) {
        console.error(`Error fetching top ${selectionType}:`, error.message);
      }
    };

    const fetchProfilePicture = async () => {
      try {
        const response = await axios.get('http://localhost:8888/profile', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        setProfilePictureUrl(response.data.profilePictureUrl);
      } catch (error) {
        console.error('Error fetching profile picture:', error.message);
      }
    };

    // Only get the profile picture if the user chooses to include it
    if (includeProfilePicture) {
      fetchProfilePicture();
    }

    fetchTopContent();
  }, [accessToken, selectionType, gridSize, includeProfilePicture, artistsCache, tracksCache]);

  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minWidth: 0 }}>
      <h1 style={{ marginBottom: '20px' }}>Your Top {selectionType.charAt(0).toUpperCase() + selectionType.slice(1)}</h1>
      {content.length > 0 && (
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
