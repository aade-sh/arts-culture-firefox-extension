import { ArtAsset } from '../../types'

interface GoogleArtsRawData {
  id?: string
  title?: string
  creator?: string
  attribution?: string
  image?: string
  link?: string
}

export class GoogleArtsAsset implements ArtAsset {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: string

  constructor(rawData: GoogleArtsRawData) {
    this.id = rawData.id || this.generateId()
    this.title = rawData.title || 'Untitled'
    this.creator = rawData.creator || 'Unknown Artist'
    this.attribution = rawData.attribution || ''
    this.remoteImageUrl = rawData.image || ''
    this.detailsUrl = rawData.link || ''
    this.provider = 'google-arts'
  }

  static fromApiResponse(rawAsset: GoogleArtsRawData): GoogleArtsAsset {
    return new GoogleArtsAsset(rawAsset)
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
    const cache = await caches.open(`${this.provider}-images`)
    const cached = await cache.match(this.getProcessedImageUrl())

    if (cached) {
      const blob = await cached.blob()
      return URL.createObjectURL(blob)
    }

    return this.getProcessedImageUrl()
  }

  getProcessedImageUrl(): string {
    return this.remoteImageUrl + '=s1920-rw'
  }

  getDetailsUrl(): string {
    return `https://artsandculture.google.com/asset/${this.detailsUrl}`
  }

  toJSON(): object {
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

  static fromJSON(json: any): GoogleArtsAsset {
    return new GoogleArtsAsset(json)
  }

  isValid(): boolean {
    return !!(this.remoteImageUrl && this.title)
  }
}
