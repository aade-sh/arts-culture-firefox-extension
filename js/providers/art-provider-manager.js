// Art Provider Manager
class ArtProviderManager {
  constructor() {
    this.providers = new Map();
    this.currentProvider = null;
    
    // Register available providers
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

  async setCurrentProvider(providerName) {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    this.currentProvider = provider;
    await ExtensionStorage.writeData('current_art_provider', providerName, true);
    return provider;
  }

  async getCurrentProvider() {
    if (!this.currentProvider) {
      const savedProvider = await ExtensionStorage.readData('current_art_provider', true);
      const providerName = savedProvider || 'google-arts'; // Default to Google Arts
      this.currentProvider = this.getProvider(providerName);
      
      if (!this.currentProvider) {
        console.error(`Provider ${providerName} not found, falling back to google-arts`);
        this.currentProvider = this.getProvider('google-arts');
      }
    }
    
    return this.currentProvider;
  }

  // Proxy methods to current provider
  async syncData() {
    console.log('🔄 ArtProviderManager.syncData() called');
    console.log('📍 Stack trace:', new Error().stack);
    const provider = await this.getCurrentProvider();
    console.log('🎯 Using provider:', provider.name);
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

  getImageUrl(assetId) {
    if (!this.currentProvider) {
      return null;
    }
    return this.currentProvider.getImageUrl(assetId);
  }

}

// Global instance
const ArtProviders = new ArtProviderManager();