import { h } from 'preact';
import { UserSettings } from '../types';
import { TargetedEvent } from 'preact/compat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onProviderChange: (provider: string) => Promise<void>;
  onTurnoverChange: (checked: boolean) => Promise<void>;
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  userSettings, 
  onProviderChange, 
  onTurnoverChange 
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleProviderChange = async (e: TargetedEvent<HTMLSelectElement, Event>) => {
    const newProvider = e.currentTarget.value;
    await onProviderChange(newProvider);
  };

  const handleTurnoverChange = async (e: TargetedEvent<HTMLInputElement, Event>) => {
    const checked = e.currentTarget.checked;
    await onTurnoverChange(checked);
    
    chrome.runtime.sendMessage({
      type: 'userSettingsUpdate',
      payload: { key: 'TURNOVER_ALWAYS', value: checked },
    });
  };

  return (
    <div id="settings-modal" className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Settings</h2>
          <button 
            id="close-settings" 
            className="close-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="setting-item">
            <label htmlFor="art-provider">Art Provider</label>
            <select 
              id="art-provider"
              value={userSettings.ART_PROVIDER || 'google-arts'}
              onChange={handleProviderChange}
            >
              <option value="google-arts">Google Arts & Culture</option>
              <option value="met-museum">Metropolitan Museum of Art</option>
            </select>
          </div>
          <div className="setting-item">
            <label htmlFor="turnover-always">
              Always show new artwork on new tab
            </label>
            <input 
              type="checkbox" 
              id="turnover-always"
              checked={userSettings.TURNOVER_ALWAYS || false}
              onChange={handleTurnoverChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}