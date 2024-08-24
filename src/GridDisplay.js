import React from 'react';
import './GridDisplay.css';

const GridDisplay = ({ content, gridSize, includeProfilePicture, profilePictureUrl, useGradient, color1, color2 }) => {
  // calculate the maximum number of images based on the grid size
  const maxArtists = gridSize.x * gridSize.y;

  // slice the content array to fit the grid size
  const contentToDisplay = content.slice(0, maxArtists);

  const backgroundStyle = useGradient
    ? {
        background: `linear-gradient(to bottom right, ${color1}, ${color2})`,
        gridTemplateColumns: `repeat(${gridSize.x}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize.y}, auto)`,
      }
    : {
        gridTemplateColumns: `repeat(${gridSize.x}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize.y}, auto)`,
      };

  const profilePictureContainerStyle = useGradient
    ? {
        backgroundImage: `linear-gradient(to bottom right, ${color1}, ${color2})`,
      }
    : {};

  const profilePictureStyle = {
    borderRadius: '50%',
  };

  const defaultImageUrl = 'default-not-found-image.png';

  return (
    <div className="grid-wrapper">
      <div className="grid-container" style={backgroundStyle}>
        {contentToDisplay.map((contentInstance, index) => {
          // check if the contentInstance has images and fall back to the default image if necessary
          const imageUrl = contentInstance?.images?.[0]?.url || contentInstance?.album?.images?.[0]?.url || defaultImageUrl;

          return (
            <div key={index} className="grid-item">
              <img src={imageUrl} alt="Grid content" />
            </div>
          );
        })}
        {includeProfilePicture && profilePictureUrl && (
          <div className="profile-picture-overlay" style={profilePictureContainerStyle}>
            <img src={profilePictureUrl} alt="Profile" style={profilePictureStyle} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GridDisplay;
