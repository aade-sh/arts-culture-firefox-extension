import {
  UserSettings,
  DEFAULT_PROVIDER,
  ProviderName,
  PROVIDER_LABELS,
  ENABLED_PROVIDER_NAMES,
} from '../types'
import { TargetedEvent } from 'preact/compat'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userSettings: UserSettings
  onProviderChange: (provider: ProviderName) => Promise<void>
  onTurnoverAlwaysChange: (enabled: boolean) => Promise<void>
}

export function SettingsModal({
  isOpen,
  onClose,
  userSettings,
  onProviderChange,
  onTurnoverAlwaysChange,
}: SettingsModalProps) {
  if (!isOpen) return null

  const providerOptions = ENABLED_PROVIDER_NAMES.map((providerName) => [
    providerName,
    PROVIDER_LABELS[providerName],
  ] as const)

  const handleProviderChange = async (
    e: TargetedEvent<HTMLSelectElement, Event>,
  ) => {
    const newProvider = e.currentTarget.value as ProviderName
    await onProviderChange(newProvider)
  }

  const handleTurnoverAlwaysChange = async (
    e: TargetedEvent<HTMLInputElement, Event>,
  ) => {
    const enabled = e.currentTarget.checked
    await onTurnoverAlwaysChange(enabled)
  }

  return (
    <div id="settings-modal" className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Settings</h2>
          <button id="close-settings" className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="setting-item">
            <label htmlFor="art-provider">Art Provider</label>
            <select
              id="art-provider"
              value={userSettings?.ART_PROVIDER || DEFAULT_PROVIDER}
              onChange={handleProviderChange}
            >
              {providerOptions.map(([providerName, providerLabel]) => (
                <option key={providerName} value={providerName}>
                  {providerLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-item">
            <label htmlFor="turnover-always">
              Refresh artwork on every new tab
            </label>
            <input
              id="turnover-always"
              type="checkbox"
              checked={Boolean(userSettings?.TURNOVER_ALWAYS)}
              onChange={handleTurnoverAlwaysChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
