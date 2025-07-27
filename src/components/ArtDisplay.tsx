import { h } from 'preact';
import { ArtAsset } from '../types';

interface ArtDisplayProps {
  asset: ArtAsset | null;
  imageUrl: string | null;
  onRotate: () => void;
  onInfo: () => void;
  onSettings: () => void;
}

export function ArtDisplay({ asset, imageUrl, onRotate, onInfo, onSettings }: ArtDisplayProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      onRotate();
    }
  };

  return (
    <div id="main-content" className="main-content" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Background image container */}
      <div id="background-container" className="background-container">
        <img 
          id="background-image" 
          className="background-image" 
          src={imageUrl || undefined} 
          alt={asset?.title || 'Artwork'} 
        />
      </div>

      {/* Art info overlay */}
      <div id="art-info" className="art-info">
        <div className="art-details">
          <h1 id="art-title" className="art-title">{asset?.title || 'Untitled'}</h1>
          <p id="art-creator" className="art-creator">{asset?.creator || 'Unknown Artist'}</p>
          <p id="art-attribution" className="art-attribution">{asset?.attribution || ''}</p>
        </div>

        <div className="art-actions">
          <button
            id="rotate-btn"
            className="action-btn rotate-btn"
            title="Next artwork"
            onClick={onRotate}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
          <button 
            id="info-btn" 
            className="action-btn info-btn" 
            title="Learn more"
            onClick={onInfo}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
          <button
            id="settings-btn"
            className="action-btn settings-btn"
            title="Settings"
            onClick={onSettings}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}