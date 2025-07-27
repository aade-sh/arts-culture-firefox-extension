// Storage utility functions
class ExtensionStorage {
  static async writeData(key, data, local = false) {
    try {
      const storageArea = local ? chrome.storage.local : chrome.storage.sync;
      await storageArea.set({[key]: data});
      console.log(`Storage write - key: ${key}, local: ${local}, data length: ${typeof data === 'string' ? data.length : 'N/A'}`);
    } catch (error) {
      console.error(`Error writing storage key ${key}:`, error);
      throw error;
    }
  }

  static async readData(key, local = false) {
    try {
      const storageArea = local ? chrome.storage.local : chrome.storage.sync;
      const result = await storageArea.get([key]);
      console.log(`Storage read - key: ${key}, local: ${local}, result:`, result);
      return result && typeof result === 'object' && result[key] !== undefined ? result[key] : '';
    } catch (error) {
      console.error(`Error reading storage key ${key}:`, error);
      return '';
    }
  }

  static async removeData(key, local = false) {
    const storageArea = local ? chrome.storage.local : chrome.storage.sync;
    await storageArea.remove(key);
  }

  static async clear(local = false) {
    const storageArea = local ? chrome.storage.local : chrome.storage.sync;
    await storageArea.clear();
  }
}