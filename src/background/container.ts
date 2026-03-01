import { ArtManager } from './art-manager'
import { ArtService } from './art-service'
import { CacheManager } from './cache-manager'
import { GoogleArtsProvider } from './providers/google-arts-provider'
import { MetMuseumProvider } from './providers/met-museum-provider'

const cacheManager = new CacheManager()
const providers = [
  new GoogleArtsProvider(cacheManager),
  new MetMuseumProvider(cacheManager),
]

export const artManager = new ArtManager(providers)
export const artService = new ArtService(artManager)
