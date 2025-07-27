import { ArtProvider } from './art-provider-base';
import { MetMuseumAsset } from '../models/met-museum-asset';
import { ArtAsset } from '../../types';

export class MetMuseumProvider extends ArtProvider {
  private _syncedAssetData: (MetMuseumAsset | null)[] = [];
  private allAvailableIds: number[] = [];
  private readonly BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
  private isSyncing = false;

  constructor() {
    super('met-museum', 'Metropolitan Museum of Art');
  }

  async syncData(): Promise<boolean> {
    if (this.isSyncing) {
      return true;
    }

    if (this.allAvailableIds && this.allAvailableIds.length > 0) {
      return true;
    }

    try {
      this.isSyncing = true;

      const cachedIds = await this.getCachedData('ids');
      if (cachedIds) {
        this.allAvailableIds = cachedIds;
        return true;
      }

      const searchResponse = await fetch(
        `${this.BASE_URL}/search?hasImages=true&isHighlight=true&q=painting`,
        this.DATA_REQUEST_OPTIONS,
      );

      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      this.allAvailableIds = searchData.objectIDs || [];

      await this.setCachedData('ids', this.allAvailableIds);

      return true;
    } catch (error) {
      console.error('Failed to sync Met Museum data:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  async syncedAssetCount(): Promise<number> {
    if (!this.allAvailableIds || this.allAvailableIds.length === 0) {
      await this.syncData();
    }
    return this.allAvailableIds ? this.allAvailableIds.length : 0;
  }

  async getAsset(index: number): Promise<ArtAsset | null> {
    if (!this.allAvailableIds || this.allAvailableIds.length === 0) {
      await this.syncData();
    }

    if (index < 0 || index >= this.allAvailableIds.length) {
      return null;
    }

    if (this._syncedAssetData[index]) {
      return this._syncedAssetData[index];
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}/objects/${this.allAvailableIds[index]}`,
        this.DATA_REQUEST_OPTIONS,
      );

      if (response.ok) {
        const rawAsset = await response.json();
        
        if (MetMuseumAsset.isValidForDisplay(rawAsset)) {
          const asset = MetMuseumAsset.fromApiResponse(rawAsset);
          this._syncedAssetData[index] = asset;
          return asset;
        } else {
          this._syncedAssetData[index] = null;
        }
      } else if (response.status === 403) {
        console.warn('Met Museum: Hit rate limit');
        return null;
      } else {
        this._syncedAssetData[index] = null;
      }
    } catch (error) {
      console.error(`Failed to fetch asset ${index}:`, error);
      this._syncedAssetData[index] = null;
    }

    return null;
  }

  async getDisplayImageUrl(assetId: number): Promise<string | null> {
    const asset = await this.getAsset(assetId);
    if (!asset) {
      return null;
    }

    return await asset.getDisplayImageUrl();
  }

  getDetailsUrl(asset: ArtAsset): string {
    return asset.getDetailsUrl();
  }
}