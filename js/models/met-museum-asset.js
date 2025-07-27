// Metropolitan Museum Asset Data Model
class MetMuseumAsset {
  constructor(rawData) {
    this.id = rawData.objectID?.toString() || this.generateId();
    this.title = rawData.title || 'Untitled';
    this.creator = this.extractArtist(rawData);
    this.attribution = this.extractAttribution(rawData);
    this.remoteImageUrl = rawData.primaryImage;
    this.detailsUrl = rawData.objectURL; // Met Museum API uses 'objectURL' field
    this.provider = 'met-museum';
  }

  static fromApiResponse(rawAsset) {
    return new MetMuseumAsset(rawAsset);
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  extractArtist(rawAsset) {
    return rawAsset.artistDisplayName || 
           (rawAsset.constituents && rawAsset.constituents[0]?.name) || 
           'Unknown Artist';
  }

  extractAttribution(rawAsset) {
    const attributionParts = [
      rawAsset.culture,
      rawAsset.period,
      rawAsset.dynasty,
      rawAsset.reign
    ].filter(Boolean);

    return attributionParts.length > 0 
      ? attributionParts.join(', ')
      : (rawAsset.creditLine || '');
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
    return this.remoteImageUrl; // Met Museum images don't need processing
  }

  getDetailsUrl() {
    return this.detailsUrl;
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
    const asset = new MetMuseumAsset({
      objectID: json.id,
      title: json.title,
      artistDisplayName: json.creator,
      primaryImage: json.remoteImageUrl,
      objectURL: json.detailsUrl
    });
    asset.attribution = json.attribution;
    return asset;
  }

  // Validation
  isValid() {
    return this.remoteImageUrl && this.title;
  }

  // Met Museum specific validation
  isPublicDomain(rawAsset) {
    return rawAsset.isPublicDomain === true;
  }

  hasImage(rawAsset) {
    return rawAsset.primaryImage && rawAsset.primaryImage.trim() !== '';
  }

  // Static method for pre-validation during fetching
  static isValidForDisplay(rawAsset) {
    return rawAsset.primaryImage && 
           rawAsset.primaryImage.trim() !== '' && 
           rawAsset.isPublicDomain === true;
  }
}