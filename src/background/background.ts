import { instance as ArtManager } from './art-manager'
import { ArtAsset, ProviderName } from '../types'

interface ExtensionMessage {
  type: string
  provider?: ProviderName
}

type GetCurrentArtResponse =
  | { error: string }
  | {
      asset: ArtAsset
      imageUrl: string | null
      totalAssets: number
      currentIndex: number
    }

const ExtMessageType = {
  GET_CURRENT_ART: 'getCurrentArt',
  ROTATE_TO_NEXT: 'rotateToNext',
  SWITCH_PROVIDER: 'switchProvider',
  ART_UPDATED: 'artUpdated',
} as const

let currentBackgroundAssetIndex = 0

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === 'install') {
      await ArtManager.loadState()
    }


    const syncSuccess = await ArtManager.syncData()
    if (!syncSuccess) {
      console.error('Failed to sync asset data during installation')
      return
    }

    const totalAssets = await ArtManager.syncedAssetCount()

    let currentAssetIndex = await ArtManager.getCurrentIndex()
    if (currentAssetIndex >= totalAssets) {
      currentAssetIndex = 0
    }
    await ArtManager.setCurrentIndex(currentAssetIndex)
    currentBackgroundAssetIndex = currentAssetIndex

    const currentLoad = await ArtManager.loadImage(currentAssetIndex)

    if (!currentLoad) {
      console.warn('Failed to pre-load current image')
    }
  } catch (error) {
    console.error('Error during extension setup:', error)
  }
})

chrome.browserAction.onClicked.addListener((tab) => {
  const siteUrl =
    'https://artsandculture.google.com?utm_source=firefox_extension&utm_medium=default_link&utm_campaign=firefox_extension'
  chrome.tabs.create({
    active: true,
    openerTabId: tab.id,
    url: siteUrl,
  })
})

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === ExtMessageType.GET_CURRENT_ART) {
      const tabId = sender.tab?.id
      if (tabId) {
        handleGetCurrentArtAsync()
          .then((response) => {
            chrome.tabs.sendMessage(tabId, {
              type: 'getCurrentArtResponse',
              data: response,
            })
          })
          .catch((error) => {
            console.error('Error getting art:', error)
            chrome.tabs.sendMessage(tabId, {
              type: 'getCurrentArtResponse',
              data: { error: 'Failed to load artwork: ' + error.message },
            })
          })
      }
      return false
    }

    switch (message.type) {
      case ExtMessageType.ROTATE_TO_NEXT:
        handleRotateToNext()
        break
      case ExtMessageType.SWITCH_PROVIDER:
        if (message.provider) {
          handleSwitchProvider(message.provider)
        }
        break
      default:
        console.error('Unknown message type:', message.type)
    }

    return false
  },
)

async function handleGetCurrentArtAsync(): Promise<GetCurrentArtResponse> {
  const syncSuccess = await ArtManager.syncData()
  if (!syncSuccess) {
    return { error: 'Failed to sync art data' }
  }

  const totalAssets = await ArtManager.syncedAssetCount()
  if (totalAssets === 0) {
    return { error: 'No assets available from current provider' }
  }

  const currentIndex = await ArtManager.getCurrentIndex()
  currentBackgroundAssetIndex = currentIndex

  let asset = await ArtManager.getAsset(currentBackgroundAssetIndex)

  if (!asset) {
    const validIndex = await findNextValidAsset(
      currentBackgroundAssetIndex,
      totalAssets,
    )
    if (validIndex === -1) {
      return { error: 'No valid assets available' }
    }
    currentBackgroundAssetIndex = validIndex
    await ArtManager.setCurrentIndex(validIndex)
    asset = await ArtManager.getAsset(validIndex)
  }

  if (!asset) {
    return { error: 'Failed to load asset data' }
  }

  await ArtManager.loadImage(currentBackgroundAssetIndex)
  const imageUrl = await ArtManager.getDisplayImageUrl(
    currentBackgroundAssetIndex,
  )

  return {
    asset: asset,
    imageUrl,
    totalAssets,
    currentIndex: currentBackgroundAssetIndex,
  }
}

async function handleRotateToNext(): Promise<void> {
  try {
    const totalAssets = await ArtManager.syncedAssetCount()
    let newIndex = currentBackgroundAssetIndex + 1
    if (newIndex >= totalAssets) {
      newIndex = 0
    }

    // Find next valid asset
    const validIndex = await findNextValidAsset(newIndex, totalAssets)
    if (validIndex === -1) {
      console.error('No valid assets found')
      return
    }

    currentBackgroundAssetIndex = validIndex
    await ArtManager.setCurrentIndex(validIndex)

    const asset = await ArtManager.getAsset(validIndex)
    await ArtManager.loadImage(validIndex)
    const imageUrl = await ArtManager.getDisplayImageUrl(validIndex)

    // Notify all new tab pages
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id && tab.url?.includes('newtab')) {
          chrome.tabs.sendMessage(tab.id, {
            type: ExtMessageType.ART_UPDATED,
            asset,
            imageUrl,
            totalAssets,
            currentIndex: validIndex,
          })
        }
      })
    })
  } catch (error) {
    console.error('Error rotating to next:', error)
  }
}

async function handleSwitchProvider(providerName: ProviderName): Promise<void> {
  try {
    await ArtManager.setCurrentProvider(providerName)
    await ArtManager.syncData()

    const totalAssets = await ArtManager.syncedAssetCount()
    const validIndex = await findNextValidAsset(0, totalAssets)

    if (validIndex === -1) {
      console.error('No valid assets in new provider')
      return
    }

    currentBackgroundAssetIndex = validIndex
    await ArtManager.setCurrentIndex(validIndex)

    const asset = await ArtManager.getAsset(validIndex)
    await ArtManager.loadImage(validIndex)
    const imageUrl = await ArtManager.getDisplayImageUrl(validIndex)

    // Notify all new tab pages
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id && tab.url?.includes('newtab')) {
          chrome.tabs.sendMessage(tab.id, {
            type: ExtMessageType.ART_UPDATED,
            asset,
            imageUrl,
            totalAssets,
            currentIndex: validIndex,
          })
        }
      })
    })
  } catch (error) {
    console.error('Error switching provider:', error)
  }
}

async function findNextValidAsset(
  startIndex: number,
  totalAssets: number,
): Promise<number> {
  const provider = ArtManager.getCurrentProviderSync()

  // For Google Arts, assets are pre-validated, so just return the index
  if (provider.name === 'google-arts') {
    return startIndex
  }

  // For Met Museum, search for valid assets
  let attempts = 0
  const maxAttempts = 10
  let index = startIndex

  while (attempts < maxAttempts) {
    const asset = await ArtManager.getAsset(index)
    if (asset) {
      return index
    }

    index++
    if (index >= totalAssets) {
      index = 0
    }
    attempts++
  }

  return -1 // No valid asset found
}
