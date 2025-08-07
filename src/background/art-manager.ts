import { GoogleArtsProvider } from './providers/google-arts-provider'
import { MetMuseumProvider } from './providers/met-museum-provider'
import { ExtensionStorage } from './storage'
import {
  ArtAsset,
  ArtProvider,
  ArtManager as IArtManager,
  UserSettings,
  UserSettingUpdate,
  ProviderName,
  STORAGE_KEYS,
  PROVIDERS,
  DEFAULT_PROVIDER,
} from '../types'

interface ArtState {
  provider: ProviderName
  currentIndex: number
  turnoverAlways: boolean
  lastUpdated: number
}

export class ArtManager implements IArtManager {
  private providers = new Map<ProviderName, ArtProvider>()
  private state: ArtState = {
    provider: DEFAULT_PROVIDER,
    currentIndex: 0,
    turnoverAlways: false,
    lastUpdated: Date.now(),
  }

  constructor() {
    this.registerProvider(new GoogleArtsProvider())
    this.registerProvider(new MetMuseumProvider())
  }

  private registerProvider(provider: ArtProvider): void {
    this.providers.set(provider.name, provider)
  }

  private getProvider(name: ProviderName): ArtProvider | undefined {
    return this.providers.get(name)
  }

  private get currentProvider(): ArtProvider {
    const provider = this.getProvider(this.state.provider)
    if (!provider) {
      throw new Error(`Provider ${this.state.provider} not found. This indicates an invalid state.`)
    }
    return provider
  }

  getAllProviders(): ArtProvider[] {
    return Array.from(this.providers.values())
  }

  getCurrentProviderSync(): ArtProvider {
    return this.currentProvider
  }

  async loadState(): Promise<void> {
    try {
      const stored = await ExtensionStorage.readData(STORAGE_KEYS.ART_STATE)
      if (stored) {
        this.state = { ...this.state, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('Failed to load state, using defaults:', error)
    }
  }

  async saveState(): Promise<void> {
    this.state.lastUpdated = Date.now()
    await ExtensionStorage.writeData(STORAGE_KEYS.ART_STATE, JSON.stringify(this.state))
  }

  async setCurrentProvider(providerName: ProviderName): Promise<void> {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    this.state.provider = providerName
    this.state.currentIndex = 0
    await this.saveState()
  }

  async syncData(): Promise<boolean> {
    return this.currentProvider.syncData()
  }

  async getAsset(index: number): Promise<ArtAsset | null> {
    return this.currentProvider.getAsset(index)
  }

  async loadImage(assetId: number): Promise<boolean> {
    return this.currentProvider.loadImage(assetId)
  }

  async syncedAssetCount(): Promise<number> {
    return this.currentProvider.syncedAssetCount()
  }

  async getDisplayImageUrl(assetId: number): Promise<string | null> {
    return await this.currentProvider.getDisplayImageUrl(assetId)
  }

  async getDetailsUrl(assetId: number): Promise<string | null> {
    const asset = await this.getAsset(assetId)
    if (!asset) return null
    return this.currentProvider.getDetailsUrl(asset)
  }

  async getCurrentIndex(): Promise<number> {
    return this.state.currentIndex
  }

  async setCurrentIndex(index: number): Promise<void> {
    this.state.currentIndex = index
    await this.saveState()
  }

  async getTurnoverAlways(): Promise<boolean> {
    return this.state.turnoverAlways
  }

  async setTurnoverAlways(value: boolean): Promise<void> {
    this.state.turnoverAlways = value
    await this.saveState()
  }

  async getUserSettings(): Promise<UserSettings> {
    return {
      TURNOVER_ALWAYS: this.state.turnoverAlways,
      ART_PROVIDER: this.state.provider,
    }
  }

  async setUserSetting(setting: UserSettingUpdate): Promise<void> {
    if (setting.key === 'turnoverAlways') {
      await this.setTurnoverAlways(setting.value)
    } else if (setting.key === 'artProvider') {
      await this.setCurrentProvider(setting.value)
    }
  }
}

export const instance = new ArtManager()
