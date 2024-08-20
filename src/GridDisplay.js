import React from 'react';
import './GridDisplay.css';

const GridDisplay = ({ content, gridSize, includeProfilePicture, profilePictureUrl, useGradient, color1, color2 }) => {
  // calculate the maximum number of images based on the grid size
  const maxArtists = gridSize.x * gridSize.y;

  // slice the artists array to fit the grid size
  // NEED TO: handle the case where there are fewer artists than the grid size
  const contentToDisplay = content.slice(0, maxArtists);

  const backgroundStyle = useGradient
    ? { background: `linear-gradient(to bottom right, ${color1}, ${color2})`,
        gridTemplateColumns: `repeat(${gridSize.x}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize.y}, auto)`, }
    : {gridTemplateColumns: `repeat(${gridSize.x}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize.y}, auto)`,};
        
        const profilePictureContainerStyle = useGradient
        ? {
            backgroundImage: `linear-gradient(to bottom right, ${color1}, ${color2})`,
          }
        : {};
      
      const profilePictureStyle = {
        borderRadius: '50%',
      };
      
      return (
        <div className="grid-container" style={backgroundStyle}>
          {contentToDisplay.map((contentInstance, index) => {
            const imageUrl = contentInstance.images
              ? contentInstance.images[0].url
              : contentInstance.album.images[0].url;
      
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
      );
};

export default GridDisplay;
