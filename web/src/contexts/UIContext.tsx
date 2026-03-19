import { createContext, useContext, useState, useEffect } from 'react'

type UIState = {
  // 桌面端折叠状态
  sidebarCollapsed: boolean
  outlineCollapsed: boolean
  
  // 移动端抽屉状态
  mobileMenuOpen: boolean
  mobileOutlineOpen: boolean
  mobileSearchOpen: boolean
  
  // Tags modal 状态
  tagsModalOpen: boolean
  tagsModalTab: 'tags' | 'categories' | undefined
  tagsModalSelected: string | undefined
}

type UIActions = {
  setSidebarCollapsed: (collapsed: boolean) => void
  setOutlineCollapsed: (collapsed: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  setMobileOutlineOpen: (open: boolean) => void
  setMobileSearchOpen: (open: boolean) => void
  setTagsModalOpen: (open: boolean) => void
  openTagsModal: (tab: 'tags' | 'categories', selected?: string) => void
}

type UIContextValue = UIState & UIActions

const UIContext = createContext<UIContextValue | null>(null)

const LS_SIDEBAR_COLLAPSED = 'mdserve-sidebar-collapsed'
const LS_OUTLINE_COLLAPSED = 'mdserve-outline-collapsed'

function readBoolFromLocalStorage(key: string, fallback: boolean): boolean {
  try {
    if (typeof window === 'undefined') return fallback
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === '1'
  } catch {
    return fallback
  }
}

function writeBoolToLocalStorage(key: string, value: boolean) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // ignore: localStorage might be unavailable (private mode / quota / browser restrictions)
  }
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  // 默认：文档目录折叠；大纲不折叠（保持默认全展开体验）
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    readBoolFromLocalStorage(LS_SIDEBAR_COLLAPSED, true),
  )
  const [outlineCollapsed, setOutlineCollapsed] = useState<boolean>(() =>
    readBoolFromLocalStorage(LS_OUTLINE_COLLAPSED, false),
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [tagsModalOpen, setTagsModalOpen] = useState(false)
  const [tagsModalTab, setTagsModalTab] = useState<'tags' | 'categories' | undefined>(undefined)
  const [tagsModalSelected, setTagsModalSelected] = useState<string | undefined>(undefined)

  // 全局快捷键 Ctrl/Cmd+K 打开搜索
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setMobileSearchOpen(true)
      }
    }
    
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const openTagsModal = (tab: 'tags' | 'categories', selected?: string) => {
    setTagsModalTab(tab)
    setTagsModalSelected(selected)
    setTagsModalOpen(true)
  }

  const value: UIContextValue = {
    sidebarCollapsed,
    outlineCollapsed,
    mobileMenuOpen,
    mobileOutlineOpen,
    mobileSearchOpen,
    tagsModalOpen,
    tagsModalTab,
    tagsModalSelected,
    setSidebarCollapsed,
    setOutlineCollapsed,
    setMobileMenuOpen,
    setMobileOutlineOpen,
    setMobileSearchOpen,
    setTagsModalOpen,
    openTagsModal,
  }

  // 持久化“隐藏/展示”状态（仅桌面端折叠条）
  useEffect(() => {
    writeBoolToLocalStorage(LS_SIDEBAR_COLLAPSED, sidebarCollapsed)
  }, [sidebarCollapsed])

  useEffect(() => {
    writeBoolToLocalStorage(LS_OUTLINE_COLLAPSED, outlineCollapsed)
  }, [outlineCollapsed])

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
