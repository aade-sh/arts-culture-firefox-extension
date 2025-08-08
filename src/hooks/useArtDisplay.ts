import { useState, useEffect, useCallback } from 'preact/hooks'
import { ArtAsset, UserSettings } from '../types'

interface GetCurrentArtResponse {
  type: 'getCurrentArtResponse'
  data: {
    error?: string
    asset?: ArtAsset
    imageUrl?: string | null
    totalAssets?: number
    currentIndex?: number
    userSettings?: UserSettings
  }
}

interface ArtUpdatedMessage {
  type: 'artUpdated'
  asset: ArtAsset
  imageUrl: string | null
  totalAssets: number
  currentIndex: number
  userSettings: UserSettings
}

type RuntimeMessage = GetCurrentArtResponse | ArtUpdatedMessage

interface ArtState {
  currentAsset: ArtAsset | null
  imageUrl: string | null
  loading: boolean
  error: string | null
  totalAssets: number
  currentIndex: number
  userSettings: UserSettings
}

export function useArtDisplay() {
  const [state, setState] = useState<ArtState>({
    currentAsset: null,
    imageUrl: null,
    loading: true,
    error: null,
    totalAssets: 0,
    currentIndex: 0,
    userSettings: {},
  })

  const refreshArt = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      await chrome.runtime.sendMessage({ type: 'getCurrentArt' })
    } catch (error) {
      console.error(
        'Error sending message to event listeners while getting current art',
      )
      setState((prev) => ({
        ...prev,
        error: 'Failed to load art',
        loading: false,
      }))
    }
  }, [])

  const rotateToNext = useCallback(async () => {
    try {
      chrome.runtime.sendMessage({ type: 'rotateToNext' })
    } catch (error) {
      console.error('Error sending message to event listeners whicle rotating')
    }
  }, [])

  const switchProvider = useCallback(async (provider: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      await chrome.runtime.sendMessage({ type: 'switchProvider', provider })
    } catch (error) {
      console.error(
        'Error sending message to event listeners whicle switching providers',
      )
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          'Error sending message to event listeners while switching providers',
      }))
    }
  }, [])

  // Listen for updates from background
  useEffect(() => {
    const listener = (message: RuntimeMessage) => {
      if (message.type === 'getCurrentArtResponse') {
        if (message.data.error) {
          setState((prev) => ({
            ...prev,
            error: message.data.error || null,
            loading: false,
          }))
        } else {
          setState((prev) => ({
            ...prev,
            currentAsset: message.data.asset || null,
            imageUrl: message.data.imageUrl || null,
            totalAssets: message.data.totalAssets || 0,
            currentIndex: message.data.currentIndex || 0,
            userSettings: message.data.userSettings || {},
            loading: false,
            error: null,
          }))
        }
      } else if (message.type === 'artUpdated') {
        setState((prev) => ({
          ...prev,
          currentAsset: message.asset,
          imageUrl: message.imageUrl,
          totalAssets: message.totalAssets,
          currentIndex: message.currentIndex,
          userSettings: message.userSettings,
          loading: false,
          error: null,
        }))
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    refreshArt() // Initial load

    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [refreshArt])

  return {
    ...state,
    rotateToNext,
    switchProvider,
    refreshArt,
  }
}
