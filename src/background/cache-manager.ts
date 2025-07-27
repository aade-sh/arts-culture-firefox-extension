import { ExtensionStorage } from './storage';

export class CacheManager {
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  async getCacheTimestamp(namespace: string): Promise<number | null> {
    const timestamp = await ExtensionStorage.readData(`${namespace}:cache:timestamp`);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  async setCacheTimestamp(namespace: string): Promise<number> {
    const now = Date.now();
    await ExtensionStorage.writeData(`${namespace}:cache:timestamp`, now.toString());
    return now;
  }

  async isCacheValid(namespace: string): Promise<boolean> {
    const timestamp = await this.getCacheTimestamp(namespace);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_EXPIRY;
  }

  async getCachedData(namespace: string, key: string): Promise<any> {
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

  async setCachedData(namespace: string, key: string, data: any): Promise<void> {
    await ExtensionStorage.writeData(
      `${namespace}:cache:${key}`,
      JSON.stringify(data),
    );
    await this.setCacheTimestamp(namespace);
  }

  async clearCache(namespace: string): Promise<void> {
    const keys = [`${namespace}:cache:timestamp`];

    const commonKeys = ['assets', 'ids', 'data'];
    for (const key of commonKeys) {
      keys.push(`${namespace}:cache:${key}`);
    }

    for (const key of keys) {
      await ExtensionStorage.removeData(key);
    }
  }

  async getImageCache(namespace: string): Promise<Cache> {
    return await caches.open(`${namespace}-images`);
  }

  async getCachedImage(namespace: string, imageUrl: string, cacheOptions: CacheQueryOptions = {}): Promise<Response | undefined> {
    const cache = await this.getImageCache(namespace);
    return await cache.match(imageUrl, cacheOptions);
  }

  async setCachedImage(namespace: string, imageUrl: string, response: Response, cacheOptions: CacheQueryOptions = {}): Promise<Response> {
    const cache = await this.getImageCache(namespace);
    await cache.put(imageUrl, response.clone());
    return response;
  }

  async clearImageCache(namespace: string): Promise<boolean> {
    return await caches.delete(`${namespace}-images`);
  }

  blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async loadAndCacheImage(namespace: string, imageUrl: string, requestOptions: RequestInit = {}): Promise<string> {
    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: { Accept: 'image/*' },
    };
    const cacheOptions: CacheQueryOptions = {
      ignoreMethod: true,
      ignoreSearch: true,
      ignoreVary: true,
    };

    try {
      let cachedResponse = await this.getCachedImage(
        namespace,
        imageUrl,
        cacheOptions,
      );

      if (!cachedResponse) {
        const fetchResponse = await fetch(imageUrl, {
          ...defaultOptions,
          ...requestOptions,
        });
        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch image: ${fetchResponse.status}`);
        }

        cachedResponse = await this.setCachedImage(
          namespace,
          imageUrl,
          fetchResponse,
          cacheOptions,
        );
      }

      const blob = await cachedResponse.blob();
      return await this.blobToDataUrl(blob);
    } catch (error) {
      console.error(`Failed to load image from ${imageUrl}:`, error);
      throw error;
    }
  }
}

export const Cache = new CacheManager();