import type { ArtAssetJson } from '../models/json-data'
import type { ProviderName, UserSettings } from './index'

export const RuntimeMessageType = {
  INITIALIZE_ART: 'initializeArt',
  INITIALIZE_ART_RESPONSE: 'initializeArtResponse',
  ROTATE_TO_NEXT: 'rotateToNext',
  SWITCH_PROVIDER: 'switchProvider',
  SET_TURNOVER_ALWAYS: 'setTurnoverAlways',
  ART_UPDATED: 'artUpdated',
  SETTINGS_UPDATED: 'settingsUpdated',
} as const

export type ExtensionMessage =
  | { type: typeof RuntimeMessageType.INITIALIZE_ART }
  | { type: typeof RuntimeMessageType.ROTATE_TO_NEXT }
  | { type: typeof RuntimeMessageType.SWITCH_PROVIDER; provider: ProviderName }
  | {
      type: typeof RuntimeMessageType.SET_TURNOVER_ALWAYS
      turnoverAlwaysEnabled: boolean
    }

export interface InitializeArtResponseMessage {
  type: typeof RuntimeMessageType.INITIALIZE_ART_RESPONSE
  data: {
    error?: string
    asset?: ArtAssetJson
    imageUrl?: string | null
    totalAssets?: number
    currentIndex?: number
    userSettings?: UserSettings
  }
}

export interface ArtUpdatedMessage {
  type: typeof RuntimeMessageType.ART_UPDATED
  asset: ArtAssetJson
  imageUrl: string | null
  totalAssets: number
  currentIndex: number
  userSettings: UserSettings
}

export interface SettingsUpdatedMessage {
  type: typeof RuntimeMessageType.SETTINGS_UPDATED
  userSettings: UserSettings
}

export type RuntimeMessage =
  | InitializeArtResponseMessage
  | ArtUpdatedMessage
  | SettingsUpdatedMessage
