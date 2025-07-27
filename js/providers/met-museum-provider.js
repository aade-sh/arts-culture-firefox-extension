// Metropolitan Museum of Art Provider
class MetMuseumProvider extends ArtProvider {
  constructor() {
    super('met-museum', 'Metropolitan Museum of Art')
    this._syncedAssetData = []
    this.allAvailableIds = []
    this.BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1'
    this.isSyncing = false // Prevent concurrent sync operations
  }

  async syncData() {
    if (this.isSyncing) {
      return true
    }

    if (this.allAvailableIds && this.allAvailableIds.length > 0) {
      return true
    }

    try {
      this.isSyncing = true

      // Try cached IDs first
      const cachedIds = await this.getCachedData('ids')
      if (cachedIds) {
        this.allAvailableIds = cachedIds
        return true
      }

      const searchResponse = await fetch(
        `${this.BASE_URL}/search?hasImages=true&isHighlight=true&q=painting`,
        this.DATA_REQUEST_OPTIONS,
      )

      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()
      this.allAvailableIds = searchData.objectIDs || []

      // Cache the IDs
      await this.setCachedData('ids', this.allAvailableIds)

      return true
    } catch (error) {
      console.error('Failed to sync Met Museum data:', error)
      return false
    } finally {
      this.isSyncing = false
    }
  }

  async syncedAssetCount() {
    if (!this.allAvailableIds || this.allAvailableIds.length === 0) {
      await this.syncData()
    }
    return this.allAvailableIds ? this.allAvailableIds.length : 0
  }

  async getAsset(index) {
    if (!this.allAvailableIds || this.allAvailableIds.length === 0) {
      await this.syncData()
    }

    if (index < 0 || index >= this.allAvailableIds.length) {
      console.error(`Asset index ${index} is out of range`)
      return null
    }

    // Check if we already have this asset cached
    if (this._syncedAssetData[index]) {
      return this._syncedAssetData[index]
    }

    // Try to fetch a valid asset starting from the requested index
    for (
      let i = index;
      i < Math.min(index + 5, this.allAvailableIds.length);
      i++
    ) {
      if (this._syncedAssetData[i]) {
        return this._syncedAssetData[i]
      }

      try {
        const response = await fetch(
          `${this.BASE_URL}/objects/${this.allAvailableIds[i]}`,
          this.DATA_REQUEST_OPTIONS,
        )

        if (response.ok) {
          const rawAsset = await response.json()
          if (MetMuseumAsset.isValidForDisplay(rawAsset)) {
            const asset = MetMuseumAsset.fromApiResponse(rawAsset)
            this._syncedAssetData[i] = asset
            return asset
          }
        } else if (response.status === 403) {
          console.warn('Hit rate limit')
          return null
        }
      } catch (error) {
        console.error(`Failed to fetch asset ${i}:`, error)
      }
    }

    return null
  }

  async getDisplayImageUrl(assetId) {
    const asset = await this.getAsset(assetId)
    if (!asset) {
      return null
    }

    return await asset.getDisplayImageUrl()
  }

  getDetailsUrl(asset) {
    return asset.getDetailsUrl()
  }
}
