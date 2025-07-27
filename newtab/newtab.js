// New tab page functionality
class NewTabPage {
  constructor() {
    this.currentAssetIndex = 0;
    this.totalAssets = 0;
    this.userSettings = {};
    this.init();
  }

  async init() {
    try {
      // Show loading state
      this.showLoading();

      // Load user settings
      this.userSettings = await Settings.getUserSettings();
      this.applyUserSettings();

      // Ensure asset data is synced
      await AssetData.syncData();
      this.totalAssets = await AssetData.syncedAssetCount();

      // Get current asset index
      this.currentAssetIndex = await Settings.getCurrentAssetIndex();

      // Check if we should rotate on new tab
      if (this.userSettings[NewTabSetting.TURNOVER_ALWAYS]) {
        await this.rotateToNextImage();
      } else {
        await this.displayCurrentImage();
      }

      // Setup event listeners
      this.setupEventListeners();

      // Hide loading and show content
      this.hideLoading();

      console.log('New tab page initialized');
    } catch (error) {
      console.error('Failed to initialize new tab page:', error);
      this.showError('Failed to load artwork');
    }
  }

  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
  }

  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }

  showError(message) {
    const loading = document.getElementById('loading');
    const p = document.createElement('p');
    p.style.color = '#ff6b6b';
    p.textContent = message;
    loading.innerHTML = '';
    loading.appendChild(p);
    loading.classList.remove('hidden');
  }

  async displayCurrentImage() {
    try {
      const asset = await AssetData.getAsset(this.currentAssetIndex);
      if (!asset) {
        throw new Error('Asset not found');
      }

      // Load the image if not already loaded
      await AssetData.loadImage(this.currentAssetIndex);

      // Update UI
      this.updateArtInfo(asset);
      this.updateBackgroundImage(asset);

      // Preload next image
      let nextIndex = this.currentAssetIndex + 1;
      if (nextIndex >= this.totalAssets) {
        nextIndex = 0;
      }
      AssetData.loadImage(nextIndex); // Don't await, just start loading
      
    } catch (error) {
      console.error('Failed to display current image:', error);
    }
  }

  async rotateToNextImage() {
    try {
      // Send rotation message to background
      chrome.runtime.sendMessage({
        type: 'rotateImage',
        payload: { currentAssetIndex: this.currentAssetIndex }
      });

      // The background script will send us an UPDATE_ASSET message when ready
      // No need to manually refresh here
    } catch (error) {
      console.error('Failed to rotate image:', error);
    }
  }

  updateArtInfo(asset) {
    document.getElementById('art-title').textContent = asset.title || 'Untitled';
    document.getElementById('art-creator').textContent = asset.creator || 'Unknown Artist';
    document.getElementById('art-attribution').textContent = asset.attribution || '';
  }

  updateBackgroundImage(asset) {
    const imageUrl = AssetData.getImageUrl(this.currentAssetIndex);
    const backgroundImage = document.getElementById('background-image');
    
    if (imageUrl) {
      backgroundImage.src = imageUrl;
      backgroundImage.alt = asset.title || 'Artwork';
    }
  }

  applyUserSettings() {
    // Settings applied (no quick access buttons to hide/show)
  }

  setupEventListeners() {
    // Rotate button
    document.getElementById('rotate-btn').addEventListener('click', 
      () => this.rotateToNextImage());

    // Info button - open arts and culture link
    document.getElementById('info-btn').addEventListener('click', async () => {
      const asset = await AssetData.getAsset(this.currentAssetIndex);
      if (asset && asset.link) {
        chrome.tabs.create({ url: `https://artsandculture.google.com/asset/${asset.link}` });
      }
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', 
      () => this.openSettings());


    // Settings modal
    document.getElementById('close-settings').addEventListener('click', 
      () => this.closeSettings());

    // Settings checkboxes
    this.setupSettingsListeners();

    // Listen for background messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'updateAsset') {
        this.handleAssetUpdate(message.payload?.newAssetIndex);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.rotateToNextImage();
      }
    });
  }

  setupSettingsListeners() {
    const settingsMap = {
      'turnover-always': NewTabSetting.TURNOVER_ALWAYS
    };

    for (const [elementId, settingKey] of Object.entries(settingsMap)) {
      const checkbox = document.getElementById(elementId);
      checkbox.checked = this.userSettings[settingKey];
      
      checkbox.addEventListener('change', async (e) => {
        this.userSettings[settingKey] = e.target.checked;
        await Settings.writeUserSetting(settingKey, e.target.checked);
        
        // Apply settings immediately
        this.applyUserSettings();
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'userSettingsUpdate',
          payload: { key: settingKey, value: e.target.checked }
        });
      });
    }
  }

  openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
  }

  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  async handleAssetUpdate(newAssetIndex) {
    // Update current asset index and display
    if (newAssetIndex !== undefined) {
      this.currentAssetIndex = newAssetIndex;
    } else {
      this.currentAssetIndex = await Settings.getCurrentAssetIndex();
    }
    await this.displayCurrentImage();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new NewTabPage();
});