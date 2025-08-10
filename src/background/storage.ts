import { StorageKey, CacheKey, ProviderName } from '../types'

// Type declaration for Firefox's browser API
declare const browser: typeof chrome | undefined

export class ExtensionStorage {
  static async writeData(
    key: StorageKey | CacheKey,
    data: string,
  ): Promise<void> {
    try {
      // Use browser.storage if available (Firefox), fallback to chrome.storage
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage
      await storage.local.set({ [key]: data })
    } catch (error) {
      console.error(`Error writing storage key ${key}:`, error)
      throw error
    }
  }

  static async readData(key: StorageKey | CacheKey): Promise<string | null> {
    try {
      // Use browser.storage if available (Firefox), fallback to chrome.storage
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage
      const result = await storage.local.get([key])

      return result && typeof result === 'object' && result[key] !== undefined
        ? result[key]
        : null
    } catch (error) {
      console.error(`Error reading storage key ${key}:`, error)
      return null
    }
  }

  static async removeData(key: StorageKey | CacheKey): Promise<void> {
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage
    await storage.local.remove(key)
  }

  static async clear(): Promise<void> {
    const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage
    await storage.local.clear()
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
