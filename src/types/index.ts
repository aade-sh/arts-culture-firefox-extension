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
  ART_PROVIDER?: string
  TURNOVER_ALWAYS?: boolean
}

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
    key?: string
    value?: any
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
  setUserSetting(key: string, value: any): Promise<void>
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
