import { GoogleArtsProvider } from './providers/google-arts-provider'
import { MetMuseumProvider } from './providers/met-museum-provider'
import { ExtensionStorage } from './storage'
import {
  ArtAsset,
  ArtProvider,
  ArtManager as IArtManager,
  UserSettings,
  UserSettingUpdate,
} from '../types'

interface ArtState {
  provider: string
  currentIndex: number
  turnoverAlways: boolean
  lastUpdated: number
}

export class ArtManager implements IArtManager {
  private providers = new Map<string, ArtProvider>()
  private currentProvider: ArtProvider | null = null
  private state: ArtState = {
    provider: 'google-arts',
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

  private getProvider(name: string): ArtProvider | undefined {
    return this.providers.get(name)
  }

  getAllProviders(): ArtProvider[] {
    return Array.from(this.providers.values())
  }

  async loadState(): Promise<void> {
    try {
      const stored = await ExtensionStorage.readData('art_state')
      if (stored) {
        this.state = { ...this.state, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('Failed to load state, using defaults:', error)
    }
  }

  async saveState(): Promise<void> {
    this.state.lastUpdated = Date.now()
    await ExtensionStorage.writeData('art_state', JSON.stringify(this.state))
  }

  async getCurrentProvider(): Promise<ArtProvider> {
    if (!this.currentProvider) {
      await this.loadState()
      this.currentProvider = this.getProvider(this.state.provider) || null

      if (!this.currentProvider) {
        console.warn(
          `Provider ${this.state.provider} not found, using google-arts`,
        )
        this.currentProvider = this.getProvider('google-arts') || null
        if (!this.currentProvider) {
          throw new Error('No providers available')
        }
        this.state.provider = 'google-arts'
        await this.saveState()
      }
    }

    return this.currentProvider
  }

  async setCurrentProvider(providerName: string): Promise<void> {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    this.currentProvider = provider
    this.state.provider = providerName
    this.state.currentIndex = 0
    await this.saveState()
  }

  async syncData(): Promise<boolean> {
    const provider = await this.getCurrentProvider()
    return provider.syncData()
  }

  async getAsset(index: number): Promise<ArtAsset | null> {
    const provider = await this.getCurrentProvider()
    return provider.getAsset(index)
  }

  async loadImage(assetId: number): Promise<boolean> {
    const provider = await this.getCurrentProvider()
    return provider.loadImage(assetId)
  }

  async syncedAssetCount(): Promise<number> {
    const provider = await this.getCurrentProvider()
    return provider.syncedAssetCount()
  }

  async getDisplayImageUrl(assetId: number): Promise<string | null> {
    if (!this.currentProvider) return null
    return await this.currentProvider.getDisplayImageUrl(assetId)
  }

  async getDetailsUrl(assetId: number): Promise<string | null> {
    const provider = await this.getCurrentProvider()
    const asset = await this.getAsset(assetId)
    if (!asset) return null
    return provider.getDetailsUrl(asset)
  }

  async getCurrentIndex(): Promise<number> {
    await this.loadState()
    return this.state.currentIndex
  }

  async setCurrentIndex(index: number): Promise<void> {
    this.state.currentIndex = index
    await this.saveState()
  }

  async getTurnoverAlways(): Promise<boolean> {
    await this.loadState()
    return this.state.turnoverAlways
  }

  async setTurnoverAlways(value: boolean): Promise<void> {
    this.state.turnoverAlways = value
    await this.saveState()
  }

  async getUserSettings(): Promise<UserSettings> {
    await this.loadState()
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
