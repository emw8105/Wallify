import React from 'react';
import './GridDisplay.css';
import GridItem from './GridItem';

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

  // render a grid of GridItem components with the content instances from the response JSON
  return (
    <div className="grid-wrapper">
      <div className="grid-container" style={backgroundStyle}>
        {contentToDisplay.map((contentInstance, index) => (
          <GridItem key={index} contentInstance={contentInstance} defaultImageUrl={defaultImageUrl} />
        ))}
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
