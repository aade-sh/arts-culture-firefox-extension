import { ArtAsset } from '../../src/types/index.js';

interface MetMuseumRawData {
  objectID?: number;
  title?: string;
  artistDisplayName?: string;
  constituents?: Array<{ name: string }>;
  culture?: string;
  period?: string;
  dynasty?: string;
  reign?: string;
  creditLine?: string;
  primaryImage?: string;
  objectURL?: string;
  isPublicDomain?: boolean;
}

export class MetMuseumAsset implements ArtAsset {
  id: string;
  title: string;
  creator: string;
  attribution: string;
  remoteImageUrl: string;
  detailsUrl: string;
  provider: string;

  constructor(rawData: MetMuseumRawData) {
    this.id = rawData.objectID?.toString() || this.generateId();
    this.title = rawData.title || 'Untitled';
    this.creator = this.extractArtist(rawData);
    this.attribution = this.extractAttribution(rawData);
    this.remoteImageUrl = rawData.primaryImage || '';
    this.detailsUrl = rawData.objectURL || '';
    this.provider = 'met-museum';
  }

  static fromApiResponse(rawAsset: MetMuseumRawData): MetMuseumAsset {
    return new MetMuseumAsset(rawAsset);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private extractArtist(rawAsset: MetMuseumRawData): string {
    return (
      rawAsset.artistDisplayName ||
      (rawAsset.constituents && rawAsset.constituents[0]?.name) ||
      'Unknown Artist'
    );
  }

  private extractAttribution(rawAsset: MetMuseumRawData): string {
    const attributionParts = [
      rawAsset.culture,
      rawAsset.period,
      rawAsset.dynasty,
      rawAsset.reign,
    ].filter(Boolean);

    return attributionParts.length > 0
      ? attributionParts.join(', ')
      : rawAsset.creditLine || '';
  }

  async isImageCached(): Promise<boolean> {
    const cache = await caches.open(`${this.provider}-images`);
    const cached = await cache.match(this.getProcessedImageUrl());
    return !!cached;
  }

  async getDisplayImageUrl(): Promise<string | null> {
    const processedUrl = this.getProcessedImageUrl();
    
    if (!processedUrl) return null;
    
    const cache = await caches.open(`${this.provider}-images`);
    const cached = await cache.match(processedUrl);

    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }

    return processedUrl;
  }

  getProcessedImageUrl(): string {
    return this.remoteImageUrl; // Met Museum images don't need processing
  }

  getDetailsUrl(): string {
    return this.detailsUrl;
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
    };
  }

  static fromJSON(json: any): MetMuseumAsset {
    const asset = new MetMuseumAsset({
      objectID: parseInt(json.id, 10),
      title: json.title,
      artistDisplayName: json.creator,
      primaryImage: json.remoteImageUrl,
      objectURL: json.detailsUrl,
    });
    asset.attribution = json.attribution;
    return asset;
  }

  isValid(): boolean {
    return !!(this.remoteImageUrl && this.title);
  }

  isPublicDomain(rawAsset: MetMuseumRawData): boolean {
    return rawAsset.isPublicDomain === true;
  }

  hasImage(rawAsset: MetMuseumRawData): boolean {
    return !!(rawAsset.primaryImage && rawAsset.primaryImage.trim() !== '');
  }

  static isValidForDisplay(rawAsset: MetMuseumRawData): boolean {
    return !!(
      rawAsset.primaryImage &&
      rawAsset.primaryImage.trim() !== '' &&
      rawAsset.isPublicDomain === true
    );
  }
}