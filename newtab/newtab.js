class NewTabPage {
  constructor() {
    this.currentAssetIndex = 0
    this.totalAssets = 0
    this.userSettings = {}
    this.init()
  }

  async init() {
    try {
      this.showLoading()

      this.userSettings = await ArtManager.instance.getUserSettings()

      const syncSuccess = await ArtManager.instance.syncData()
      if (!syncSuccess) {
        throw new Error('Failed to sync asset data')
      }

      this.totalAssets = await ArtManager.instance.syncedAssetCount()

      if (this.totalAssets === 0) {
        throw new Error('No assets available from current provider')
      }

      this.currentAssetIndex = await ArtManager.instance.getCurrentIndex()

      chrome.runtime.sendMessage(
        {
          type: 'requestCurrentAsset',
        },
        (response) => {
          if (response && response.currentAssetIndex !== undefined) {
            this.currentAssetIndex = response.currentAssetIndex
          }

          if (this.userSettings[NewTabSetting.TURNOVER_ALWAYS]) {
            this.rotateToNextImage()
          } else {
            this.displayCurrentImage()
          }
        },
      )

      this.setupEventListeners()

      this.hideLoading()
    } catch (error) {
      console.error('Failed to initialize new tab page:', error)
      this.showError('Failed to load artwork')
    }
  }

  showLoading() {
    document.getElementById('loading').classList.remove('hidden')
    document.getElementById('main-content').classList.add('hidden')
  }

  hideLoading() {
    document.getElementById('loading').classList.add('hidden')
    document.getElementById('main-content').classList.remove('hidden')
  }

  showError(message) {
    const loading = document.getElementById('loading')
    const p = document.createElement('p')
    p.style.color = '#ff6b6b'
    p.textContent = message
    loading.innerHTML = ''
    loading.appendChild(p)
    loading.classList.remove('hidden')
  }

  async displayCurrentImage() {
    try {
      // Ensure we have the latest asset count and valid index
      this.totalAssets = await ArtManager.instance.syncedAssetCount()

      // Reset index if it's out of bounds for current provider
      if (this.currentAssetIndex >= this.totalAssets) {
        this.currentAssetIndex = 0
        await ArtManager.instance.setCurrentIndex(0)
      }

      const asset = await ArtManager.instance.getAsset(this.currentAssetIndex)
      if (!asset) {
        console.error(
          `Asset at index ${this.currentAssetIndex} not found. Total assets: ${this.totalAssets}`,
        )
        // Try to reset to first asset
        this.currentAssetIndex = 0
        await ArtManager.instance.setCurrentIndex(0)
        const firstAsset = await ArtManager.instance.getAsset(0)
        if (!firstAsset) {
          throw new Error('No assets available from current provider')
        }
        await this.displayCurrentImage()
        return
      }

      await ArtManager.instance.loadImage(this.currentAssetIndex)

      this.updateArtInfo(asset)
      await this.updateBackgroundImage(asset)

      // Don't preload next image to avoid bulk downloading
    } catch (error) {
      console.error('Failed to display current image:', error)
      this.showError('Failed to load artwork. Please try refreshing the page.')
    }
  }

  async rotateToNextImage() {
    try {
      chrome.runtime.sendMessage({
        type: 'rotateImage',
        payload: { currentAssetIndex: this.currentAssetIndex },
      })
    } catch (error) {
      console.error('Failed to rotate image:', error)
    }
  }

  updateArtInfo(asset) {
    document.getElementById('art-title').textContent = asset.title || 'Untitled'
    document.getElementById('art-creator').textContent =
      asset.creator || 'Unknown Artist'
    document.getElementById('art-attribution').textContent =
      asset.attribution || ''
  }

  async updateBackgroundImage(asset) {
    const imageUrl = await ArtManager.instance.getDisplayImageUrl(
      this.currentAssetIndex,
    )
    const backgroundImage = document.getElementById('background-image')

    if (imageUrl) {
      backgroundImage.src = imageUrl
      backgroundImage.alt = asset.title || 'Artwork'
    }
  }

  setupEventListeners() {
    document
      .getElementById('rotate-btn')
      .addEventListener('click', () => this.rotateToNextImage())

    document.getElementById('info-btn').addEventListener('click', async () => {
      const url = await ArtManager.instance.getDetailsUrl(
        this.currentAssetIndex,
      )
      if (url) {
        chrome.tabs.create({ url })
      }
    })

    document
      .getElementById('settings-btn')
      .addEventListener('click', () => this.openSettings())

    document
      .getElementById('close-settings')
      .addEventListener('click', () => this.closeSettings())

    this.setupSettingsListeners()

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'updateAsset') {
        this.handleAssetUpdate(message.payload?.newAssetIndex)
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault()
        this.rotateToNextImage()
      }
    })
  }

  setupSettingsListeners() {
    // Handle checkboxes
    const checkboxMap = {
      'turnover-always': NewTabSetting.TURNOVER_ALWAYS,
    }

    for (const [elementId, settingKey] of Object.entries(checkboxMap)) {
      const checkbox = document.getElementById(elementId)
      checkbox.checked = this.userSettings[settingKey]

      checkbox.addEventListener('change', async (e) => {
        this.userSettings[settingKey] = e.target.checked
        await ArtManager.instance.setTurnoverAlways(e.target.checked)

        this.applyUserSettings()

        chrome.runtime.sendMessage({
          type: 'userSettingsUpdate',
          payload: { key: settingKey, value: e.target.checked },
        })
      })
    }

    // Handle art provider selection
    const providerSelect = document.getElementById('art-provider')
    providerSelect.value = this.userSettings[NewTabSetting.ART_PROVIDER]

    providerSelect.addEventListener('change', async (e) => {
      const newProvider = e.target.value
      this.userSettings[NewTabSetting.ART_PROVIDER] = newProvider

      // Update the provider and reset to first asset
      await ArtManager.instance.setCurrentProvider(newProvider)
      this.currentAssetIndex = 0
      await ArtManager.instance.setCurrentIndex(0)

      // Sync data first, then get count (avoid parallel calls)
      await ArtManager.instance.syncData()
      this.totalAssets = await ArtManager.instance.syncedAssetCount()

      if (this.totalAssets > 0) {
        await ArtManager.instance.loadImage(this.currentAssetIndex)
        await this.displayCurrentImage()
      } else {
        // Show loading while we wait for the first asset to be fetched
        this.showLoading()

        // Wait for at least one asset to be available
        const checkAssets = async () => {
          const count = await ArtManager.instance.syncedAssetCount()
          if (count > 0) {
            this.totalAssets = count
            await this.displayCurrentImage()
            this.hideLoading()
          } else {
            setTimeout(checkAssets, 1000) // Check again in 1 second
          }
        }
        checkAssets()
      }

      chrome.runtime.sendMessage({
        type: 'userSettingsUpdate',
        payload: { key: NewTabSetting.ART_PROVIDER, value: newProvider },
      })
    })
  }

  openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden')
  }

  closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden')
  }

  async handleAssetUpdate(newAssetIndex) {
    if (newAssetIndex !== undefined) {
      this.currentAssetIndex = newAssetIndex
    } else {
      this.currentAssetIndex = await ArtManager.instance.getCurrentIndex()
    }
    await this.displayCurrentImage()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NewTabPage()
})
