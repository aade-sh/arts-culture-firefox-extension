

const ExtMessageType = {
  ROTATE_IMAGE: 'rotateImage',
  UPDATE_ASSET: 'updateAsset',
  USER_SETTINGS_UPDATE: 'userSettingsUpdate'
};

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  try {
    if (details.reason === 'install') {
      await Settings.writeDefaultUserSettings();
      console.log('Default settings initialized');
    }

    const syncSuccess = await AssetData.syncData();
    if (!syncSuccess) {
      console.error('Failed to sync asset data during installation');
      return;
    }

    const totalAssets = await AssetData.syncedAssetCount();
    console.log(`Total assets available: ${totalAssets}`);

    let currentAssetIndex = await Settings.getCurrentAssetIndex();
    if (currentAssetIndex >= totalAssets) {
      currentAssetIndex = 0;
    }
    await Settings.writeCurrentAssetIndex(currentAssetIndex);

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

chrome.browserAction.onClicked.addListener((tab) => {
  const siteUrl = 'https://artsandculture.google.com?utm_source=firefox_extension&utm_medium=default_link&utm_campaign=firefox_extension';
  chrome.tabs.create({
    active: true,
    openerTabId: tab.id,
    url: siteUrl
  });
});

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
  
  return false;
});

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

    const result = await AssetData.loadImage(nextAssetIndex);

    if (result) {
      await Settings.writeCurrentAssetIndex(currentAssetIndex);
      
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: ExtMessageType.UPDATE_ASSET,
            payload: { newAssetIndex: currentAssetIndex }
          }, () => {
            if (chrome.runtime.lastError) {}
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