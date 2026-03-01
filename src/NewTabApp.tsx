import { useState } from 'preact/hooks'
import { useArtDisplay } from './hooks/useArtDisplay'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ErrorDisplay } from './components/ErrorDisplay'
import { ArtDisplay } from './components/ArtDisplay'
import { SettingsModal } from './components/SettingsModal'
import { ProviderName } from './types'

export function NewTabApp() {
  const [showSettings, setShowSettings] = useState(false)
  const {
    currentAsset,
    imageUrl,
    loading,
    error,
    userSettings,
    rotateToNext,
    switchProvider,
    setTurnoverAlways,
  } = useArtDisplay()

  const handleProviderChange = async (provider: ProviderName) => {
    try {
      await switchProvider(provider)
    } finally {
      setShowSettings(false)
    }
  }

  const handleInfo = () => {
    if (currentAsset?.getDetailsUrl) {
      chrome.tabs.create({ url: currentAsset.getDetailsUrl() })
    }
  }

  const handleTurnoverAlwaysChange = async (enabled: boolean) => {
    await setTurnoverAlways(enabled)
  }

  // Show full loading screen only if no image exists yet
  if (loading && !imageUrl) {
    return <LoadingSpinner />
  }

  if (error && !imageUrl) {
    return <ErrorDisplay message={error} />
  }

  return (
    <>
      <ArtDisplay
        asset={currentAsset}
        imageUrl={imageUrl}
        loading={loading}
        error={error}
        onRotate={rotateToNext}
        onInfo={handleInfo}
        onSettings={() => setShowSettings(true)}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userSettings={userSettings}
        onProviderChange={handleProviderChange}
        onTurnoverAlwaysChange={handleTurnoverAlwaysChange}
      />
    </>
  )
}
