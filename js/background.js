// Background script for Firefox GAC extension

// Scripts are loaded via manifest.json

// Message types
const ExtMessageType = {
  ROTATE_IMAGE: 'rotateImage',
  UPDATE_ASSET: 'updateAsset',
  USER_SETTINGS_UPDATE: 'userSettingsUpdate'
};

// Extension installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  try {
    // Initialize default settings on first install
    if (details.reason === 'install') {
      await Settings.writeDefaultUserSettings();
      console.log('Default settings initialized');
    }

    // Sync asset data
    const syncSuccess = await AssetData.syncData();
    if (!syncSuccess) {
      console.error('Failed to sync asset data during installation');
      return;
    }

    const totalAssets = await AssetData.syncedAssetCount();
    console.log(`Total assets available: ${totalAssets}`);

    // Initialize current asset index
    let currentAssetIndex = await Settings.getCurrentAssetIndex();
    if (currentAssetIndex >= totalAssets) {
      currentAssetIndex = 0;
    }
    await Settings.writeCurrentAssetIndex(currentAssetIndex);

    // Pre-load current and next images
    let nextAssetIndex = currentAssetIndex + 1;
    if (nextAssetIndex >= totalAssets) {
      nextAssetIndex = 0;
    }

    const currentLoad = await AssetData.loadImage(currentAssetIndex);
    const nextLoad = await AssetData.loadImage(nextAssetIndex);

    if (!currentLoad || !nextLoad) {
      console.warn('Failed to pre-load some images');
    }

    console.log('Extension setup completed successfully');
  } catch (error) {
    console.error('Error during extension setup:', error);
  }
});

// Browser action click (extension icon)
chrome.browserAction.onClicked.addListener((tab) => {
  const siteUrl = 'https://artsandculture.google.com?utm_source=firefox_extension&utm_medium=default_link&utm_campaign=firefox_extension';
  chrome.tabs.create({
    active: true,
    openerTabId: tab.id,
    url: siteUrl
  });
});

// Runtime message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case ExtMessageType.ROTATE_IMAGE:
      handleRotateImage(message.payload?.currentAssetIndex || 0);
      break;
    case ExtMessageType.USER_SETTINGS_UPDATE:
      handleUserSettingsUpdate(message.payload);
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
  
  return false; // Synchronous response
});

// Handle image rotation
async function handleRotateImage(currentAssetIndex) {
  try {
    currentAssetIndex += 1;
    const totalAssets = await AssetData.syncedAssetCount();

    if (currentAssetIndex >= totalAssets) {
      currentAssetIndex = 0;
    }

    let nextAssetIndex = currentAssetIndex + 1;
    if (nextAssetIndex >= totalAssets) {
      nextAssetIndex = 0;  
    }

    // Pre-load the next image
    const result = await AssetData.loadImage(nextAssetIndex);

    if (result) {
      await Settings.writeCurrentAssetIndex(currentAssetIndex);
      
      // Notify all tabs about the asset update
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: ExtMessageType.UPDATE_ASSET,
            payload: { newAssetIndex: currentAssetIndex }
          }, () => {
            // Ignore errors for tabs that can't receive messages
            if (chrome.runtime.lastError) {
              // Silently ignore
            }
          });
        });
      });
    } else {
      console.error('Failed to load next image');
    }
  } catch (error) {
    console.error('Error rotating image:', error);
  }
}

// Handle user settings update
async function handleUserSettingsUpdate(payload) {
  try {
    if (payload && payload.key && typeof payload.value === 'boolean') {
      await Settings.writeUserSetting(payload.key, payload.value);
      console.log(`Updated setting ${payload.key} to ${payload.value}`);
    }
  } catch (error) {
    console.error('Error updating user setting:', error);
  }
}

console.log('Background script loaded');