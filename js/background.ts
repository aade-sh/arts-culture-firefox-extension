import { instance as ArtManager } from './art-manager.js';
import { NewTabSetting } from './settings.js';
import { ExtensionMessage } from '../src/types/index.js';

// Make ArtManager globally available for the extension
(globalThis as any).ArtManager = { instance: ArtManager };
(globalThis as any).NewTabSetting = NewTabSetting;

const ExtMessageType = {
  ROTATE_IMAGE: 'rotateImage',
  UPDATE_ASSET: 'updateAsset',
  USER_SETTINGS_UPDATE: 'userSettingsUpdate',
  REQUEST_CURRENT_ASSET: 'requestCurrentAsset',
} as const;

let currentBackgroundAssetIndex = 0;

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    if (details.reason === 'install') {
      await ArtManager.loadState();
    }

    await ArtManager.getCurrentProvider();

    const syncSuccess = await ArtManager.syncData();
    if (!syncSuccess) {
      console.error('Failed to sync asset data during installation');
      return;
    }

    const totalAssets = await ArtManager.syncedAssetCount();

    let currentAssetIndex = await ArtManager.getCurrentIndex();
    if (currentAssetIndex >= totalAssets) {
      currentAssetIndex = 0;
    }
    await ArtManager.setCurrentIndex(currentAssetIndex);
    currentBackgroundAssetIndex = currentAssetIndex;

    const currentLoad = await ArtManager.loadImage(currentAssetIndex);

    if (!currentLoad) {
      console.warn('Failed to pre-load current image');
    }
  } catch (error) {
    console.error('Error during extension setup:', error);
  }
});

chrome.browserAction.onClicked.addListener((tab) => {
  const siteUrl =
    'https://artsandculture.google.com?utm_source=firefox_extension&utm_medium=default_link&utm_campaign=firefox_extension';
  chrome.tabs.create({
    active: true,
    openerTabId: tab.id,
    url: siteUrl,
  });
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  switch (message.type) {
    case ExtMessageType.ROTATE_IMAGE:
      handleRotateImage(message.payload?.currentAssetIndex || 0);
      break;
    case ExtMessageType.USER_SETTINGS_UPDATE:
      handleUserSettingsUpdate(message.payload);
      break;
    case ExtMessageType.REQUEST_CURRENT_ASSET:
      handleRequestCurrentAsset(sendResponse);
      return true;
    default:
      console.error('Unknown message type:', message.type);
  }

  return false;
});

async function handleRotateImage(currentAssetIndex: number): Promise<void> {
  try {
    const totalAssets = await ArtManager.syncedAssetCount();
    
    let newIndex = currentAssetIndex + 1;
    if (newIndex >= totalAssets) {
      newIndex = 0;
    }
    
    // For Met Museum, skip invalid assets by finding the next valid one
    const provider = await ArtManager.getCurrentProvider();
    if (provider.name === 'met-museum') {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const asset = await ArtManager.getAsset(newIndex);
        if (asset) {
          break;
        }
        
        newIndex++;
        if (newIndex >= totalAssets) {
          newIndex = 0;
        }
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.error('Could not find a valid asset after 10 attempts');
        return;
      }
    }

    await ArtManager.setCurrentIndex(newIndex);
    currentBackgroundAssetIndex = newIndex;

    chrome.runtime.sendMessage({
      type: ExtMessageType.UPDATE_ASSET,
      payload: { newAssetIndex: newIndex },
    });
  } catch (error) {
    console.error('Error rotating image:', error);
  }
}

async function handleUserSettingsUpdate(payload: any): Promise<void> {
  try {
    if (payload && payload.key) {
      await ArtManager.setUserSetting(payload.key, payload.value);

      if (payload.key === NewTabSetting.ART_PROVIDER) {
        let startIndex = 0;
        
        // For Met Museum, find the first valid asset
        const provider = await ArtManager.getCurrentProvider();
        if (provider.name === 'met-museum') {
          const totalAssets = await ArtManager.syncedAssetCount();
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts && startIndex < totalAssets) {
            const asset = await ArtManager.getAsset(startIndex);
            if (asset) {
              break;
            }
            
            startIndex++;
            attempts++;
          }
          
          if (attempts >= maxAttempts) {
            console.error('Could not find a valid starting asset');
            startIndex = 0;
          }
        }
        
        currentBackgroundAssetIndex = startIndex;
        await ArtManager.setCurrentIndex(startIndex);

        chrome.runtime.sendMessage({
          type: ExtMessageType.UPDATE_ASSET,
          payload: { newAssetIndex: currentBackgroundAssetIndex },
        });
      }
    }
  } catch (error) {
    console.error('Error updating user setting:', error);
  }
}

async function handleRequestCurrentAsset(sendResponse: (response: any) => void): Promise<void> {
  try {
    sendResponse({ currentAssetIndex: currentBackgroundAssetIndex });
  } catch (error) {
    sendResponse({ currentAssetIndex: 0 });
  }
}