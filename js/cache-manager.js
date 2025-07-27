// Centralized Cache Management
class CacheManager {
  constructor() {
    this.CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Data caching (localStorage)
  async getCacheTimestamp(namespace) {
    return await ExtensionStorage.readData(`${namespace}:cache:timestamp`);
  }

  async setCacheTimestamp(namespace) {
    const now = Date.now();
    await ExtensionStorage.writeData(`${namespace}:cache:timestamp`, now);
    return now;
  }

  async isCacheValid(namespace) {
    const timestamp = await this.getCacheTimestamp(namespace);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.CACHE_EXPIRY;
  }

  async getCachedData(namespace, key) {
    if (!(await this.isCacheValid(namespace))) return null;
    
    const data = await ExtensionStorage.readData(`${namespace}:cache:${key}`);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Failed to parse cached ${key} for ${namespace}:`, error);
      return null;
    }
  }

  async setCachedData(namespace, key, data) {
    await ExtensionStorage.writeData(`${namespace}:cache:${key}`, JSON.stringify(data));
    await this.setCacheTimestamp(namespace);
  }

  async clearCache(namespace) {
    // Clear all cache entries for a namespace
    const keys = [`${namespace}:cache:timestamp`];
    
    // Try common cache keys
    const commonKeys = ['assets', 'ids', 'data'];
    for (const key of commonKeys) {
      keys.push(`${namespace}:cache:${key}`);
    }
    
    for (const key of keys) {
      await ExtensionStorage.removeData(key);
    }
  }

  // Image caching (CacheAPI)
  async getImageCache(namespace) {
    return await caches.open(`${namespace}-images`);
  }

  async getCachedImage(namespace, imageUrl, cacheOptions = {}) {
    const cache = await this.getImageCache(namespace);
    return await cache.match(imageUrl, cacheOptions);
  }

  async setCachedImage(namespace, imageUrl, response, cacheOptions = {}) {
    const cache = await this.getImageCache(namespace);
    await cache.put(imageUrl, response.clone());
    return response;
  }

  async clearImageCache(namespace) {
    await caches.delete(`${namespace}-images`);
  }

  // Utility method for blob to data URL conversion
  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Complete image loading with caching
  async loadAndCacheImage(namespace, imageUrl, requestOptions = {}) {
    const defaultOptions = { 
      method: 'GET', 
      headers: { Accept: 'image/*' } 
    };
    const cacheOptions = { 
      ignoreMethod: true, 
      ignoreSearch: true, 
      ignoreVary: true 
    };

    try {
      // Check cache first
      let cachedResponse = await this.getCachedImage(namespace, imageUrl, cacheOptions);
      
      if (!cachedResponse) {
        // Fetch and cache
        const fetchResponse = await fetch(imageUrl, { ...defaultOptions, ...requestOptions });
        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch image: ${fetchResponse.status}`);
        }
        
        cachedResponse = await this.setCachedImage(namespace, imageUrl, fetchResponse, cacheOptions);
      }

      const blob = await cachedResponse.blob();
      return await this.blobToDataUrl(blob);
    } catch (error) {
      console.error(`Failed to load image from ${imageUrl}:`, error);
      throw error;
    }
  }
}

// Global instance
const Cache = new CacheManager();