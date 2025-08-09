import { StorageKey, CacheKey, ProviderName } from '../types'

export class ExtensionStorage {
  static async writeData(
    key: StorageKey | CacheKey,
    data: string,
  ): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: data })
    } catch (error) {
      console.error(`Error writing storage key ${key}:`, error)
      throw error
    }
  }

  static async readData(key: StorageKey | CacheKey): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get([key])

      return result && typeof result === 'object' && result[key] !== undefined
        ? result[key]
        : null
    } catch (error) {
      console.error(`Error reading storage key ${key}:`, error)
      return null
    }
  }

  static async removeData(key: StorageKey | CacheKey): Promise<void> {
    await chrome.storage.local.remove(key)
  }

  static async clear(): Promise<void> {
    await chrome.storage.local.clear()
  }

  static async getImageCache(namespace: ProviderName): Promise<Cache> {
    return await caches.open(`${namespace}-images`)
  }

  static async getCachedImage(
    namespace: ProviderName,
    imageUrl: string,
  ): Promise<Response | undefined> {
    const cache = await this.getImageCache(namespace)
    return await cache.match(imageUrl)
  }

  static async setCachedImage(
    namespace: ProviderName,
    imageUrl: string,
    response: Response,
  ): Promise<void> {
    const cache = await this.getImageCache(namespace)
    await cache.put(imageUrl, response.clone())
  }

  static async clearImageCache(namespace: ProviderName): Promise<boolean> {
    return await caches.delete(`${namespace}-images`)
  }
}
