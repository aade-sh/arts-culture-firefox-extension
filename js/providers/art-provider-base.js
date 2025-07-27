// Base Art Provider Class
class ArtProvider {
  constructor(name, displayName) {
    this.name = name;
    this.displayName = displayName;
  }

  async syncData() {
    throw new Error('syncData must be implemented by subclass');
  }

  async getAsset(index) {
    throw new Error('getAsset must be implemented by subclass');
  }

  async loadImage(assetId) {
    throw new Error('loadImage must be implemented by subclass');
  }

  async syncedAssetCount() {
    throw new Error('syncedAssetCount must be implemented by subclass');
  }

  getImageUrl(assetId) {
    throw new Error('getImageUrl must be implemented by subclass');
  }

  normalizeAsset(rawAsset) {
    throw new Error('normalizeAsset must be implemented by subclass');
  }

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}