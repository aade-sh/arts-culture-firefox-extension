class OptionsPage {
  constructor() {
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      
      this.setupEventListeners();
      
      console.log('Options page initialized');
    } catch (error) {
      console.error('Failed to initialize options page:', error);
    }
  }

  async loadSettings() {
    const settings = await Settings.getUserSettings();
    
    document.getElementById('turnover-always').checked = settings[NewTabSetting.TURNOVER_ALWAYS];
  }

  setupEventListeners() {
    const settingsMap = {
      'turnover-always': NewTabSetting.TURNOVER_ALWAYS
    };

    for (const [elementId, settingKey] of Object.entries(settingsMap)) {
      const checkbox = document.getElementById(elementId);
      const settingItem = checkbox.closest('.setting-item');
      
      checkbox.addEventListener('change', async (e) => {
        try {
          await Settings.writeUserSetting(settingKey, e.target.checked);
          
          settingItem.classList.add('changed');
          setTimeout(() => settingItem.classList.remove('changed'), 800);
          
          this.showStatus('Settings saved successfully');
          
          chrome.runtime.sendMessage({
            type: 'userSettingsUpdate',
            payload: { key: settingKey, value: e.target.checked }
          });
          
          console.log(`Updated setting ${settingKey} to ${e.target.checked}`);
        } catch (error) {
          console.error(`Failed to update setting ${settingKey}:`, error);
          this.showStatus('Failed to save settings', true);
          
          e.target.checked = !e.target.checked;
        }
      });
    }
  }

  showStatus(message, isError = false) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.style.color = isError ? '#dc3545' : '#28a745';
    statusElement.classList.add('show');
    
    setTimeout(() => {
      statusElement.classList.remove('show');
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});