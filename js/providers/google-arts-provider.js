// Google Arts & Culture Provider
class GoogleArtsProvider extends ArtProvider {
  constructor() {
    super('google-arts', 'Google Arts & Culture');
    this.syncedAssetData = [];
    this.JSON_DATA_URL = 'https://www.gstatic.com/culturalinstitute/tabext/imax_2_2.json';
  }

  async syncData() {
    try {
      // Try cached data first
      const cachedData = await this.getCachedData('assets');
      if (cachedData) {
        this.syncedAssetData = cachedData.map(json => GoogleArtsAsset.fromJSON(json));
        return true;
      }

      const response = await fetch(this.JSON_DATA_URL, {
        ...this.DATA_REQUEST_OPTIONS,
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.syncedAssetData = data
        .map(rawAsset => GoogleArtsAsset.fromApiResponse(rawAsset))
        .filter(asset => asset.isValid());
      
      // Cache as plain objects
      await this.setCachedData('assets', this.syncedAssetData.map(asset => asset.toJSON()));
      
      return true;
    } catch (error) {
      console.error('Failed to sync Google Arts data:', error);
      return false;
    }
  }

  async syncedAssetCount() {
    if (this.syncedAssetData.length === 0) {
      await this.syncData();
    }
    return this.syncedAssetData.length;
  }

  async getAsset(index) {
    if (this.syncedAssetData.length === 0) {
      await this.syncData();
    }
    
    if (index < 0 || index >= this.syncedAssetData.length) {
      console.error(`Asset index ${index} is out of range`);
      return null;
    }
    
    return this.syncedAssetData[index];
  }

  async getDisplayImageUrl(assetId) {
    if (assetId < 0 || assetId >= this.syncedAssetData.length) {
      return null;
    }
    
    const asset = this.syncedAssetData[assetId];
    return await asset.getDisplayImageUrl();
  }

  getDetailsUrl(asset) {
    return asset.getDetailsUrl();
  }
}