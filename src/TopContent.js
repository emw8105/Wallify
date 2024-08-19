import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GridDisplay from './GridDisplay';

const TopContent = ({ accessToken, selectionType, gridSize, includeProfilePicture }) => {
  const [content, setContent] = useState([]);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);

  useEffect(() => {
    const fetchTopContent = async () => {
      try {
        // dynamically determine the endpoint based on the selection type
        const contentType = selectionType === 'artists' ? 'top-artists' : 'top-tracks';
        const totalItems = gridSize.x * gridSize.y; // calculate total number of items
        const response = await axios.get(`http://localhost:8888/${contentType}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: totalItems, // pass the requested number of items to the backend
          },
        });

        console.log(`Successfully fetched top ${selectionType}:`, response.data);
        setContent(response.data);
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

    // only get the profile picture if the user chooses to include it
    if (includeProfilePicture) {
      fetchProfilePicture();
    }

    fetchTopContent();
  }, [accessToken, selectionType, gridSize, includeProfilePicture]);

  return (
    <div>
      <h1>Your Top {selectionType.charAt(0).toUpperCase() + selectionType.slice(1)}</h1>
      {content.length > 0 && (
        <GridDisplay
          content={content}
          gridSize={gridSize}
          includeProfilePicture={includeProfilePicture}
          profilePictureUrl={profilePictureUrl}
        />
      )}
    </div>
  );
};

export default TopContent;
