import { ArtProvider } from './art-provider-base'
import {
  ClevelandArtAsset,
  ClevelandRawData,
} from '../../models/cleveland-art-asset'
import { ArtAsset, PROVIDERS } from '../../types'
import { CacheManager } from '../cache-manager'
import { ClevelandArtJsonData } from '../../models/json-data'

interface ClevelandApiResponse {
  data?: ClevelandRawData[]
}

export class ClevelandMuseumProvider extends ArtProvider {
  private _syncedAssetData: ClevelandArtAsset[] = []
  private readonly COLLECTION_URL =
    'https://openaccess-api.clevelandart.org/api/artworks/?has_image=1&cc0=1&limit=200'

  constructor(cache: CacheManager) {
    super(PROVIDERS.CLEVELAND_MUSEUM, 'Cleveland Museum of Art', cache)
  }

  async syncData(): Promise<boolean> {
    try {
      const cachedData = await this.getCachedData<ClevelandArtJsonData[]>('assets')
      if (cachedData) {
        this._syncedAssetData = cachedData.map((json) =>
          ClevelandArtAsset.fromJSON(json),
        )
        return true
      }

      const response = await fetch(this.COLLECTION_URL, {
        ...this.DATA_REQUEST_OPTIONS,
        mode: 'cors',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as ClevelandApiResponse
      const rawAssets = Array.isArray(data.data) ? data.data : []

      this._syncedAssetData = rawAssets
        .map((rawAsset) => ClevelandArtAsset.fromApiResponse(rawAsset))
        .filter((asset) => asset.isValid())

      await this.setCachedData(
        'assets',
        this._syncedAssetData.map((asset) => asset.toJSON()),
      )

      return true
    } catch (error) {
      console.error('Failed to sync Cleveland Museum data:', error)
      return false
    }
  }

  async syncedAssetCount(): Promise<number> {
    if (this._syncedAssetData.length === 0) {
      await this.syncData()
    }

    return this._syncedAssetData.length
  }

  async findNextValidAssetIndex(
    startIndex: number,
    totalAssets: number,
  ): Promise<number> {
    if (totalAssets <= 0) {
      return -1
    }

    return startIndex
  }

  async getAsset(index: number): Promise<ArtAsset | null> {
    if (this._syncedAssetData.length === 0) {
      await this.syncData()
    }

    if (index < 0 || index >= this._syncedAssetData.length) {
      return null
    }

    return this._syncedAssetData[index]
  }

  async getDisplayImageUrl(assetId: number): Promise<string | null> {
    const asset = await this.getAsset(assetId)
    if (!asset) {
      return null
    }

    return asset.getDisplayImageUrl()
  }

  getDetailsUrl(asset: ArtAsset): string {
    return asset.getDetailsUrl()
  }
}
