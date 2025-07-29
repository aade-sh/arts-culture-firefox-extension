import { ArtProvider } from './art-provider-base'
import { GoogleArtsAsset } from '../models/google-arts-asset'
import { ArtAsset } from '../../types'

export class GoogleArtsProvider extends ArtProvider {
  private _syncedAssetData: GoogleArtsAsset[] = []
  private readonly JSON_DATA_URL =
    'https://www.gstatic.com/culturalinstitute/tabext/imax_2_2.json'

  constructor() {
    super('google-arts', 'Google Arts & Culture')
  }

  async syncData(): Promise<boolean> {
    try {
      const cachedData = await this.getCachedData('assets')
      if (cachedData) {
        this._syncedAssetData = cachedData.map((json: any) =>
          GoogleArtsAsset.fromJSON(json),
        )
        return true
      }

      const response = await fetch(this.JSON_DATA_URL, {
        ...this.DATA_REQUEST_OPTIONS,
        mode: 'cors',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      this._syncedAssetData = data
        .map((rawAsset: any) => GoogleArtsAsset.fromApiResponse(rawAsset))
        .filter((asset: GoogleArtsAsset) => asset.isValid())

      await this.setCachedData(
        'assets',
        this._syncedAssetData.map((asset) => asset.toJSON()),
      )

      return true
    } catch (error) {
      console.error('Failed to sync Google Arts data:', error)
      return false
    }
  }

  async syncedAssetCount(): Promise<number> {
    if (this._syncedAssetData.length === 0) {
      await this.syncData()
    }
    return this._syncedAssetData.length
  }

  async getAsset(index: number): Promise<ArtAsset | null> {
    if (this._syncedAssetData.length === 0) {
      await this.syncData()
    }

    if (index < 0 || index >= this._syncedAssetData.length) {
      console.error(`Asset index ${index} is out of range`)
      return null
    }

    return this._syncedAssetData[index]
  }

  async getDisplayImageUrl(assetId: number): Promise<string | null> {
    const asset = await this.getAsset(assetId)
    if (!asset) {
      return null
    }

    return await asset.getDisplayImageUrl()
  }

  getDetailsUrl(asset: ArtAsset): string {
    return asset.getDetailsUrl()
  }
}
