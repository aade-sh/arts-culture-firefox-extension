import { useState, useEffect, useCallback } from 'preact/hooks'
import { GoogleArtsAsset } from '../models/google-arts-asset'
import { MetMuseumAsset } from '../models/met-museum-asset'
import { ArtAssetJson } from '../models/json-data'
import { ArtAsset, UserSettings } from '../types'

// Factory to reconstruct asset objects with their methods
function artAssetFactory(assetData: ArtAssetJson): ArtAsset {
  switch (assetData.provider) {
    case 'google-arts':
      return GoogleArtsAsset.fromJSON(assetData)
    case 'met-museum':
      return MetMuseumAsset.fromJSON(assetData)
    default:
      throw new Error(`Unknown art provider: ${(assetData as any).provider}`)
  }
}

interface InitializeArtResponse {
  type: 'initializeArtResponse'
  data: {
    error?: string
    asset?: ArtAssetJson
    imageUrl?: string | null
    totalAssets?: number
    currentIndex?: number
    userSettings?: UserSettings
  }
}

interface ArtUpdatedMessage {
  type: 'artUpdated'
  asset: ArtAssetJson
  imageUrl: string | null
  totalAssets: number
  currentIndex: number
  userSettings: UserSettings
}

type RuntimeMessage = InitializeArtResponse | ArtUpdatedMessage

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

  const initializeArt = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      await chrome.runtime.sendMessage({ type: 'initializeArt' })
    } catch (error) {
      console.error(
        'Error sending message to event listeners while initializing art',
      )
      setState((prev) => ({
        ...prev,
        error: 'Failed to initialize art',
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
      if (message.type === 'initializeArtResponse') {
        if (message.data.error) {
          setState((prev) => ({
            ...prev,
            error: message.data.error || null,
            loading: false,
          }))
        } else {
          const asset = message.data.asset
            ? artAssetFactory(message.data.asset)
            : null

          setState((prev) => ({
            ...prev,
            currentAsset: asset,
            imageUrl: message.data.imageUrl || null,
            totalAssets: message.data.totalAssets || 0,
            currentIndex: message.data.currentIndex || 0,
            userSettings: message.data.userSettings || {},
            loading: false,
            error: null,
          }))
        }
      } else if (message.type === 'artUpdated') {
        const asset = artAssetFactory(message.asset)
        setState((prev) => ({
          ...prev,
          currentAsset: asset,
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
    initializeArt() // Initial load

    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [initializeArt])

  return {
    ...state,
    rotateToNext,
    switchProvider,
    initializeArt,
  }
}
