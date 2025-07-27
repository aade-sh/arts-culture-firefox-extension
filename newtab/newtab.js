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

      await AssetData.syncData();
      this.totalAssets = await AssetData.syncedAssetCount();

      this.currentAssetIndex = await Settings.getCurrentAssetIndex();

      if (this.userSettings[NewTabSetting.TURNOVER_ALWAYS]) {
        await this.rotateToNextImage();
      } else {
        await this.displayCurrentImage();
      }

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
      const asset = await AssetData.getAsset(this.currentAssetIndex);
      if (!asset) {
        throw new Error('Asset not found');
      }

      await AssetData.loadImage(this.currentAssetIndex);

      this.updateArtInfo(asset);
      this.updateBackgroundImage(asset);

      let nextIndex = this.currentAssetIndex + 1;
      if (nextIndex >= this.totalAssets) {
        nextIndex = 0;
      }
      AssetData.loadImage(nextIndex);
      
    } catch (error) {
      console.error('Failed to display current image:', error);
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
        chrome.tabs.create({ url: `https://artsandculture.google.com/asset/${asset.link}` });
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
    const settingsMap = {
      'turnover-always': NewTabSetting.TURNOVER_ALWAYS
    };

    for (const [elementId, settingKey] of Object.entries(settingsMap)) {
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