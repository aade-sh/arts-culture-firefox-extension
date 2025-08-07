// Storage keys
export const STORAGE_KEYS = {
  ART_STATE: 'art_state',
  CACHED_IMAGES: 'cached_images',
  GOOGLE_ARTS_DATA: 'google_arts_data',
  MET_MUSEUM_DATA: 'met_museum_data',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

// Cache key types
export type CacheKeyType = 'timestamp' | 'assets' | 'ids' | 'data'
export type CacheKey = `${ProviderName}:cache:${CacheKeyType}`

// Helper function to create cache keys
export const createCacheKey = (provider: ProviderName, type: CacheKeyType): CacheKey => {
  return `${provider}:cache:${type}`
}

// Providers
export const PROVIDERS = {
  GOOGLE_ARTS: 'google-arts',
  MET_MUSEUM: 'met-museum',
} as const

export type ProviderName = typeof PROVIDERS[keyof typeof PROVIDERS]

export const DEFAULT_PROVIDER: ProviderName = PROVIDERS.GOOGLE_ARTS

export interface ArtAsset {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: string
  isImageCached(): Promise<boolean>
  getDisplayImageUrl(): Promise<string | null>
  getProcessedImageUrl(): string
  getDetailsUrl(): string
  toJSON(): object
  isValid(): boolean
}

export interface UserSettings {
  ART_PROVIDER?: ProviderName
  TURNOVER_ALWAYS?: boolean
}

export type UserSettingUpdate = 
  | { key: 'turnoverAlways'; value: boolean }
  | { key: 'artProvider'; value: ProviderName }

export interface ArtState {
  currentAssetIndex: number
  totalAssets: number
  currentAsset: ArtAsset | null
  userSettings: UserSettings
  imageUrl: string | null
  loading: boolean
  error: string | null
}

export interface ExtensionMessage {
  type: string
  payload?: {
    currentAssetIndex?: number
    newAssetIndex?: number
    setting?: UserSettingUpdate
  }
}

export interface ArtProvider {
  name: string
  displayName: string
  syncData(): Promise<boolean>
  getAsset(index: number): Promise<ArtAsset | null>
  syncedAssetCount(): Promise<number>
  getDisplayImageUrl(assetId: number): Promise<string | null>
  getDetailsUrl(asset: ArtAsset): string
  loadImage(assetId: number): Promise<boolean>
}

export interface ArtManager {
  getUserSettings(): Promise<UserSettings>
  syncData(): Promise<boolean>
  syncedAssetCount(): Promise<number>
  getCurrentIndex(): Promise<number>
  setCurrentIndex(index: number): Promise<void>
  getAsset(index: number): Promise<ArtAsset | null>
  loadImage(index: number): Promise<boolean>
  getDisplayImageUrl(index: number): Promise<string | null>
  getDetailsUrl(index: number): Promise<string | null>
  setCurrentProvider(provider: string): Promise<void>
  setTurnoverAlways(value: boolean): Promise<void>
  setUserSetting(setting: UserSettingUpdate): Promise<void>
}

// Global declarations
declare global {
  interface Window {
    ArtManager: {
      instance: ArtManager
    }
    NewTabSetting: {
      ART_PROVIDER: string
      TURNOVER_ALWAYS: string
    }
  }
}

export {}
