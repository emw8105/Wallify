import React, { useState } from 'react';
import './Options.css';

const Options = ({ onSubmit }) => {
  const [selectionType, setSelectionType] = useState('artists');
  const [gridSize, setGridSize] = useState({ x: 3, y: 3 });
  const [includeProfilePicture, setIncludeProfilePicture] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalItems = gridSize.x * gridSize.y;
    if (totalItems > 99) {
        alert('The maximum number of artists/tracks you can request is 99. Please adjust your grid size.');
        return;
    }
    onSubmit(selectionType, gridSize, includeProfilePicture);
  };

  return (
    <div className="options-container">
      <h2>Generate Your Spotify Grid</h2>
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
        <div>
          <label>
            Grid Size:
            <input
              type="number"
              value={gridSize.x}
              onChange={(e) => setGridSize({ ...gridSize, x: e.target.value })}
            />
            x
            <input
              type="number"
              value={gridSize.y}
              onChange={(e) => setGridSize({ ...gridSize, y: e.target.value })}
            />
          </label>
        </div>
        <div>
          <label>
            Include Profile Picture:
            <input
              type="checkbox"
              checked={includeProfilePicture}
              onChange={() => setIncludeProfilePicture(!includeProfilePicture)}
            />
          </label>
        </div>
        <button type="submit">Generate</button>
      </form>
    </div>
  );
};

export default Options;
