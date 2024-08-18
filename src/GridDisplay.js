import React from 'react';
import './GridDisplay.css';

const GridDisplay = ({ artists, gridSize, includeProfilePicture }) => {
  // Calculate the maximum number of images based on the grid size
  const maxArtists = gridSize.x * gridSize.y;

  // Slice the artists array to fit the grid size
  const artistsToDisplay = artists.slice(0, maxArtists);

  // Log to ensure artistsToDisplay is correctly populated
  console.log('Artists to Display:', artistsToDisplay);

  // Calculate the width and height for each image dynamically (keeping them square)
  const imageSize = `${100 / gridSize.x}%`;

  return (
    <div className="grid-container" style={{
        gridTemplateColumns: `repeat(${gridSize.x}, 1fr)`, 
        gridTemplateRows: `repeat(${gridSize.y}, auto)`,
        overflowY: 'auto',
        maxHeight: '100vh'}}>
      {artistsToDisplay.map((artist, index) => (
        <div
          key={index}
          className="grid-item"
          style={{
            width: 100,
            height: 100,
            backgroundImage: `url(${artist.images[0].url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
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
