import React, { useState } from 'react';
import axios from 'axios';
import GridDisplay from './GridDisplay';

const TopArtists = ({ accessToken }) => {
  const [artists, setArtists] = useState([]);

  const getTopArtists = async () => {
    try {
      const response = await axios.get('http://localhost:8888/top-artists', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.log('Error fetching top artists: ' + error.message);
      return [];
    }
  };

  const handleGenerateArtists = async () => {
    const fetchedArtists = await getTopArtists();
    setArtists(fetchedArtists);
  };

  return (
    <div>
      <h1>Your Top Artists</h1>
      <button onClick={handleGenerateArtists}>Generate Top Artists</button>
      {artists.length > 0 && (
        <>
          <GridDisplay artists={artists} />
        </>
      )}
    </div>
  );
};

export default TopArtists;
