// Options page functionality
class OptionsPage {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Load current settings
      await this.loadSettings();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Options page initialized');
    } catch (error) {
      console.error('Failed to initialize options page:', error);
    }
  }

  async loadSettings() {
    const settings = await Settings.getUserSettings();
    
    // Update checkboxes to reflect current settings
    document.getElementById('turnover-always').checked = settings[NewTabSetting.TURNOVER_ALWAYS];
  }

  setupEventListeners() {
    const settingsMap = {
      'turnover-always': NewTabSetting.TURNOVER_ALWAYS
    };

    // Setup checkbox listeners
    for (const [elementId, settingKey] of Object.entries(settingsMap)) {
      const checkbox = document.getElementById(elementId);
      const settingItem = checkbox.closest('.setting-item');
      
      checkbox.addEventListener('change', async (e) => {
        try {
          // Save the setting
          await Settings.writeUserSetting(settingKey, e.target.checked);
          
          // Visual feedback
          settingItem.classList.add('changed');
          setTimeout(() => settingItem.classList.remove('changed'), 800);
          
          // Show status message
          this.showStatus('Settings saved successfully');
          
          // Notify background script
          chrome.runtime.sendMessage({
            type: 'userSettingsUpdate',
            payload: { key: settingKey, value: e.target.checked }
          });
          
          console.log(`Updated setting ${settingKey} to ${e.target.checked}`);
        } catch (error) {
          console.error(`Failed to update setting ${settingKey}:`, error);
          this.showStatus('Failed to save settings', true);
          
          // Revert checkbox state on error
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
    
    // Hide after 3 seconds
    setTimeout(() => {
      statusElement.classList.remove('show');
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});