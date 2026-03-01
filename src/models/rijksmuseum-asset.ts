import { ArtAsset } from '../types'
import { RijksmuseumJsonData } from './json-data'

export interface RijksmuseumRawData {
  id?: number | string
  title?: string
  creator?: string
  attribution?: string
  imageUrl?: string
  detailsUrl?: string
}

export class RijksmuseumAsset implements ArtAsset {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: 'rijksmuseum'

  constructor(rawData: RijksmuseumRawData) {
    this.id = rawData.id?.toString() || this.generateId()
    this.title = rawData.title || 'Untitled'
    this.creator = rawData.creator || 'Unknown Artist'
    this.attribution = rawData.attribution || ''
    this.remoteImageUrl = rawData.imageUrl || ''
    this.detailsUrl = rawData.detailsUrl || ''
    this.provider = 'rijksmuseum'
  }

  static fromApiResponse(rawAsset: RijksmuseumRawData): RijksmuseumAsset {
    return new RijksmuseumAsset(rawAsset)
  }

  static fromJSON(json: RijksmuseumJsonData): RijksmuseumAsset {
    return new RijksmuseumAsset({
      id: json.id,
      title: json.title,
      creator: json.creator,
      attribution: json.attribution,
      imageUrl: json.remoteImageUrl,
      detailsUrl: json.detailsUrl,
    })
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  async isImageCached(): Promise<boolean> {
    const cache = await caches.open(`${this.provider}-images`)
    const cached = await cache.match(this.getProcessedImageUrl())
    return !!cached
  }

  async getDisplayImageUrl(): Promise<string | null> {
    const processedUrl = this.getProcessedImageUrl()
    if (!processedUrl) return null

    const cache = await caches.open(`${this.provider}-images`)
    const cached = await cache.match(processedUrl)

    if (cached) {
      const blob = await cached.blob()
      return URL.createObjectURL(blob)
    }

    return processedUrl
  }

  getProcessedImageUrl(): string {
    return this.remoteImageUrl
  }

  getDetailsUrl(): string {
    return this.detailsUrl
  }

  toJSON(): RijksmuseumJsonData {
    return {
      id: this.id,
      title: this.title,
      creator: this.creator,
      attribution: this.attribution,
      remoteImageUrl: this.remoteImageUrl,
      detailsUrl: this.detailsUrl,
      provider: this.provider,
    }
  }

  isValid(): boolean {
    return !!(this.remoteImageUrl && this.title)
  }
}
