import { ExtensionStorage } from './storage'
import { createCacheKey, ProviderName, CacheKeyType } from '../types'

export class CacheManager {
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

  async getCacheTimestamp(namespace: ProviderName): Promise<number | null> {
    const timestamp = await ExtensionStorage.readData(
      createCacheKey(namespace, 'timestamp'),
    )
    return timestamp ? parseInt(timestamp, 10) : null
  }

  async setCacheTimestamp(namespace: ProviderName): Promise<number> {
    const now = Date.now()
    await ExtensionStorage.writeData(
      createCacheKey(namespace, 'timestamp'),
      now.toString(),
    )
    return now
  }

  async isCacheValid(namespace: ProviderName): Promise<boolean> {
    const timestamp = await this.getCacheTimestamp(namespace)
    if (!timestamp) return false
    return Date.now() - timestamp < this.CACHE_EXPIRY
  }

  async getCachedData<T = unknown>(
    namespace: ProviderName,
    key: CacheKeyType,
  ): Promise<T | null> {
    if (!(await this.isCacheValid(namespace))) return null

    const data = await ExtensionStorage.readData(createCacheKey(namespace, key))
    if (!data) return null

    try {
      return JSON.parse(data)
    } catch (error) {
      console.warn(`Failed to parse cached ${key} for ${namespace}:`, error)
      return null
    }
  }

  async setCachedData<T = unknown>(
    namespace: ProviderName,
    key: CacheKeyType,
    data: T,
  ): Promise<void> {
    await ExtensionStorage.writeData(
      createCacheKey(namespace, key),
      JSON.stringify(data),
    )
    await this.setCacheTimestamp(namespace)
  }

  async clearCache(namespace: ProviderName): Promise<void> {
    const commonKeys: CacheKeyType[] = ['timestamp', 'assets', 'ids', 'data']

    for (const key of commonKeys) {
      await ExtensionStorage.removeData(createCacheKey(namespace, key))
    }
  }

  async getImageCache(namespace: string): Promise<Cache> {
    return await caches.open(`${namespace}-images`)
  }

  async getCachedImage(
    namespace: string,
    imageUrl: string,
  ): Promise<Response | undefined> {
    const cache = await this.getImageCache(namespace)
    return await cache.match(imageUrl)
  }

  async setCachedImage(
    namespace: string,
    imageUrl: string,
    response: Response,
  ): Promise<Response> {
    const cache = await this.getImageCache(namespace)
    await cache.put(imageUrl, response.clone())
    return response
  }

  async clearImageCache(namespace: string): Promise<boolean> {
    return await caches.delete(`${namespace}-images`)
  }

  blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async loadAndCacheImage(
    namespace: string,
    imageUrl: string,
    requestOptions: RequestInit = {},
  ): Promise<string> {
    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: { Accept: 'image/*' },
    }

    try {
      let cachedResponse = await this.getCachedImage(namespace, imageUrl)

      if (!cachedResponse) {
        const fetchResponse = await fetch(imageUrl, {
          ...defaultOptions,
          ...requestOptions,
        })
        if (!fetchResponse.ok) {
          throw new Error(`Failed to fetch image: ${fetchResponse.status}`)
        }

        cachedResponse = await this.setCachedImage(
          namespace,
          imageUrl,
          fetchResponse,
        )
      }

      const blob = await cachedResponse.blob()
      return await this.blobToDataUrl(blob)
    } catch (error) {
      console.error(`Failed to load image from ${imageUrl}:`, error)
      throw error
    }
  }
}

export const Cache = new CacheManager()
