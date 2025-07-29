import { h } from 'preact';
import { UserSettings } from '../types';
import { TargetedEvent } from 'preact/compat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onProviderChange: (provider: string) => Promise<void>;
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  userSettings, 
  onProviderChange, 
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleProviderChange = async (e: TargetedEvent<HTMLSelectElement, Event>) => {
    const newProvider = e.currentTarget.value;
    await onProviderChange(newProvider);
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
        </div>
      </div>
    </div>
  );
}