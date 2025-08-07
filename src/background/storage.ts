import { StorageKey, CacheKey } from '../types'

export class ExtensionStorage {
  static async writeData(key: StorageKey | CacheKey, data: string): Promise<void> {
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

}
