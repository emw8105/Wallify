import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GridDisplay from './GridDisplay';

const TopContent = ({ accessToken, selectionType, gridSize, includeProfilePicture }) => {
  const [content, setContent] = useState([]);

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

    fetchTopContent();
  }, [accessToken, selectionType, gridSize]);

  return (
    <div>
      <h1>Your Top {selectionType.charAt(0).toUpperCase() + selectionType.slice(1)}</h1>
      {content.length > 0 && (
        <GridDisplay
          content={content}
          gridSize={gridSize}
          includeProfilePicture={includeProfilePicture}
        />
      )}
    </div>
  );
};

export default TopContent;
