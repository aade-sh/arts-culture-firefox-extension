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
  CLEVELAND_MUSEUM: 'cleveland-museum',
  RIJKSMUSEUM: 'rijksmuseum',
} as const

export type ProviderName = typeof PROVIDERS[keyof typeof PROVIDERS]

export const DEFAULT_PROVIDER: ProviderName = PROVIDERS.GOOGLE_ARTS

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  [PROVIDERS.GOOGLE_ARTS]: 'Google Arts & Culture',
  [PROVIDERS.MET_MUSEUM]: 'Metropolitan Museum of Art',
  [PROVIDERS.CLEVELAND_MUSEUM]: 'Cleveland Museum of Art',
  [PROVIDERS.RIJKSMUSEUM]: 'Rijksmuseum',
}

export const ENABLED_PROVIDER_NAMES: ProviderName[] = [
  PROVIDERS.GOOGLE_ARTS,
  PROVIDERS.MET_MUSEUM,
  PROVIDERS.CLEVELAND_MUSEUM,
  PROVIDERS.RIJKSMUSEUM,
]

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

export interface ArtProvider {
  name: ProviderName
  displayName: string
  syncData(): Promise<boolean>
  getAsset(index: number): Promise<ArtAsset | null>
  syncedAssetCount(): Promise<number>
  findNextValidAssetIndex(startIndex: number, totalAssets: number): Promise<number>
  getDisplayImageUrl(assetId: number): Promise<string | null>
  getDetailsUrl(asset: ArtAsset): string
  loadImage(assetId: number): Promise<boolean>
}

export interface ArtManager {
  getUserSettings(): Promise<UserSettings>
  syncData(): Promise<boolean>
  syncedAssetCount(): Promise<number>
  getCurrentIndex(): Promise<number>
  getLastRotatedAt(): Promise<number>
  setCurrentIndex(index: number): Promise<void>
  getAsset(index: number): Promise<ArtAsset | null>
  findNextValidAssetIndex(startIndex: number, totalAssets: number): Promise<number>
  loadImage(index: number): Promise<boolean>
  getDisplayImageUrl(index: number): Promise<string | null>
  getDetailsUrl(index: number): Promise<string | null>
  setCurrentProvider(provider: ProviderName): Promise<void>
  setTurnoverAlways(value: boolean): Promise<void>
}
