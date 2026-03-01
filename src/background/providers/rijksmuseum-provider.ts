import { ArtProvider } from './art-provider-base'
import { RijksmuseumAsset } from '../../models/rijksmuseum-asset'
import { ArtAsset, PROVIDERS } from '../../types'
import { CacheManager } from '../cache-manager'

interface LinkedDataRef {
  id?: string
}

interface RijksSearchResponse {
  orderedItems?: LinkedDataRef[]
  next?: LinkedDataRef
}

interface RijksIdentifiedEntity {
  type?: string
  content?: string
}

interface RijksTextEntity {
  content?: string
}

interface RijksProductionPart {
  referred_to_by?: RijksTextEntity[]
}

interface RijksTimespan {
  identified_by?: RijksIdentifiedEntity[]
}

interface RijksProduction {
  referred_to_by?: RijksTextEntity[]
  part?: RijksProductionPart[]
  timespan?: RijksTimespan
}

interface RijksObjectResponse {
  id?: string
  identified_by?: RijksIdentifiedEntity[]
  produced_by?: RijksProduction
  shows?: LinkedDataRef[]
}

interface RijksVisualResponse {
  digitally_shown_by?: LinkedDataRef[]
  shown_by?: LinkedDataRef[]
}

interface RijksDigitalResponse {
  access_point?: LinkedDataRef[]
}

export class RijksmuseumProvider extends ArtProvider {
  private _syncedAssetData: (RijksmuseumAsset | null | undefined)[] = []
  private allAvailableIds: string[] = []
  private readonly BASE_URL = 'https://data.rijksmuseum.nl'
  private readonly MAX_IDS = 300
  private readonly MAX_PAGES = 3
  private isSyncing = false

  constructor(cache: CacheManager) {
    super(PROVIDERS.RIJKSMUSEUM, 'Rijksmuseum', cache)
  }

  async syncData(): Promise<boolean> {
    if (this.isSyncing) {
      return true
    }

    if (this.allAvailableIds.length > 0) {
      return true
    }

    try {
      this.isSyncing = true

      const cachedIds = await this.getCachedData<string[]>('ids')
      if (cachedIds && cachedIds.length > 0) {
        this.allAvailableIds = cachedIds
        return true
      }

      const ids = await this.fetchCollectionIds()
      this.allAvailableIds = ids
      await this.setCachedData('ids', ids)

      return true
    } catch (error) {
      console.error('Failed to sync Rijksmuseum data:', error)
      return false
    } finally {
      this.isSyncing = false
    }
  }

  async syncedAssetCount(): Promise<number> {
    if (this.allAvailableIds.length === 0) {
      await this.syncData()
    }

    return this.allAvailableIds.length
  }

  async getAsset(index: number): Promise<ArtAsset | null> {
    if (this.allAvailableIds.length === 0) {
      await this.syncData()
    }

    if (index < 0 || index >= this.allAvailableIds.length) {
      return null
    }

    const cachedAsset = this._syncedAssetData[index]
    if (cachedAsset !== undefined) {
      return cachedAsset
    }

    try {
      const recordId = this.allAvailableIds[index]
      const object = await this.fetchJson<RijksObjectResponse>(
        `${this.BASE_URL}/${recordId}`,
      )
      if (!object) {
        this._syncedAssetData[index] = null
        return null
      }

      const imageUrl = await this.resolveImageUrl(object)
      if (!imageUrl) {
        this._syncedAssetData[index] = null
        return null
      }

      const objectNumber = this.extractObjectNumber(object)
      const asset = RijksmuseumAsset.fromApiResponse({
        id: recordId,
        title: this.extractTitle(object),
        creator: this.extractCreator(object),
        attribution: this.extractAttribution(object),
        imageUrl,
        detailsUrl: objectNumber
          ? `https://www.rijksmuseum.nl/en/collection/${encodeURIComponent(objectNumber)}`
          : `https://id.rijksmuseum.nl/${recordId}`,
      })

      if (!asset.isValid()) {
        this._syncedAssetData[index] = null
        return null
      }

      this._syncedAssetData[index] = asset
      return asset
    } catch (error) {
      console.error(`Failed to fetch Rijksmuseum asset ${index}:`, error)
      this._syncedAssetData[index] = null
      return null
    }
  }

  async getDisplayImageUrl(assetId: number): Promise<string | null> {
    const asset = await this.getAsset(assetId)
    if (!asset) {
      return null
    }

    return asset.getDisplayImageUrl()
  }

  getDetailsUrl(asset: ArtAsset): string {
    return asset.getDetailsUrl()
  }

  private async fetchCollectionIds(): Promise<string[]> {
    const ids = new Set<string>()
    let pageUrl: string | null =
      `${this.BASE_URL}/search/collection?type=painting&imageAvailable=true`
    let pageCount = 0

    while (pageUrl && ids.size < this.MAX_IDS && pageCount < this.MAX_PAGES) {
      const payload: RijksSearchResponse | null =
        await this.fetchJson<RijksSearchResponse>(pageUrl)
      if (!payload) {
        break
      }

      const orderedItems = Array.isArray(payload.orderedItems)
        ? payload.orderedItems
        : []

      for (const item of orderedItems) {
        const recordId = this.extractRecordId(item.id)
        if (recordId) {
          ids.add(recordId)
        }

        if (ids.size >= this.MAX_IDS) {
          break
        }
      }

      pageUrl = payload.next?.id || null
      pageCount += 1
    }

    return Array.from(ids)
  }

  private async resolveImageUrl(
    object: RijksObjectResponse,
  ): Promise<string | null> {
    const visualRecordId = this.extractRecordId(object.shows?.[0]?.id)
    if (!visualRecordId) {
      return null
    }

    const visualObject = await this.fetchJson<RijksVisualResponse>(
      `${this.BASE_URL}/${visualRecordId}`,
    )
    if (!visualObject) {
      return null
    }

    const digitalRecordId = this.extractRecordId(
      visualObject.digitally_shown_by?.[0]?.id || visualObject.shown_by?.[0]?.id,
    )
    if (!digitalRecordId) {
      return null
    }

    const digitalObject = await this.fetchJson<RijksDigitalResponse>(
      `${this.BASE_URL}/${digitalRecordId}`,
    )
    if (!digitalObject) {
      return null
    }

    const imageUrl = digitalObject.access_point?.[0]?.id
    return typeof imageUrl === 'string' && imageUrl.length > 0 ? imageUrl : null
  }

  private extractRecordId(idOrUrl: string | undefined): string | null {
    if (!idOrUrl) {
      return null
    }

    if (!idOrUrl.startsWith('http://') && !idOrUrl.startsWith('https://')) {
      return idOrUrl
    }

    try {
      const parsedUrl = new URL(idOrUrl)
      const pathname = parsedUrl.pathname.replace(/^\/+/, '')
      return pathname || null
    } catch {
      return null
    }
  }

  private extractTitle(object: RijksObjectResponse): string {
    const names = (object.identified_by || []).filter(
      (entry) => entry.type === 'Name' && typeof entry.content === 'string',
    )
    return names[0]?.content || 'Untitled'
  }

  private extractObjectNumber(object: RijksObjectResponse): string | null {
    const identifiers = (object.identified_by || []).filter(
      (entry) => entry.type === 'Identifier' && typeof entry.content === 'string',
    )

    const objectNumber = identifiers.find((entry) =>
      /[A-Za-z]/.test(entry.content || '') && /\d/.test(entry.content || ''),
    )

    return objectNumber?.content || null
  }

  private extractCreator(object: RijksObjectResponse): string {
    const candidates: string[] = []

    const producedByNotes = object.produced_by?.referred_to_by || []
    for (const note of producedByNotes) {
      if (note.content) {
        candidates.push(note.content)
      }
    }

    const productionParts = object.produced_by?.part || []
    for (const part of productionParts) {
      for (const note of part.referred_to_by || []) {
        if (note.content) {
          candidates.push(note.content)
        }
      }
    }

    for (const candidate of candidates) {
      const cleaned = candidate
        .replace(/^(painter|schilder|artist):\s*/i, '')
        .split(',')[0]
        .trim()
      if (cleaned) {
        return cleaned
      }
    }

    return 'Unknown Artist'
  }

  private extractAttribution(object: RijksObjectResponse): string {
    const timespanNames = object.produced_by?.timespan?.identified_by || []
    const first = timespanNames.find(
      (entry) => entry.type === 'Name' && typeof entry.content === 'string',
    )
    return first?.content || ''
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const response = await fetch(url, {
      ...this.DATA_REQUEST_OPTIONS,
      mode: 'cors',
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  }
}
