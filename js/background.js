const ExtMessageType = {
  ROTATE_IMAGE: 'rotateImage',
  UPDATE_ASSET: 'updateAsset',
  USER_SETTINGS_UPDATE: 'userSettingsUpdate',
  REQUEST_CURRENT_ASSET: 'requestCurrentAsset',
}

let currentBackgroundAssetIndex = 0

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === 'install') {
      await ArtManager.instance.loadState()
    }

    // Initialize the art provider manager (it will read from storage)
    await ArtManager.instance.getCurrentProvider()

    const syncSuccess = await ArtManager.instance.syncData()
    if (!syncSuccess) {
      console.error('Failed to sync asset data during installation')
      return
    }

    const totalAssets = await ArtManager.instance.syncedAssetCount()

    let currentAssetIndex = await ArtManager.instance.getCurrentIndex()
    if (currentAssetIndex >= totalAssets) {
      currentAssetIndex = 0
    }
    await ArtManager.instance.setCurrentIndex(currentAssetIndex)
    currentBackgroundAssetIndex = currentAssetIndex

    // Only preload the current image, not bulk downloading
    const currentLoad = await ArtManager.instance.loadImage(currentAssetIndex)

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case ExtMessageType.ROTATE_IMAGE:
      handleRotateImage(message.payload?.currentAssetIndex || 0)
      break
    case ExtMessageType.USER_SETTINGS_UPDATE:
      handleUserSettingsUpdate(message.payload)
      break
    case ExtMessageType.REQUEST_CURRENT_ASSET:
      handleRequestCurrentAsset(sendResponse)
      return true
    default:
      console.error('Unknown message type:', message.type)
  }

  return false
})

async function handleRotateImage(currentAssetIndex) {
  try {
    // Don't call syncedAssetCount() in background - this triggers unnecessary syncs
    // The frontend already has the asset count and validates the index

    currentAssetIndex += 1
    // Note: We can't validate max bounds here since each context has separate provider instances
    // The frontend will handle bounds checking when it receives the update

    // Just update the index and notify frontend - don't load images in background
    await ArtManager.instance.setCurrentIndex(currentAssetIndex)
    currentBackgroundAssetIndex = currentAssetIndex

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && tab.url.includes('newtab.html')) {
          chrome.tabs.sendMessage(
            tab.id,
            {
              type: ExtMessageType.UPDATE_ASSET,
              payload: { newAssetIndex: currentAssetIndex },
            },
            () => {
              if (chrome.runtime.lastError) {
              }
            },
          )
        }
      })
    })
  } catch (error) {
    console.error('Error rotating image:', error)
  }
}

async function handleUserSettingsUpdate(payload) {
  try {
    if (payload && payload.key) {
      await ArtManager.instance.setUserSetting(payload.key, payload.value)

      // If the art provider changed, reset the asset index
      if (payload.key === NewTabSetting.ART_PROVIDER) {
        currentBackgroundAssetIndex = 0
        await ArtManager.instance.setCurrentIndex(0)

        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.url && tab.url.includes('newtab.html')) {
              chrome.tabs.sendMessage(
                tab.id,
                {
                  type: ExtMessageType.UPDATE_ASSET,
                  payload: { newAssetIndex: currentBackgroundAssetIndex },
                },
                () => {
                  if (chrome.runtime.lastError) {
                  }
                },
              )
            }
          })
        })
      }
    }
  } catch (error) {
    console.error('Error updating user setting:', error)
  }
}

async function handleRequestCurrentAsset(sendResponse) {
  try {
    sendResponse({ currentAssetIndex: currentBackgroundAssetIndex })
  } catch (error) {
    sendResponse({ currentAssetIndex: 0 })
  }
}
