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

export interface FileData {
  content: string
  outline: OutlineItem[]
  tags?: string[]
  categories?: string[]
}

export interface MenuItem {
  title: string
  children?: MenuItem[]
  type?: 'doc' | 'category' | 'tag'
  path?: string
  tag?: string
}
