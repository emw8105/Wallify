import React from 'react';
import './GridDisplay.css';

const GridDisplay = ({ content, gridSize, includeProfilePicture, profilePictureUrl }) => {
  // calculate the maximum number of images based on the grid size
  const maxArtists = gridSize.x * gridSize.y;

  // slice the artists array to fit the grid size
  // NEED TO: handle the case where there are fewer artists than the grid size
  const contentToDisplay = content.slice(0, maxArtists);

  return (
    <div
      className="grid-container"
      style={{
        gridTemplateColumns: `repeat(${gridSize.x}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize.y}, auto)`,
      }}
    >
      {contentToDisplay.map((contentInstance, index) => {
        // image url is stored in different json fields depending on the type of content
        // for artists, the image url is in the 'images' field, while for tracks, we pull the album image so we go to the 'album.images' field
        
        // determine if the artist is an artist or a track based on the response structure
        const imageUrl = contentInstance.images
          ? contentInstance.images[0].url // artist case
          : contentInstance.album.images[0].url; // track case

        return (
          <div
            key={index}
            className="grid-item"
            style={{
              backgroundImage: `url(${imageUrl})`,
            }}
          />
        );
      })}
      {includeProfilePicture && profilePictureUrl && (
        <div className="profile-picture-overlay">
          <img src={profilePictureUrl} alt="Profile" className="profile-picture" />
        </div>
      )}
    </div>
  );
};

export default GridDisplay;
