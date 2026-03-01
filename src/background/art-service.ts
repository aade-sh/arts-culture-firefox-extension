import { ArtAsset, ProviderName, UserSettings } from '../types'
import { ArtAssetJson } from '../models/json-data'
import { ArtManager as ArtManagerClass } from './art-manager'
import {
  ArtUpdatedMessage,
  RuntimeMessageType,
  SettingsUpdatedMessage,
} from '../types/runtime-messages'

export type InitializeArtResponseData =
  | { error: string }
  | {
      asset: ArtAssetJson
      imageUrl: string | null
      totalAssets: number
      currentIndex: number
      userSettings: UserSettings
    }

type ArtManagerPort = Pick<
  ArtManagerClass,
  | 'ensureInitialized'
  | 'syncData'
  | 'syncedAssetCount'
  | 'getCurrentIndex'
  | 'setCurrentIndex'
  | 'loadImage'
  | 'getAsset'
  | 'findNextValidAssetIndex'
  | 'getDisplayImageUrl'
  | 'getUserSettings'
  | 'getLastRotatedAt'
  | 'setTurnoverAlways'
  | 'setCurrentProvider'
>

export class ArtService {
  constructor(private readonly artManager: ArtManagerPort) {}

  async handleInstalled(): Promise<void> {
    await this.artManager.ensureInitialized()

    const syncSuccess = await this.artManager.syncData()
    if (!syncSuccess) {
      throw new Error('Failed to sync asset data during installation')
    }

    const totalAssets = await this.artManager.syncedAssetCount()
    if (totalAssets === 0) {
      return
    }

    let currentAssetIndex = await this.artManager.getCurrentIndex()
    if (currentAssetIndex >= totalAssets) {
      currentAssetIndex = 0
      await this.artManager.setCurrentIndex(currentAssetIndex)
    }

    const currentLoad = await this.artManager.loadImage(currentAssetIndex)
    if (!currentLoad) {
      console.warn('Failed to pre-load current image')
    }
  }

  async initializeArt(): Promise<InitializeArtResponseData> {
    await this.artManager.ensureInitialized()

    const syncSuccess = await this.artManager.syncData()
    if (!syncSuccess) {
      return { error: 'Failed to sync art data' }
    }

    const totalAssets = await this.artManager.syncedAssetCount()
    if (totalAssets === 0) {
      return { error: 'No assets available from current provider' }
    }

    let currentAssetIndex = await this.artManager.getCurrentIndex()
    const userSettings = await this.artManager.getUserSettings()

    const ONE_DAY = 24 * 60 * 60 * 1000
    const lastRotatedAt = await this.artManager.getLastRotatedAt()
    const shouldRotateByTime = Date.now() - lastRotatedAt > ONE_DAY
    const shouldRotate =
      userSettings.TURNOVER_ALWAYS === true || shouldRotateByTime

    if (shouldRotate) {
      let nextIndex = currentAssetIndex + 1
      if (nextIndex >= totalAssets) {
        nextIndex = 0
      }

      const validNextIndex = await this.artManager.findNextValidAssetIndex(
        nextIndex,
        totalAssets,
      )
      if (validNextIndex === -1) {
        return { error: 'No valid assets available' }
      }

      currentAssetIndex = validNextIndex
      await this.artManager.setCurrentIndex(validNextIndex)
    }

    let asset = await this.artManager.getAsset(currentAssetIndex)
    if (!asset) {
      const validIndex = await this.artManager.findNextValidAssetIndex(
        currentAssetIndex,
        totalAssets,
      )
      if (validIndex === -1) {
        return { error: 'No valid assets available' }
      }

      currentAssetIndex = validIndex
      await this.artManager.setCurrentIndex(validIndex)
      asset = await this.artManager.getAsset(validIndex)
    }

    if (!asset) {
      return { error: 'Failed to load asset data' }
    }

    await this.artManager.loadImage(currentAssetIndex)
    const imageUrl = await this.artManager.getDisplayImageUrl(currentAssetIndex)

    const latestUserSettings = await this.artManager.getUserSettings()
    if (latestUserSettings.TURNOVER_ALWAYS === true) {
      void this.prefetchNextAssetImage(totalAssets, currentAssetIndex)
    }

    return {
      asset: this.toArtAssetJson(asset),
      imageUrl,
      totalAssets,
      currentIndex: currentAssetIndex,
      userSettings: latestUserSettings,
    }
  }

  async rotateToNext(): Promise<ArtUpdatedMessage | null> {
    await this.artManager.ensureInitialized()

    const totalAssets = await this.artManager.syncedAssetCount()
    if (totalAssets === 0) {
      return null
    }

    const currentAssetIndex = await this.artManager.getCurrentIndex()
    let newIndex = currentAssetIndex + 1
    if (newIndex >= totalAssets) {
      newIndex = 0
    }

    const validIndex = await this.artManager.findNextValidAssetIndex(
      newIndex,
      totalAssets,
    )
    if (validIndex === -1) {
      return null
    }

    await this.artManager.setCurrentIndex(validIndex)

    const asset = await this.artManager.getAsset(validIndex)
    if (!asset) {
      return null
    }

    await this.artManager.loadImage(validIndex)
    const imageUrl = await this.artManager.getDisplayImageUrl(validIndex)
    const userSettings = await this.artManager.getUserSettings()

    return {
      type: RuntimeMessageType.ART_UPDATED,
      asset: this.toArtAssetJson(asset),
      imageUrl,
      totalAssets,
      currentIndex: validIndex,
      userSettings,
    }
  }

  async switchProvider(providerName: ProviderName): Promise<ArtUpdatedMessage | null> {
    await this.artManager.ensureInitialized()

    await this.artManager.setCurrentProvider(providerName)
    await this.artManager.syncData()

    const totalAssets = await this.artManager.syncedAssetCount()
    const validIndex = await this.artManager.findNextValidAssetIndex(
      0,
      totalAssets,
    )

    if (validIndex === -1) {
      return null
    }

    await this.artManager.setCurrentIndex(validIndex)

    const asset = await this.artManager.getAsset(validIndex)
    if (!asset) {
      return null
    }

    await this.artManager.loadImage(validIndex)
    const imageUrl = await this.artManager.getDisplayImageUrl(validIndex)
    const userSettings = await this.artManager.getUserSettings()

    return {
      type: RuntimeMessageType.ART_UPDATED,
      asset: this.toArtAssetJson(asset),
      imageUrl,
      totalAssets,
      currentIndex: validIndex,
      userSettings,
    }
  }

  async setTurnoverAlways(
    turnoverAlwaysEnabled: boolean,
  ): Promise<SettingsUpdatedMessage> {
    await this.artManager.ensureInitialized()
    await this.artManager.setTurnoverAlways(turnoverAlwaysEnabled)
    const userSettings = await this.artManager.getUserSettings()

    return {
      type: RuntimeMessageType.SETTINGS_UPDATED,
      userSettings,
    }
  }

  private async prefetchNextAssetImage(
    totalAssets: number,
    fromIndex: number,
  ): Promise<void> {
    if (totalAssets <= 1) {
      return
    }

    let nextIndex = fromIndex + 1
    if (nextIndex >= totalAssets) {
      nextIndex = 0
    }

    const prefetchedIndex = await this.artManager.findNextValidAssetIndex(
      nextIndex,
      totalAssets,
    )
    if (prefetchedIndex === -1 || prefetchedIndex === fromIndex) {
      return
    }

    const loaded = await this.artManager.loadImage(prefetchedIndex)
    if (!loaded) {
      console.warn(
        `Failed to prefetch image for asset index ${prefetchedIndex}`,
      )
    }
  }

  private toArtAssetJson(asset: ArtAsset): ArtAssetJson {
    return asset.toJSON() as ArtAssetJson
  }
}
