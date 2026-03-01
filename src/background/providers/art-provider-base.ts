import {
  ArtAsset,
  ArtProvider as IArtProvider,
  ProviderName,
  CacheKeyType,
} from '../../types'
import { CacheManager } from '../cache-manager'

export abstract class ArtProvider implements IArtProvider {
  name: ProviderName
  displayName: string
  protected DATA_REQUEST_OPTIONS: RequestInit
  protected cache: CacheManager

  constructor(name: ProviderName, displayName: string, cache: CacheManager) {
    this.name = name
    this.displayName = displayName
    this.DATA_REQUEST_OPTIONS = {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
    this.cache = cache
  }

  abstract syncData(): Promise<boolean>
  abstract getAsset(index: number): Promise<ArtAsset | null>
  abstract syncedAssetCount(): Promise<number>
  abstract getDisplayImageUrl(assetId: number): Promise<string | null>
  abstract getDetailsUrl(asset: ArtAsset): string

  async findNextValidAssetIndex(
    startIndex: number,
    totalAssets: number,
  ): Promise<number> {
    if (totalAssets <= 0) {
      return -1
    }

    let attempts = 0
    const maxAttempts = 10
    let index = startIndex

    while (attempts < maxAttempts) {
      const asset = await this.getAsset(index)
      if (asset) {
        return index
      }

      index++
      if (index >= totalAssets) {
        index = 0
      }
      attempts++
    }

    return -1
  }

  protected async getCachedData<T = unknown>(
    key: CacheKeyType,
  ): Promise<T | null> {
    return await this.cache.getCachedData<T>(this.name, key)
  }

  protected async setCachedData<T = unknown>(
    key: CacheKeyType,
    data: T,
  ): Promise<void> {
    return await this.cache.setCachedData<T>(this.name, key, data)
  }

  async loadImage(assetId: number): Promise<boolean> {
    try {
      const asset = await this.getAsset(assetId)
      if (!asset) return false

      const imageUrl = asset.getProcessedImageUrl()
      if (!imageUrl) return false

      await this.cache.loadAndCacheImage(this.name, imageUrl)

      return true
    } catch (error) {
      console.error(`Failed to load ${this.name} image ${assetId}:`, error)
      return false
    }
  }
}
