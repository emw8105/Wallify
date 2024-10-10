import React, { useState } from 'react';
import './Options.css';
import html2canvas from 'html2canvas';

interface GridSize {
  x: number;
  y: number;
}

interface OptionsProps {
  onSubmit: (
    selectionType: string,
    gridSize: GridSize,
    includeProfilePicture: boolean,
    excludeNullImages: boolean,
    useGradient: boolean,
    color1: string,
    color2: string
  ) => void;
}

const Options: React.FC<OptionsProps> = ({ onSubmit }) => {
  const [selectionType, setSelectionType] = useState<string>('artists');
  const [gridSize, setGridSize] = useState<GridSize>({ x: 3, y: 3 });
  const [includeProfilePicture, setIncludeProfilePicture] = useState<boolean>(false);
  const [useGradient, setUseGradient] = useState<boolean>(false);
  const [color1, setColor1] = useState<string>('#ffffff');
  const [color2, setColor2] = useState<string>('#000000');
  const [excludeNullImages, setExcludeNullImages] = useState<boolean>(false);
  const [isGridGenerated, setIsGridGenerated] = useState<boolean>(false);

  const handleDownload = () => {
    const gridElement = document.querySelector('.grid-container') as HTMLElement;
    if (gridElement) {
      html2canvas(gridElement, {
        allowTaint: true,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: null,
        scale: 2,
      }).then((canvas) => {
        const link = document.createElement('a');
        link.download = 'wallify-grid.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      });
    }
  };

   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (gridSize.x <= 0 || gridSize.y <= 0) {
      alert('Please enter valid grid dimensions.');
      return;
    }

    const totalItems = gridSize.x * gridSize.y;
    if (totalItems > 99) {
      alert('The maximum number of artists/tracks you can request is 99. Please adjust your grid size.');
      return;
    }

    setIsGridGenerated(true);
    onSubmit(selectionType, gridSize, includeProfilePicture, excludeNullImages, useGradient, color1, color2);
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
                onChange={(e) => setGridSize({ ...gridSize, x: Number(e.target.value) })}
              />
              <span>x</span>
              <input
                type="number"
                value={gridSize.y}
                onChange={(e) => setGridSize({ ...gridSize, y: Number(e.target.value) })}
              />
            </div>
          </label>
        </div>
        <div className="inline-label">
          <div className="checkbox-container">
            <input
              type="checkbox"
              checked={includeProfilePicture}
              onChange={() => setIncludeProfilePicture(!includeProfilePicture)}
              id="includeProfilePicture"
            />
            <label className="non-clickable" htmlFor="includeProfilePicture">
              Include Profile Picture
            </label>
          </div>
        </div>
        <div className="inline-label">
          <div className="checkbox-container">
            <input
              type="checkbox"
              checked={excludeNullImages}
              onChange={() => setExcludeNullImages(!excludeNullImages)}
              id="excludeNullImages"
            />
            <label className="non-clickable" htmlFor="excludeNullImages">
              Exclude Imageless Content
            </label>
          </div>
        </div>
        <div className="inline-label">
          <div className="checkbox-container">
            <input
              type="checkbox"
              checked={useGradient}
              onChange={() => setUseGradient(!useGradient)}
              id="useGradient"
            />
            <label className="non-clickable" htmlFor="useGradient">
              Use Gradient Background
            </label>
          </div>
        </div>
        {useGradient && (
          <>
            <div className="color-picker-container">
              <span className="color-label">Color 1:</span>
              <input
                type="color"
                value={color1}
                onChange={(e) => setColor1(e.target.value)}
              />
            </div>
            <div className="color-picker-container">
              <span className="color-label">Color 2:</span>
              <input
                type="color"
                value={color2}
                onChange={(e) => setColor2(e.target.value)}
              />
            </div>
          </>
        )}
        <button type="submit" className="generate">Generate</button>
      </form>
      {isGridGenerated && (
        <button onClick={handleDownload} className="download">Download</button>
      )}
    </div>
  );
};

export default Options;
