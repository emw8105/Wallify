import React from 'react';
import './GridItem.css';

interface ContentInstance {
  images?: { url: string }[];
  album?: { images: { url: string }[] };
  external_urls?: { spotify: string };
  name: string;
}

interface GridItemProps {
  contentInstance: ContentInstance;
  defaultImageUrl: string;
}

const GridItem: React.FC<GridItemProps> = ({ contentInstance, defaultImageUrl }) => {
  // check if the contentInstance has images and fall back to the default image if necessary
  // artists have a direct image property, tracks don't so use the album art instead, need to drill into the album property to access the images
  const imageUrl = contentInstance?.images?.[0]?.url || contentInstance?.album?.images?.[0]?.url || defaultImageUrl;

  // get the external URL for the artist or track, property location is the same in both response formats
  const contentUrl = contentInstance?.external_urls?.spotify;

  return (
    <div
      className="grid-item"
      onClick={() => window.open(contentUrl, '_blank')} // when clicking on the grid item, open the Spotify URL for that artist/track in a new tab
      style={{ cursor: 'pointer' }}
    >
      <img src={imageUrl} alt="Grid content" />
      <div className="grid-item-overlay">
        <span className="grid-item-name">{contentInstance.name}</span>
      </div>
    </div>
  );
};

export default GridItem;
