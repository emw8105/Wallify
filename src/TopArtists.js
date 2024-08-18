import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GridDisplay from './GridDisplay';

const TopArtists = ({ accessToken, selectionType, gridSize, includeProfilePicture }) => {
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    const fetchTopArtists = async () => {
      try {
        const response = await axios.get('http://localhost:8888/top-artists', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            type: selectionType,
          },
        });
        setArtists(response.data);
      } catch (error) {
        console.error('Error fetching top artists:', error.message);
      }
    };

    fetchTopArtists();
  }, [accessToken, selectionType]);

  return (
    <div>
      <h1>Your Top Artists</h1>
      {artists.length > 0 && (
        <GridDisplay
          artists={artists}
          gridX={gridSize.x}
          gridY={gridSize.y}
          includeProfilePicture={includeProfilePicture}
        />
      )}
    </div>
  );
};

export default TopArtists;
