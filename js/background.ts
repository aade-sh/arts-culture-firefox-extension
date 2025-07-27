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
    console.log('Rotating from index:', currentAssetIndex);
    
    // Get the total asset count to check bounds
    const totalAssets = await ArtManager.syncedAssetCount();
    console.log('Total assets available:', totalAssets);
    
    // Increment and wrap around if necessary
    let newIndex = currentAssetIndex + 1;
    if (newIndex >= totalAssets) {
      newIndex = 0;
    }
    
    console.log('New index after rotation:', newIndex);

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
        currentBackgroundAssetIndex = 0;
        await ArtManager.setCurrentIndex(0);

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