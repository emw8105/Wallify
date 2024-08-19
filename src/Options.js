import React, { useState } from 'react';
import './Options.css';
import html2canvas from 'html2canvas';

const Options = ({ onSubmit }) => {
  const [selectionType, setSelectionType] = useState('artists');
  const [gridSize, setGridSize] = useState({ x: 3, y: 3 });
  const [includeProfilePicture, setIncludeProfilePicture] = useState(false);
  const [useGradient, setUseGradient] = useState(false);
  const [color1, setColor1] = useState('#ffffff');
  const [color2, setColor2] = useState('#000000');
  const [isGridGenerated, setIsGridGenerated] = useState(false);

  const handleDownload = () => {
    const gridElement = document.querySelector('.grid-container');
  html2canvas(gridElement, {
    allowTaint: true, // Allow cross-origin images
    useCORS: true, // Enable cross-origin resource sharing
    scrollX: 0, // Prevent capturing the scroll position
    scrollY: 0, // Prevent capturing the scroll position
    backgroundColor: null, // Avoid adding a default background color
  }).then((canvas) => {
    const link = document.createElement('a');
    link.download = 'spotiwall-grid.png';
    link.href = canvas.toDataURL();
    link.click();
  });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalItems = gridSize.x * gridSize.y;
    if (totalItems > 99) {
        alert('The maximum number of artists/tracks you can request is 99. Please adjust your grid size.');
        return;
    }
    setIsGridGenerated(true);
    onSubmit(selectionType, gridSize, includeProfilePicture, useGradient, color1, color2);
  };

  return (
    <div className="options-container">
      <h2>Design Your Grid</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Select Type:
            <select value={selectionType} onChange={(e) => setSelectionType(e.target.value)}>
              <option value="artists">Top Artists</option>
              <option value="tracks">Top Tracks</option>
            </select>
          </label>
        </div>
        <div className="inline-label">
          <label>
            Grid Size:
            <div className="grid-size-container">
              <input
                type="number"
                value={gridSize.x}
                onChange={(e) => setGridSize({ ...gridSize, x: e.target.value })}
              />
              <span>x</span>
              <input
                type="number"
                value={gridSize.y}
                onChange={(e) => setGridSize({ ...gridSize, y: e.target.value })}
              />
            </div>
          </label>
        </div>
        <div className="inline-label">
          <label>
            <input
              type="checkbox"
              checked={includeProfilePicture}
              onChange={() => setIncludeProfilePicture(!includeProfilePicture)}
            />
            Include Profile Picture
          </label>
        </div>
        <div className="inline-label">
          <label>
            <input
              type="checkbox"
              checked={useGradient}
              onChange={() => setUseGradient(!useGradient)}
            />
            Use Gradient Background
          </label>
        </div>
        {useGradient && (
          <>
            <label>
              Color 1:
              <input
                type="color"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
              />
            </label>
            <label>
              Color 2:
              <input
                type="color"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
              />
            </label>
          </>
        )}
        <button type="submit">Generate</button>
      </form>
      {isGridGenerated && (
        <button onClick={handleDownload}>Download</button>
      )}
    </div>
  );
};

export default Options;
