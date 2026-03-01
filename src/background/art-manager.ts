import { GoogleArtsProvider } from './providers/google-arts-provider'
import { MetMuseumProvider } from './providers/met-museum-provider'
import { ExtensionStorage } from './storage'
import { CacheManager } from './cache-manager'
import {
  ArtAsset,
  ArtProvider,
  ArtManager as IArtManager,
  UserSettings,
  ProviderName,
  STORAGE_KEYS,
  DEFAULT_PROVIDER,
  PROVIDERS,
} from '../types'

interface ArtState {
  provider: ProviderName
  currentIndex: number
  turnoverAlways: boolean
  // Timestamp for rotation policy decisions.
  lastRotatedAt: number
  // Timestamp for debugging/state-write observability.
  lastStateUpdatedAt: number
}

interface PersistedArtState {
  provider?: unknown
  currentIndex?: unknown
  turnoverAlways?: unknown
  lastRotatedAt?: unknown
  lastStateUpdatedAt?: unknown
  // Backward-compatible migration from older schema.
  lastUpdated?: unknown
}

const createDefaultState = (): ArtState => {
  const now = Date.now()
  return {
    provider: DEFAULT_PROVIDER,
    currentIndex: 0,
    turnoverAlways: false,
    lastRotatedAt: now,
    lastStateUpdatedAt: now,
  }
}

const isProviderName = (value: unknown): value is ProviderName => {
  return Object.values(PROVIDERS).includes(value as ProviderName)
}

const isNonNegativeNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export class ArtManager implements IArtManager {
  private providers = new Map<ProviderName, ArtProvider>()
  private state: ArtState = createDefaultState()
  private initialized = false
  private pendingInitialization: Promise<void> | null = null

  constructor(providers?: ArtProvider[]) {
    const resolvedProviders = providers ?? createDefaultProviders()
    resolvedProviders.forEach((provider) => this.registerProvider(provider))
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
      throw new Error(
        `Provider ${this.state.provider} not found. This indicates an invalid state.`,
      )
    }
    return provider
  }

  private migratePersistedState(raw: PersistedArtState): ArtState {
    const fallback = createDefaultState()

    return {
      provider: isProviderName(raw.provider) ? raw.provider : fallback.provider,
      currentIndex: isNonNegativeNumber(raw.currentIndex)
        ? raw.currentIndex
        : fallback.currentIndex,
      turnoverAlways:
        typeof raw.turnoverAlways === 'boolean'
          ? raw.turnoverAlways
          : fallback.turnoverAlways,
      lastRotatedAt: isNonNegativeNumber(raw.lastRotatedAt)
        ? raw.lastRotatedAt
        : isNonNegativeNumber(raw.lastUpdated)
          ? raw.lastUpdated
          : fallback.lastRotatedAt,
      lastStateUpdatedAt: isNonNegativeNumber(raw.lastStateUpdatedAt)
        ? raw.lastStateUpdatedAt
        : fallback.lastStateUpdatedAt,
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.pendingInitialization) {
      await this.pendingInitialization
      return
    }

    this.pendingInitialization = this.loadState()
      .then(() => {
        this.initialized = true
      })
      .finally(() => {
        this.pendingInitialization = null
      })

    await this.pendingInitialization
  }

  async loadState(): Promise<void> {
    try {
      const stored = await ExtensionStorage.readData(STORAGE_KEYS.ART_STATE)
      if (stored) {
        this.state = this.migratePersistedState(
          JSON.parse(stored) as PersistedArtState,
        )
      } else {
        this.state = createDefaultState()
        await this.saveState()
      }
    } catch (error) {
      console.warn('Failed to load state, using defaults:', error)
      this.state = createDefaultState()
      await this.saveState()
    }
  }

  async saveState(): Promise<void> {
    this.state.lastStateUpdatedAt = Date.now()
    await ExtensionStorage.writeData(
      STORAGE_KEYS.ART_STATE,
      JSON.stringify(this.state),
    )
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

  async findNextValidAssetIndex(
    startIndex: number,
    totalAssets: number,
  ): Promise<number> {
    return this.currentProvider.findNextValidAssetIndex(startIndex, totalAssets)
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

  async getLastRotatedAt(): Promise<number> {
    return this.state.lastRotatedAt
  }

  async setCurrentIndex(index: number): Promise<void> {
    this.state.currentIndex = index
    this.state.lastRotatedAt = Date.now()
    await this.saveState()
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
}

function createDefaultProviders(): ArtProvider[] {
  const cache = new CacheManager()
  return [new GoogleArtsProvider(cache), new MetMuseumProvider(cache)]
}
