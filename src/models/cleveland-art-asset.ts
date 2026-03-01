import { ArtAsset } from '../types'
import { ClevelandArtJsonData } from './json-data'

export interface ClevelandCreator {
  description?: string
  role?: string
}

export interface ClevelandRawData {
  id?: number | string
  title?: string
  creators?: ClevelandCreator[]
  tombstone?: string
  images?: {
    web?: {
      url?: string
    }
  }
  url?: string
}

export class ClevelandArtAsset implements ArtAsset {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: 'cleveland-museum'

  constructor(rawData: ClevelandRawData) {
    this.id = rawData.id?.toString() || this.generateId()
    this.title = rawData.title || 'Untitled'
    this.creator = this.extractCreator(rawData.creators)
    this.attribution = rawData.tombstone || ''
    this.remoteImageUrl = rawData.images?.web?.url || ''
    this.detailsUrl = rawData.url || ''
    this.provider = 'cleveland-museum'
  }

  static fromApiResponse(rawAsset: ClevelandRawData): ClevelandArtAsset {
    return new ClevelandArtAsset(rawAsset)
  }

  static fromJSON(json: ClevelandArtJsonData): ClevelandArtAsset {
    const asset = new ClevelandArtAsset({
      id: json.id,
      title: json.title,
      creators: [{ description: json.creator }],
      tombstone: json.attribution,
      images: { web: { url: json.remoteImageUrl } },
      url: json.detailsUrl,
    })
    return asset
  }

  private extractCreator(creators: ClevelandCreator[] | undefined): string {
    if (!creators || creators.length === 0) {
      return 'Unknown Artist'
    }

    const artist = creators.find((creator) => creator.role === 'artist')
    return artist?.description || creators[0].description || 'Unknown Artist'
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

  toJSON(): ClevelandArtJsonData {
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
