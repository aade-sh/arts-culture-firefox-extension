import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { useArtDisplay } from './hooks/useArtDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ArtDisplay } from './components/ArtDisplay';
import { SettingsModal } from './components/SettingsModal';

export function NewTabApp() {
  const [showSettings, setShowSettings] = useState(false);
  const {
    currentAsset,
    imageUrl,
    loading,
    error,
    userSettings,
    rotateToNext,
    switchProvider
  } = useArtDisplay();

  const handleInfo = () => {
    if (currentAsset?.getDetailsUrl) {
      chrome.tabs.create({ url: currentAsset.getDetailsUrl() });
    }
  };

  const handleTurnoverChange = async (checked: boolean) => {
    // For now, we'll handle this as a simple state update
    // In a full implementation, you'd want to persist this setting
    console.log('Turnover setting changed:', checked);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  return (
    <>
      <ArtDisplay
        asset={currentAsset}
        imageUrl={imageUrl}
        onRotate={rotateToNext}
        onInfo={handleInfo}
        onSettings={() => setShowSettings(true)}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userSettings={userSettings}
        onProviderChange={switchProvider}
        onTurnoverChange={handleTurnoverChange}
      />
    </>
  );
}