import { useState, useEffect, useCallback } from 'preact/hooks';
import { ArtState, ExtensionMessage, UserSettings } from '../types';

export function useArtState() {
  const [state, setState] = useState<ArtState>({
    currentAssetIndex: 0,
    totalAssets: 0,
    currentAsset: null,
    userSettings: {},
    imageUrl: null,
    loading: true,
    error: null
  });

  const updateState = useCallback((updates: Partial<ArtState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string) => {
    updateState({ error, loading: false });
  }, [updateState]);

  const setLoading = useCallback((loading: boolean) => {
    updateState({ loading, error: null });
  }, [updateState]);

  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);

      const userSettings = await window.ArtManager.instance.getUserSettings();
      updateState({ userSettings });

      const syncSuccess = await window.ArtManager.instance.syncData();
      if (!syncSuccess) {
        throw new Error('Failed to sync asset data');
      }

      const totalAssets = await window.ArtManager.instance.syncedAssetCount();
      if (totalAssets === 0) {
        throw new Error('No assets available from current provider');
      }

      const currentAssetIndex = await window.ArtManager.instance.getCurrentIndex();
      updateState({ totalAssets, currentAssetIndex });

      // Get current asset from background script
      chrome.runtime.sendMessage({ type: 'requestCurrentAsset' }, (response: any) => {
        if (response && response.currentAssetIndex !== undefined) {
          updateState({ currentAssetIndex: response.currentAssetIndex });
        }

        if (userSettings.TURNOVER_ALWAYS) {
          rotateToNextImage();
        } else {
          displayCurrentImage();
        }
      });

    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError('Failed to load artwork');
    }
  }, [updateState, setLoading, setError]);

  const displayCurrentImage = useCallback(async () => {
    try {
      // Get the current index from ArtManager to ensure we have the latest value
      const currentIndex = await window.ArtManager.instance.getCurrentIndex();
      console.log('displayCurrentImage using index:', currentIndex);
      
      // Ensure we have the latest asset count and valid index
      const latestTotalAssets = await window.ArtManager.instance.syncedAssetCount();
      let validIndex = currentIndex;

      // Reset index if it's out of bounds for current provider
      if (validIndex >= latestTotalAssets) {
        validIndex = 0;
        await window.ArtManager.instance.setCurrentIndex(0);
      }

      const asset = await window.ArtManager.instance.getAsset(validIndex);
      if (!asset) {
        console.error(`Asset at index ${validIndex} not found. Total assets: ${latestTotalAssets}`);
        // Try to reset to first asset
        validIndex = 0;
        await window.ArtManager.instance.setCurrentIndex(0);
        const firstAsset = await window.ArtManager.instance.getAsset(0);
        if (!firstAsset) {
          throw new Error('No assets available from current provider');
        }
        updateState({ 
          currentAssetIndex: validIndex, 
          totalAssets: latestTotalAssets, 
          currentAsset: firstAsset 
        });
        return;
      }

      console.log('Loading asset:', asset.title);
      await window.ArtManager.instance.loadImage(validIndex);
      const imageUrl = await window.ArtManager.instance.getDisplayImageUrl(validIndex);
      console.log('Got image URL:', imageUrl);

      updateState({
        currentAssetIndex: validIndex,
        totalAssets: latestTotalAssets,
        currentAsset: asset,
        imageUrl,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Failed to display current image:', error);
      setError('Failed to load artwork. Please try refreshing the page.');
    }
  }, [updateState, setError]); // Remove dependency on state.currentAssetIndex

  const rotateToNextImage = useCallback(async () => {
    try {
      // Get the current index from the ArtManager to ensure we have the latest value
      const currentIndex = await window.ArtManager.instance.getCurrentIndex();
      console.log('Frontend sending rotateImage with index:', currentIndex);
      chrome.runtime.sendMessage({
        type: 'rotateImage',
        payload: { currentAssetIndex: currentIndex },
      });
    } catch (error) {
      console.error('Failed to rotate image:', error);
    }
  }, []); // Remove dependency on state.currentAssetIndex

  const switchProvider = useCallback(async (newProvider: string) => {
    try {
      setLoading(true);
      
      const updatedSettings = { ...state.userSettings, ART_PROVIDER: newProvider };
      updateState({ userSettings: updatedSettings });

      // Update the provider and reset to first asset
      await window.ArtManager.instance.setCurrentProvider(newProvider);
      await window.ArtManager.instance.setCurrentIndex(0);

      // Sync data first, then get count
      await window.ArtManager.instance.syncData();
      const totalAssets = await window.ArtManager.instance.syncedAssetCount();

      updateState({ currentAssetIndex: 0, totalAssets });

      if (totalAssets > 0) {
        await window.ArtManager.instance.loadImage(0);
        await displayCurrentImage();
      } else {
        // Wait for at least one asset to be available
        const checkAssets = async () => {
          const count = await window.ArtManager.instance.syncedAssetCount();
          if (count > 0) {
            updateState({ totalAssets: count });
            await displayCurrentImage();
          } else {
            setTimeout(checkAssets, 1000);
          }
        };
        checkAssets();
      }

      chrome.runtime.sendMessage({
        type: 'userSettingsUpdate',
        payload: { key: 'ART_PROVIDER', value: newProvider },
      });

    } catch (error) {
      console.error('Failed to switch provider:', error);
      setError('Failed to switch provider');
    }
  }, [state.userSettings, updateState, setLoading, setError, displayCurrentImage]);

  const handleAssetUpdate = useCallback(async (newAssetIndex?: number) => {
    console.log('Frontend handleAssetUpdate called with:', newAssetIndex);
    const index = newAssetIndex !== undefined ? newAssetIndex : await window.ArtManager.instance.getCurrentIndex();
    console.log('Frontend updating state to index:', index);
    
    // Also update the frontend ArtManager instance to stay in sync
    if (newAssetIndex !== undefined) {
      await window.ArtManager.instance.setCurrentIndex(newAssetIndex);
    }
    
    updateState({ currentAssetIndex: index });
    // Call displayCurrentImage after state has been updated
    setTimeout(() => displayCurrentImage(), 0);
  }, [updateState, displayCurrentImage]);

  // Set up message listener
  useEffect(() => {
    const messageListener = (message: ExtensionMessage) => {
      console.log('Frontend received message:', message);
      if (message.type === 'updateAsset') {
        handleAssetUpdate(message.payload?.newAssetIndex);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [handleAssetUpdate]);

  return {
    state,
    initializeApp,
    displayCurrentImage,
    rotateToNextImage,
    switchProvider,
    setError,
    setLoading,
    updateState
  };
}