import React from 'react';
import './GridDisplay.css';

const GridDisplay = ({ artists, gridSize, includeProfilePicture }) => {
  // calculate the maximum number of images based on the grid size
  const maxArtists = gridSize.x * gridSize.y;

  // slice the artists array to fit the grid size 
  // NEED TO: handle the case where there are fewer artists than the grid size
  const artistsToDisplay = artists.slice(0, maxArtists);

  return (
    <div className="grid-container" 
        style={{
            gridTemplateColumns: `repeat(${gridSize.x}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize.y}, auto)`,
        }}
      >
      {artistsToDisplay.map((artist, index) => (
        <div
            key={index}
            className="grid-item"
            style={{
                backgroundImage: `url(${artist.images[0].url})`,
              }}
        />
      ))}
      {includeProfilePicture && (
        <div
          className="grid-item profile-picture"
          style={{
            width: 100,
            height: 100,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <img src="YOUR_PROFILE_PICTURE_URL_HERE" alt="Profile" />
        </div>
      )}
    </div>
  );
};

export default GridDisplay;
