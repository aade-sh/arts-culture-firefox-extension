// Unified Art Manager - replaces AssetData + ArtProviderManager
class ArtManager {
  constructor() {
    this.providers = new Map();
    this.currentProvider = null;
    this.state = {
      provider: 'google-arts',
      currentIndex: 0,
      turnoverAlways: false,
      lastUpdated: Date.now()
    };
    
    // Register providers
    this.registerProvider(new GoogleArtsProvider());
    this.registerProvider(new MetMuseumProvider());
  }

  registerProvider(provider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name) {
    return this.providers.get(name);
  }

  getAllProviders() {
    return Array.from(this.providers.values());
  }

  async loadState() {
    try {
      const stored = await ExtensionStorage.readData('art_state', true);
      if (stored) {
        this.state = { ...this.state, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load state, using defaults:', error);
    }
  }

  async saveState() {
    this.state.lastUpdated = Date.now();
    await ExtensionStorage.writeData('art_state', JSON.stringify(this.state), true);
  }

  async getCurrentProvider() {
    if (!this.currentProvider) {
      await this.loadState();
      this.currentProvider = this.getProvider(this.state.provider);
      
      if (!this.currentProvider) {
        console.warn(`Provider ${this.state.provider} not found, using google-arts`);
        this.currentProvider = this.getProvider('google-arts');
        this.state.provider = 'google-arts';
        await this.saveState();
      }
    }
    
    return this.currentProvider;
  }

  async setCurrentProvider(providerName) {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    this.currentProvider = provider;
    this.state.provider = providerName;
    this.state.currentIndex = 0; // Reset index when switching providers
    await this.saveState();
    
    return provider;
  }

  async syncData() {
    const provider = await this.getCurrentProvider();
    return provider.syncData();
  }

  async getAsset(index) {
    const provider = await this.getCurrentProvider();
    return provider.getAsset(index);
  }

  async loadImage(assetId) {
    const provider = await this.getCurrentProvider();
    return provider.loadImage(assetId);
  }

  async syncedAssetCount() {
    const provider = await this.getCurrentProvider();
    return provider.syncedAssetCount();
  }

  async getDisplayImageUrl(assetId) {
    if (!this.currentProvider) return null;
    return await this.currentProvider.getDisplayImageUrl(assetId);
  }

  async getDetailsUrl(assetId) {
    const provider = await this.getCurrentProvider();
    const asset = await this.getAsset(assetId);
    if (!asset) return null;
    return provider.getDetailsUrl(asset);
  }

  // State management
  async getCurrentIndex() {
    await this.loadState();
    return this.state.currentIndex;
  }

  async setCurrentIndex(index) {
    this.state.currentIndex = index;
    await this.saveState();
  }

  async getTurnoverAlways() {
    await this.loadState();
    return this.state.turnoverAlways;
  }

  async setTurnoverAlways(value) {
    this.state.turnoverAlways = value;
    await this.saveState();
  }

  async getUserSettings() {
    await this.loadState();
    return {
      turnoverAlways: this.state.turnoverAlways,
      artProvider: this.state.provider,
    };
  }

  async setUserSetting(key, value) {
    if (key === 'turnoverAlways') {
      await this.setTurnoverAlways(value);
    } else if (key === 'artProvider') {
      await this.setCurrentProvider(value);
    }
  }

}

// Global instance
ArtManager.instance = new ArtManager();