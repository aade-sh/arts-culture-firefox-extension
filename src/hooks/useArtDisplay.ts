import { useState, useEffect, useCallback } from 'preact/hooks'
import { GoogleArtsAsset } from '../models/google-arts-asset'
import { MetMuseumAsset } from '../models/met-museum-asset'
import { ClevelandArtAsset } from '../models/cleveland-art-asset'
import { RijksmuseumAsset } from '../models/rijksmuseum-asset'
import { ArtAssetJson } from '../models/json-data'
import {
  ArtAsset,
  ProviderName,
  UserSettings,
} from '../types'
import {
  ExtensionMessage,
  RuntimeMessage,
  RuntimeMessageType,
} from '../types/runtime-messages'

// Factory to reconstruct asset objects with their methods
function artAssetFactory(assetData: ArtAssetJson): ArtAsset {
  switch (assetData.provider) {
    case 'google-arts':
      return GoogleArtsAsset.fromJSON(assetData)
    case 'met-museum':
      return MetMuseumAsset.fromJSON(assetData)
    case 'cleveland-museum':
      return ClevelandArtAsset.fromJSON(assetData)
    case 'rijksmuseum':
      return RijksmuseumAsset.fromJSON(assetData)
    default:
      throw new Error(`Unknown art provider: ${(assetData as any).provider}`)
  }
}

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
      const message: ExtensionMessage = {
        type: RuntimeMessageType.INITIALIZE_ART,
      }
      await chrome.runtime.sendMessage(message)
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
      const message: ExtensionMessage = {
        type: RuntimeMessageType.ROTATE_TO_NEXT,
      }
      chrome.runtime.sendMessage(message)
    } catch (error) {
      console.error('Error sending message to event listeners whicle rotating')
    }
  }, [])

  const switchProvider = useCallback(async (provider: ProviderName) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const message: ExtensionMessage = {
        type: RuntimeMessageType.SWITCH_PROVIDER,
        provider,
      }
      await chrome.runtime.sendMessage(message)
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

  const setTurnoverAlways = useCallback(
    async (enabled: boolean) => {
      const previousValue = state.userSettings.TURNOVER_ALWAYS

      setState((prev) => ({
        ...prev,
        userSettings: {
          ...prev.userSettings,
          TURNOVER_ALWAYS: enabled,
        },
      }))

      try {
        const message: ExtensionMessage = {
          type: RuntimeMessageType.SET_TURNOVER_ALWAYS,
          turnoverAlwaysEnabled: enabled,
        }
        await chrome.runtime.sendMessage(message)
      } catch (error) {
        console.error(
          'Error sending message to event listeners while setting turnoverAlways',
        )
        setState((prev) => ({
          ...prev,
          userSettings: {
            ...prev.userSettings,
            TURNOVER_ALWAYS: previousValue,
          },
        }))
      }
    },
    [state.userSettings.TURNOVER_ALWAYS],
  )

  // Listen for updates from background
  useEffect(() => {
    const listener = (message: RuntimeMessage) => {
      if (message.type === RuntimeMessageType.INITIALIZE_ART_RESPONSE) {
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
      } else if (message.type === RuntimeMessageType.ART_UPDATED) {
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
      } else if (message.type === RuntimeMessageType.SETTINGS_UPDATED) {
        setState((prev) => ({
          ...prev,
          userSettings: {
            ...prev.userSettings,
            ...message.userSettings,
          },
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
    setTurnoverAlways,
    initializeArt,
  }
}
