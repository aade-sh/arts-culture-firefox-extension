import { ArtAsset, ArtProvider as IArtProvider } from '../../types'
import { Cache } from '../cache-manager'

export abstract class ArtProvider implements IArtProvider {
  name: string
  displayName: string
  protected DATA_REQUEST_OPTIONS: RequestInit
  protected cache: typeof Cache

  constructor(name: string, displayName: string) {
    this.name = name
    this.displayName = displayName
    this.DATA_REQUEST_OPTIONS = {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
    this.cache = Cache
  }

  abstract syncData(): Promise<boolean>
  abstract getAsset(index: number): Promise<ArtAsset | null>
  abstract syncedAssetCount(): Promise<number>
  abstract getDisplayImageUrl(assetId: number): Promise<string | null>
  abstract getDetailsUrl(asset: ArtAsset): string

  protected async getCachedData(key: string): Promise<any> {
    return await this.cache.getCachedData(this.name, key)
  }

  protected async setCachedData(key: string, data: any): Promise<void> {
    return await this.cache.setCachedData(this.name, key, data)
  }

  async loadImage(assetId: number): Promise<boolean> {
    try {
      const asset = await this.getAsset(assetId)
      if (!asset) return false

      const imageUrl = asset.getProcessedImageUrl()
      await this.cache.loadAndCacheImage(this.name, imageUrl)

      return true
    } catch (error) {
      console.error(`Failed to load ${this.name} image ${assetId}:`, error)
      return false
    }
  }
}
