// Google Arts & Culture Asset Data Model
class GoogleArtsAsset {
  constructor(rawData) {
    this.id = rawData.id || this.generateId();
    this.title = rawData.title || 'Untitled';
    this.creator = rawData.creator || 'Unknown Artist';
    this.attribution = rawData.attribution || '';
    this.remoteImageUrl = rawData.image;
    this.detailsUrl = rawData.link; // Google Arts API uses 'link' field
    this.provider = 'google-arts';
  }

  static fromApiResponse(rawAsset) {
    return new GoogleArtsAsset(rawAsset);
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  async isImageCached() {
    const cache = await caches.open(`${this.provider}-images`);
    const cached = await cache.match(this.getProcessedImageUrl());
    return !!cached;
  }

  async getDisplayImageUrl() {
    // Check cache first
    const cache = await caches.open(`${this.provider}-images`);
    const cached = await cache.match(this.getProcessedImageUrl());
    
    if (cached) {
      // Return blob URL from cached response
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }
    
    // Fall back to remote URL
    return this.getProcessedImageUrl();
  }

  getProcessedImageUrl() {
    return this.remoteImageUrl + '=s1920-rw';
  }

  getDetailsUrl() {
    return `https://artsandculture.google.com/asset/${this.detailsUrl}`;
  }

  // Convert to plain object for storage/serialization (no image data)
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      creator: this.creator,
      attribution: this.attribution,
      remoteImageUrl: this.remoteImageUrl,
      detailsUrl: this.detailsUrl,
      provider: this.provider
    };
  }

  // Create from stored JSON object
  static fromJSON(json) {
    return new GoogleArtsAsset(json);
  }

  // Validation
  isValid() {
    return this.remoteImageUrl && this.title;
  }
}