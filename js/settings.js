const NewTabSetting = {
  TURNOVER_ALWAYS: 'turnoverAlways',
  APPS_BUTTON_HIDDEN: 'appsButtonHidden',
  DEFAULT_NEWTAB_BUTTON_HIDDEN: 'defaultNewTabButtonHidden',
  TOP_SITES_BUTTON_HIDDEN: 'topSitesButtonHidden'
};

const DEFAULT_USER_SETTINGS = {
  [NewTabSetting.TURNOVER_ALWAYS]: false,
  [NewTabSetting.APPS_BUTTON_HIDDEN]: false,
  [NewTabSetting.DEFAULT_NEWTAB_BUTTON_HIDDEN]: false,
  [NewTabSetting.TOP_SITES_BUTTON_HIDDEN]: false
};

class Settings {
  static async writeDefaultUserSettings() {
    for (const [key, value] of Object.entries(DEFAULT_USER_SETTINGS)) {
      await ExtensionStorage.writeData(key, JSON.stringify(value));
    }
  }

  static async getUserSettings() {
    const userSettings = { ...DEFAULT_USER_SETTINGS };
    
    for (const key of Object.keys(userSettings)) {
      const storedValue = await ExtensionStorage.readData(key);
      if (storedValue) {
        try {
          userSettings[key] = JSON.parse(storedValue);
        } catch (error) {
          console.error(`Failed to parse setting ${key}:`, error);
        }
      }
    }
    
    return userSettings;
  }

  static async writeUserSetting(key, value) {
    await ExtensionStorage.writeData(key, JSON.stringify(value));
  }

  static getDateStr() {
    return new Date().toISOString();
  }

  static dateStrToNumber(dateStr) {
    const dateNum = Number(dateStr);
    return isNaN(dateNum) ? 0 : Math.floor(dateNum);
  }

  static async writeCurrentAssetIndex(indexToSave) {
    await ExtensionStorage.writeData('indexWriteDate', this.getDateStr(), true);
    await ExtensionStorage.writeData('currentAssetIndex', JSON.stringify(indexToSave), true);
  }

  static async getIndexWriteDate() {
    const storedValue = await ExtensionStorage.readData('indexWriteDate', true);
    if (!storedValue) {
      return this.dateStrToNumber(this.getDateStr());
    }
    
    try {
      const dateStr = JSON.parse(storedValue);
      return this.dateStrToNumber(dateStr);
    } catch (error) {
      return this.dateStrToNumber(this.getDateStr());
    }
  }

  static async getCurrentAssetIndex() {
    const storedValue = await ExtensionStorage.readData('currentAssetIndex', true);
    if (!storedValue) {
      return 0;
    }
    
    try {
      return JSON.parse(storedValue);
    } catch (error) {
      return 0;
    }
  }
}