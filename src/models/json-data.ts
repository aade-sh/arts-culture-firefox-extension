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

export type ArtAssetJson = GoogleArtsJsonData | MetMuseumJsonData
