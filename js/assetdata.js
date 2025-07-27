// Legacy AssetData class - now proxies to ArtProviders
class AssetData {
  static async syncData() {
    return ArtProviders.syncData();
  }

  static async syncedAssetCount() {
    return ArtProviders.syncedAssetCount();
  }

  static async getAsset(index) {
    return ArtProviders.getAsset(index);
  }

  static async loadImage(imageId) {
    return ArtProviders.loadImage(imageId);
  }

  static getImageUrl(imageId) {
    return ArtProviders.getImageUrl(imageId);
  }

  static blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}