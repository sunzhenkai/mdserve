export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileInfo[]
}

export interface OutlineItem {
  level: number
  text: string
  slug: string
}

export interface SearchResult {
  path: string
  name: string
  matches: string[]
}
