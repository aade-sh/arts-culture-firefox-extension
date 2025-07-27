// Metropolitan Museum of Art Provider
class MetMuseumProvider extends ArtProvider {
  constructor() {
    super('met-museum', 'Metropolitan Museum of Art');
    this.syncedAssetData = [];
    this.BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
    this.CACHE_OPTIONS = { ignoreMethod: true, ignoreSearch: true, ignoreVary: true };
    this.DATA_REQUEST_OPTIONS = { method: 'GET', headers: { Accept: 'application/json' } };
    this.IMAGE_REQUEST_OPTIONS = { method: 'GET', headers: { Accept: 'image/*' } };
    this.isSyncing = false; // Prevent concurrent sync operations
  }

  async syncData() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping duplicate call');
      return true;
    }

    if (this.syncedAssetData.length > 0) {
      console.log('✅ Data already synced, skipping');
      return true;
    }

    try {
      this.isSyncing = true;
      console.log('🔄 Met Museum syncData() called');
      console.log('📍 Stack trace:', new Error().stack);
      
      const cachedTimestamp = await ExtensionStorage.readData(`${this.name}_cache_timestamp`, true);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (cachedTimestamp && cachedTimestamp !== '' && (now - parseInt(cachedTimestamp)) < oneDay) {
        const cachedData = await ExtensionStorage.readData(`${this.name}_cached_asset_data`, true);
        if (cachedData && cachedData !== '') {
          try {
            this.syncedAssetData = JSON.parse(cachedData);
            return true;
          } catch (error) {
            // Cache parsing failed, will fetch fresh
          }
        }
      }
      const searchResponse = await fetch(`${this.BASE_URL}/search?hasImages=true&isHighlight=true&q=painting`, this.DATA_REQUEST_OPTIONS);
      
      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      this.allAvailableIds = searchData.objectIDs || [];
      
      // Fetch detailed metadata for each object to create our asset list
      const assets = [];
      const initialBatch = 10; // Start with 10 to avoid rate limits
      
      for (let i = 0; i < Math.min(this.allAvailableIds.length, initialBatch); i++) {
        try {
          console.log(`🌐 Fetching Met Museum object ${i + 1}/${initialBatch}: ${this.allAvailableIds[i]}`);
          const response = await fetch(`${this.BASE_URL}/objects/${this.allAvailableIds[i]}`, this.DATA_REQUEST_OPTIONS);
          
          if (response.ok) {
            const asset = await response.json();
            if (asset.primaryImage && asset.isPublicDomain) {
              assets.push(this.normalizeAsset(asset));
            }
          } else {
            if (response.status === 403) {
              console.warn('❌ Hit rate limit, stopping early');
              break;
            }
          }
          
          // Longer delay to respect rate limits
          if (i < Math.min(this.allAvailableIds.length, initialBatch) - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        } catch (error) {
          // Silently continue on individual fetch errors
        }
      }
      
      this.syncedAssetData = assets;
      
      await ExtensionStorage.writeData(`${this.name}_cached_asset_data`, JSON.stringify(this.syncedAssetData), true);
      await ExtensionStorage.writeData(`${this.name}_cache_timestamp`, now.toString(), true);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to sync Met Museum data:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  async fetchMoreAssets() {
    if (!this.allAvailableIds || this.syncedAssetData.length >= this.allAvailableIds.length) {
      console.log('📈 No more assets available to fetch');
      return false;
    }

    try {
      const startIndex = this.syncedAssetData.length;
      const batchSize = 5; // Smaller batch for expansion
      const endIndex = Math.min(startIndex + batchSize, this.allAvailableIds.length);
      
      console.log(`📈 Fetching more assets: ${startIndex + 1}-${endIndex} of ${this.allAvailableIds.length}`);

      for (let i = startIndex; i < endIndex; i++) {
        try {
          const response = await fetch(`${this.BASE_URL}/objects/${this.allAvailableIds[i]}`, this.DATA_REQUEST_OPTIONS);
          
          if (response.ok) {
            const asset = await response.json();
            if (asset.primaryImage && asset.isPublicDomain) {
              this.syncedAssetData.push(this.normalizeAsset(asset));
            }
          } else if (response.status === 403) {
            console.warn('❌ Hit rate limit while expanding, stopping');
            break;
          }
          
          // Delay between requests
          if (i < endIndex - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          // Continue on individual errors
        }
      }

      // Update cache with new assets
      await ExtensionStorage.writeData(`${this.name}_cached_asset_data`, JSON.stringify(this.syncedAssetData), true);
      
      console.log(`📈 Now have ${this.syncedAssetData.length} total assets`);
      return true;
    } catch (error) {
      console.error('❌ Failed to fetch more assets:', error);
      return false;
    }
  }

  async syncedAssetCount() {
    console.log('📊 syncedAssetCount() called, current length:', this.syncedAssetData.length);
    if (this.syncedAssetData.length === 0) {
      console.log('📊 No assets, calling syncData from syncedAssetCount');
      await this.syncData();
    }
    return this.syncedAssetData.length;
  }

  async getAsset(index) {
    console.log('🎨 getAsset() called for index:', index, 'current length:', this.syncedAssetData.length);
    if (this.syncedAssetData.length === 0) {
      console.log('🎨 No assets, calling syncData from getAsset');
      await this.syncData();
    }
    
    // If we're getting close to the end (within 3 assets), try to fetch more
    if (index >= this.syncedAssetData.length - 3) {
      console.log('📈 Near end of assets, attempting to fetch more');
      this.fetchMoreAssets(); // Don't await - let it happen in background
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

      const imageUrl = asset.originalImage;
      
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
      console.error(`Failed to load Met Museum image ${assetId}:`, error);
      return false;
    }
  }

  getImageUrl(assetId) {
    if (assetId < 0 || assetId >= this.syncedAssetData.length) {
      return null;
    }
    
    const asset = this.syncedAssetData[assetId];
    return asset.data_url || asset.originalImage;
  }

  normalizeAsset(rawAsset) {
    const artist = rawAsset.artistDisplayName || 
                  (rawAsset.constituents && rawAsset.constituents[0]?.name) || 
                  'Unknown Artist';
    
    const attribution = [
      rawAsset.culture,
      rawAsset.period,
      rawAsset.dynasty,
      rawAsset.reign
    ].filter(Boolean).join(', ') || rawAsset.creditLine || '';

    return {
      id: rawAsset.objectID?.toString() || Math.random().toString(36),
      title: rawAsset.title || 'Untitled',
      creator: artist,
      attribution: attribution,
      image: rawAsset.primaryImage,
      originalImage: rawAsset.primaryImage,
      link: rawAsset.objectURL,
      provider: this.name,
      data_url: null
    };
  }
}