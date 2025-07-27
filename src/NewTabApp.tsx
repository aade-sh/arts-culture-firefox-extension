import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useArtState } from './hooks/useArtState';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ArtDisplay } from './components/ArtDisplay';
import { SettingsModal } from './components/SettingsModal';

export function NewTabApp() {
  const [showSettings, setShowSettings] = useState(false);
  const {
    state,
    initializeApp,
    rotateToNextImage,
    switchProvider,
    updateState
  } = useArtState();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const handleInfo = async () => {
    const url = await window.ArtManager.instance.getDetailsUrl(state.currentAssetIndex);
    if (url) {
      chrome.tabs.create({ url });
    }
  };

  const handleTurnoverChange = async (checked: boolean) => {
    const updatedSettings = { ...state.userSettings, TURNOVER_ALWAYS: checked };
    updateState({ userSettings: updatedSettings });
    await window.ArtManager.instance.setTurnoverAlways(checked);
  };

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if (state.error) {
    return <ErrorDisplay message={state.error} />;
  }

  return (
    <>
      <ArtDisplay
        asset={state.currentAsset}
        imageUrl={state.imageUrl}
        onRotate={rotateToNextImage}
        onInfo={handleInfo}
        onSettings={() => setShowSettings(true)}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userSettings={state.userSettings}
        onProviderChange={switchProvider}
        onTurnoverChange={handleTurnoverChange}
      />
    </>
  );
}