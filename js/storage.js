class ExtensionStorage {
  static async writeData(key, data) {
    try {
      await chrome.storage.local.set({[key]: data});

    } catch (error) {
      console.error(`Error writing storage key ${key}:`, error);
      throw error;
    }
  }

  static async readData(key) {
    try {
      const result = await chrome.storage.local.get([key]);

      return result && typeof result === 'object' && result[key] !== undefined ? result[key] : null;
    } catch (error) {
      console.error(`Error reading storage key ${key}:`, error);
      return null;
    }
  }

  static async removeData(key, local = true) {
    await chrome.storage.local.remove(key);
  }

  static async clear(local = true) {
    await chrome.storage.local.clear();
  }

  // New utility methods for direct value storage (no JSON serialization needed)
  static async writeValue(key, value) {
    return this.writeData(key, value);
  }

  static async readValue(key, defaultValue = null) {
    const result = await this.readData(key);
    return result !== null ? result : defaultValue;
  }
}