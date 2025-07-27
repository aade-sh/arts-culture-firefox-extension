// Google Arts & Culture Provider
class GoogleArtsProvider extends ArtProvider {
  constructor() {
    super('google-arts', 'Google Arts & Culture');
    this.syncedAssetData = [];
    this.JSON_DATA_URL = 'https://www.gstatic.com/culturalinstitute/tabext/imax_2_2.json';
    this.CACHE_OPTIONS = { ignoreMethod: true, ignoreSearch: true, ignoreVary: true };
    this.DATA_REQUEST_OPTIONS = { method: 'GET', headers: { Accept: 'application/json' } };
    this.IMAGE_REQUEST_OPTIONS = { method: 'GET', headers: { Accept: 'image/*' } };
  }

  async syncData() {
    try {
      console.log('Syncing Google Arts data...');
      
      const cachedTimestamp = await ExtensionStorage.readData(`${this.name}_cache_timestamp`, true);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (cachedTimestamp && cachedTimestamp !== '' && (now - parseInt(cachedTimestamp)) < oneDay) {
        const cachedData = await ExtensionStorage.readData(`${this.name}_cached_asset_data`, true);
        if (cachedData && cachedData !== '') {
          try {
            this.syncedAssetData = JSON.parse(cachedData);
            console.log(`Loaded ${this.syncedAssetData.length} cached Google Arts assets`);
            return true;
          } catch (error) {
            console.log('Failed to parse cached data, fetching fresh data');
          }
        }
      }

      const response = await fetch(this.JSON_DATA_URL, {
        ...this.DATA_REQUEST_OPTIONS,
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.syncedAssetData = data.map(asset => this.normalizeAsset(asset));
      
      await ExtensionStorage.writeData(`${this.name}_cached_asset_data`, JSON.stringify(this.syncedAssetData), true);
      await ExtensionStorage.writeData(`${this.name}_cache_timestamp`, now.toString(), true);
      
      console.log(`Synced ${this.syncedAssetData.length} Google Arts assets`);
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

  async loadImage(assetId) {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) return false;

      const imageUrl = asset.originalImage + '=s1920-rw';
      
      const cache = await caches.open(`${this.name}-images`);
      let cachedResponse = await cache.match(imageUrl, this.CACHE_OPTIONS);
      
      if (!cachedResponse) {
        const fetchResponse = await fetch(imageUrl, this.IMAGE_REQUEST_OPTIONS);
        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch image: ${fetchResponse.status}`);
        }
        
        await cache.put(imageUrl, fetchResponse.clone());
        cachedResponse = fetchResponse;
      }

      const blob = await cachedResponse.blob();
      const dataUrl = await this.blobToDataUrl(blob);
      
      this.syncedAssetData[assetId].data_url = dataUrl;
      
      return true;
    } catch (error) {
      console.error(`Failed to load Google Arts image ${assetId}:`, error);
      return false;
    }
  }

  getImageUrl(assetId) {
    if (assetId < 0 || assetId >= this.syncedAssetData.length) {
      return null;
    }
    
    const asset = this.syncedAssetData[assetId];
    return asset.data_url || asset.originalImage + '=s1920-rw';
  }

  normalizeAsset(rawAsset) {
    return {
      id: rawAsset.id || Math.random().toString(36),
      title: rawAsset.title || 'Untitled',
      creator: rawAsset.creator || 'Unknown Artist',
      attribution: rawAsset.attribution || '',
      image: rawAsset.image + '=s1920-rw',
      originalImage: rawAsset.image,
      link: rawAsset.link,
      provider: this.name,
      data_url: null
    };
  }
}