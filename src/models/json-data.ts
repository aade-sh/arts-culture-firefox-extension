export interface GoogleArtsJsonData {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: 'google-arts'
}

export interface MetMuseumJsonData {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: 'met-museum'
}

export interface ClevelandArtJsonData {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: 'cleveland-museum'
}

export interface RijksmuseumJsonData {
  id: string
  title: string
  creator: string
  attribution: string
  remoteImageUrl: string
  detailsUrl: string
  provider: 'rijksmuseum'
}

export type ArtAssetJson =
  | GoogleArtsJsonData
  | MetMuseumJsonData
  | ClevelandArtJsonData
  | RijksmuseumJsonData
