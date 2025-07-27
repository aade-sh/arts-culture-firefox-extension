// Base Art Provider Class
class ArtProvider {
  constructor(name, displayName) {
    this.name = name;
    this.displayName = displayName;
    this.DATA_REQUEST_OPTIONS = { method: 'GET', headers: { Accept: 'application/json' } };
    this.cache = Cache;
  }

  async syncData() {
    throw new Error('syncData must be implemented by subclass');
  }

  async getAsset(index) {
    throw new Error('getAsset must be implemented by subclass');
  }

  async syncedAssetCount() {
    throw new Error('syncedAssetCount must be implemented by subclass');
  }

  async getDisplayImageUrl(assetId) {
    throw new Error('getDisplayImageUrl must be implemented by subclass');
  }

  getDetailsUrl(asset) {
    throw new Error('getDetailsUrl must be implemented by subclass');
  }

  async getCachedData(key) {
    return await this.cache.getCachedData(this.name, key);
  }

  async setCachedData(key, data) {
    return await this.cache.setCachedData(this.name, key, data);
  }

  async loadImage(assetId) {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) return false;

      // Use the asset's processed image URL for caching
      const imageUrl = asset.getProcessedImageUrl();
      
      // Just cache the image - no need to store base64 data in asset
      await this.cache.loadAndCacheImage(this.name, imageUrl);
      
      return true;
    } catch (error) {
      console.error(`Failed to load ${this.name} image ${assetId}:`, error);
      return false;
    }
  }
}