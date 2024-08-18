import React from 'react';

const GridDisplay = ({ artists, gridX, gridY, includeProfilePicture }) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridX}, 1fr)`,
    gridTemplateRows: `repeat(${gridY}, 1fr)`,
    gap: '10px',
  };

  return (
    <div style={gridStyle}>
      {includeProfilePicture && (
        <div className="profile-picture">
          {/* Profile picture display logic */}
        </div>
      )}
      {artists.map((artist, index) => (
        <img key={index} src={artist.images[0].url} alt={artist.name} />
      ))}
    </div>
  );
};

export default GridDisplay;
