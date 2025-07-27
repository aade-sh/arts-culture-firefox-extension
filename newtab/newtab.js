class NewTabPage {
  constructor() {
    this.currentAssetIndex = 0;
    this.totalAssets = 0;
    this.userSettings = {};
    this.init();
  }

  async init() {
    try {
      this.showLoading();

      this.userSettings = await Settings.getUserSettings();
      this.applyUserSettings();

      // Set the art provider before syncing data
      const providerName = this.userSettings[NewTabSetting.ART_PROVIDER] || 'google-arts';
      console.log('Setting art provider to:', providerName);
      await ArtProviders.setCurrentProvider(providerName);

      console.log('Syncing data for provider:', providerName);
      const syncSuccess = await AssetData.syncData();
      if (!syncSuccess) {
        throw new Error('Failed to sync asset data');
      }

      this.totalAssets = await AssetData.syncedAssetCount();
      console.log('Total assets available:', this.totalAssets);

      if (this.totalAssets === 0) {
        throw new Error('No assets available from current provider');
      }

      this.currentAssetIndex = await Settings.getCurrentAssetIndex();
      console.log('Current asset index:', this.currentAssetIndex);

      chrome.runtime.sendMessage({
        type: 'requestCurrentAsset'
      }, (response) => {
        if (response && response.currentAssetIndex !== undefined) {
          this.currentAssetIndex = response.currentAssetIndex;
        }
        
        if (this.userSettings[NewTabSetting.TURNOVER_ALWAYS]) {
          this.rotateToNextImage();
        } else {
          this.displayCurrentImage();
        }
      });

      this.setupEventListeners();

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
      // Ensure we have the latest asset count and valid index
      this.totalAssets = await AssetData.syncedAssetCount();
      
      // Reset index if it's out of bounds for current provider
      if (this.currentAssetIndex >= this.totalAssets) {
        this.currentAssetIndex = 0;
        await Settings.writeCurrentAssetIndex(0);
      }

      const asset = await AssetData.getAsset(this.currentAssetIndex);
      if (!asset) {
        console.error(`Asset at index ${this.currentAssetIndex} not found. Total assets: ${this.totalAssets}`);
        // Try to reset to first asset
        this.currentAssetIndex = 0;
        await Settings.writeCurrentAssetIndex(0);
        const firstAsset = await AssetData.getAsset(0);
        if (!firstAsset) {
          throw new Error('No assets available from current provider');
        }
        await this.displayCurrentImage();
        return;
      }

      await AssetData.loadImage(this.currentAssetIndex);

      this.updateArtInfo(asset);
      this.updateBackgroundImage(asset);

      // Don't preload next image to avoid bulk downloading
      
    } catch (error) {
      console.error('Failed to display current image:', error);
      this.showError('Failed to load artwork. Please try refreshing the page.');
    }
  }

  async rotateToNextImage() {
    try {
      chrome.runtime.sendMessage({
        type: 'rotateImage',
        payload: { currentAssetIndex: this.currentAssetIndex }
      });

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
  }

  setupEventListeners() {
    document.getElementById('rotate-btn').addEventListener('click', 
      () => this.rotateToNextImage());

    document.getElementById('info-btn').addEventListener('click', async () => {
      const asset = await AssetData.getAsset(this.currentAssetIndex);
      if (asset && asset.link) {
        // Use the provider-specific link directly
        let url = asset.link;
        
        // For Google Arts, we need to construct the full URL
        if (asset.provider === 'google-arts') {
          url = `https://artsandculture.google.com/asset/${asset.link}`;
        }
        // For Met Museum and others, asset.link should already be the full URL
        
        chrome.tabs.create({ url });
      }
    });

    document.getElementById('settings-btn').addEventListener('click', 
      () => this.openSettings());


    document.getElementById('close-settings').addEventListener('click', 
      () => this.closeSettings());

    this.setupSettingsListeners();

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'updateAsset') {
        this.handleAssetUpdate(message.payload?.newAssetIndex);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.rotateToNextImage();
      }
    });
  }

  setupSettingsListeners() {
    // Handle checkboxes
    const checkboxMap = {
      'turnover-always': NewTabSetting.TURNOVER_ALWAYS
    };

    for (const [elementId, settingKey] of Object.entries(checkboxMap)) {
      const checkbox = document.getElementById(elementId);
      checkbox.checked = this.userSettings[settingKey];
      
      checkbox.addEventListener('change', async (e) => {
        this.userSettings[settingKey] = e.target.checked;
        await Settings.writeUserSetting(settingKey, e.target.checked);
        
        this.applyUserSettings();
        
        chrome.runtime.sendMessage({
          type: 'userSettingsUpdate',
          payload: { key: settingKey, value: e.target.checked }
        });
      });
    }

    // Handle art provider selection
    const providerSelect = document.getElementById('art-provider');
    providerSelect.value = this.userSettings[NewTabSetting.ART_PROVIDER];
    
    providerSelect.addEventListener('change', async (e) => {
      const newProvider = e.target.value;
      this.userSettings[NewTabSetting.ART_PROVIDER] = newProvider;
      await Settings.writeUserSetting(NewTabSetting.ART_PROVIDER, newProvider);
      
      // Update the provider and reset to first asset
      await ArtProviders.setCurrentProvider(newProvider);
      this.currentAssetIndex = 0;
      await Settings.writeCurrentAssetIndex(0);
      
      // Sync data first, then get count (avoid parallel calls)
      await AssetData.syncData();
      this.totalAssets = await AssetData.syncedAssetCount();
      console.log(`Provider switched to ${newProvider}, ${this.totalAssets} assets available`);
      if (this.totalAssets > 0) {
        await this.displayCurrentImage();
      } else {
        // Show loading while we wait for the first asset to be fetched
        this.showLoading();
        
        // Wait for at least one asset to be available
        const checkAssets = async () => {
          const count = await AssetData.syncedAssetCount();
          if (count > 0) {
            this.totalAssets = count;
            await this.displayCurrentImage();
            this.hideLoading();
          } else {
            setTimeout(checkAssets, 1000); // Check again in 1 second
          }
        };
        checkAssets();
      }
      
      chrome.runtime.sendMessage({
        type: 'userSettingsUpdate',
        payload: { key: NewTabSetting.ART_PROVIDER, value: newProvider }
      });
    });
  }

  openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
  }

  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
  }

  async handleAssetUpdate(newAssetIndex) {
    if (newAssetIndex !== undefined) {
      this.currentAssetIndex = newAssetIndex;
    } else {
      this.currentAssetIndex = await Settings.getCurrentAssetIndex();
    }
    await this.displayCurrentImage();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NewTabPage();
});