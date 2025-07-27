class AssetData {
  static CACHE_OPTIONS = { ignoreMethod: true, ignoreSearch: true, ignoreVary: true };
  static DATA_REQUEST_OPTIONS = { method: 'GET', headers: { Accept: 'application/json' } };
  static IMAGE_REQUEST_OPTIONS = { method: 'GET', headers: { Accept: 'image/*' } };
  static JSON_DATA_URL = 'https://www.gstatic.com/culturalinstitute/tabext/imax_2_2.json';
  
  static syncedAssetData = [];

  static async syncData() {
    try {
      console.log('Syncing asset data...');
      
      const cachedTimestamp = await ExtensionStorage.readData('json_cache_timestamp', true);
      console.log('Cached timestamp:', cachedTimestamp);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (cachedTimestamp && cachedTimestamp !== '' && (now - parseInt(cachedTimestamp)) < oneDay) {
        const cachedData = await ExtensionStorage.readData('cached_asset_data', true);
        if (cachedData && cachedData !== '') {
          try {
            this.syncedAssetData = JSON.parse(cachedData);
            console.log(`Loaded ${this.syncedAssetData.length} cached assets`);
            return true;
          } catch (error) {
            console.log('Failed to parse cached data, fetching fresh data');
          }
        }
      }

      console.log('Fetching fresh data from:', this.JSON_DATA_URL);
      const response = await fetch(this.JSON_DATA_URL, {
        ...this.DATA_REQUEST_OPTIONS,
        mode: 'cors'
      });
      
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched data entries:', data.length);
      this.syncedAssetData = data;
      
      await ExtensionStorage.writeData('cached_asset_data', JSON.stringify(data), true);
      await ExtensionStorage.writeData('json_cache_timestamp', now.toString(), true);
      
      console.log(`Synced ${this.syncedAssetData.length} assets`);
      return true;
    } catch (error) {
      console.error('Failed to sync asset data:', error);
      return false;
    }
  }

  static async syncedAssetCount() {
    if (this.syncedAssetData.length === 0) {
      await this.syncData();
    }
    return this.syncedAssetData.length;
  }

  static async getAsset(index) {
    if (this.syncedAssetData.length === 0) {
      await this.syncData();
    }
    
    if (index < 0 || index >= this.syncedAssetData.length) {
      console.error(`Asset index ${index} is out of range`);
      return null;
    }
    
    return this.syncedAssetData[index];
  }

  static async loadImage(imageId) {
    try {
      const asset = await this.getAsset(imageId);
      if (!asset) return false;

      const imageUrl = asset.image + '=s1920-rw';
      
      const cache = await caches.open('gac-images');
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
      
      this.syncedAssetData[imageId].data_url = dataUrl;
      
      return true;
    } catch (error) {
      console.error(`Failed to load image ${imageId}:`, error);
      return false;
    }
  }

  static blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static getImageUrl(imageId) {
    if (imageId < 0 || imageId >= this.syncedAssetData.length) {
      return null;
    }
    
    const asset = this.syncedAssetData[imageId];
    return asset.data_url || asset.image + '=s1920-rw';
  }
}