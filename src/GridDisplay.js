import React from 'react';
import './GridDisplay.css';

const GridDisplay = ({ artists }) => {
  return (
    <div className="grid-container">
      <h2>Your Spotify Grid</h2>
      <div className="grid">
        {artists.map((artist, index) => (
          <div key={index} className="grid-item">
            <img src={artist.images[0]?.url} alt={artist.name} />
            <p>{artist.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridDisplay;
