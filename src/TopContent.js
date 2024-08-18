import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GridDisplay from './GridDisplay';

const TopContent = ({ accessToken, selectionType, gridSize, includeProfilePicture }) => {
  const [content, setContent] = useState([]);

  useEffect(() => {
    const fetchTopContent = async () => {
      try {
        // dynamically determine the endpoint based on the selection type
        const content = selectionType === 'artists' ? 'top-artists' : 'top-tracks';
        const response = await axios.get(`http://localhost:8888/${content}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        setContent(response.data);
      } catch (error) {
        console.error(`Error fetching top ${selectionType}:`, error.message);
      }
    };

    fetchTopContent();
  }, [accessToken, selectionType]);

  return (
    <div>
      <h1>Your Top {selectionType.charAt(0).toUpperCase() + selectionType.slice(1)}</h1>
      {content.length > 0 && (
        console.log(content),
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
