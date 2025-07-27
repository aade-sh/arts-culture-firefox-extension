import { useState, useEffect, useCallback } from 'preact/hooks';
import { ArtAsset } from '../types';

interface ArtState {
  currentAsset: ArtAsset | null;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  totalAssets: number;
  currentIndex: number;
  userSettings: any;
}

export function useArtDisplay() {
  const [state, setState] = useState<ArtState>({
    currentAsset: null,
    imageUrl: null,
    loading: true,
    error: null,
    totalAssets: 0,
    currentIndex: 0,
    userSettings: {}
  });

  const refreshArt = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      chrome.runtime.sendMessage({ type: 'getCurrentArt' });
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to load art', loading: false }));
    }
  }, []);

  const rotateToNext = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'rotateToNext' });
  }, []);

  const switchProvider = useCallback(async (provider: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    chrome.runtime.sendMessage({ type: 'switchProvider', provider });
  }, []);

  // Listen for updates from background
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'getCurrentArtResponse') {
        if (message.data.error) {
          setState(prev => ({ ...prev, error: message.data.error, loading: false }));
        } else {
          setState(prev => ({
            ...prev,
            currentAsset: message.data.asset,
            imageUrl: message.data.imageUrl,
            totalAssets: message.data.totalAssets,
            currentIndex: message.data.currentIndex,
            loading: false,
            error: null
          }));
        }
      } else if (message.type === 'artUpdated') {
        setState(prev => ({
          ...prev,
          currentAsset: message.asset,
          imageUrl: message.imageUrl,
          totalAssets: message.totalAssets,
          currentIndex: message.currentIndex,
          loading: false,
          error: null
        }));
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    refreshArt(); // Initial load

    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refreshArt]);

  return {
    ...state,
    rotateToNext,
    switchProvider,
    refreshArt
  };
}