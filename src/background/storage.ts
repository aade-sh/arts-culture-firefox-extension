export class ExtensionStorage {
  static async writeData(key: string, data: string): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: data })
    } catch (error) {
      console.error(`Error writing storage key ${key}:`, error)
      throw error
    }
  }

  static async readData(key: string): Promise<string | null> {
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

  static async removeData(key: string, local: boolean = true): Promise<void> {
    await chrome.storage.local.remove(key)
  }

  static async clear(local: boolean = true): Promise<void> {
    await chrome.storage.local.clear()
  }

  static async writeValue(key: string, value: any): Promise<void> {
    return this.writeData(key, value)
  }

  static async readValue(key: string, defaultValue: any = null): Promise<any> {
    const result = await this.readData(key)
    return result !== null ? result : defaultValue
  }
}
