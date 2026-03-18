import { useState, useEffect } from 'react'
import { FileTree } from './components/FileTree'
import { MarkdownViewer } from './components/MarkdownViewer'
import { Outline } from './components/Outline'
import { SearchBar } from './components/SearchBar'
import { ThemeToggle } from './components/ThemeToggle'
import { useWebSocket } from './hooks/useWebSocket'
import { useTheme } from './hooks/useTheme'
import { FileInfo, OutlineItem } from './types'

function App() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [loading, setLoading] = useState(false)
  
  const { theme, toggleTheme } = useTheme()
  const wsMessage = useWebSocket('/ws')

  // 加载文件树
  useEffect(() => {
    fetch('/api/files')
      .then(res => res.json())
      .then(data => setFiles(data.files || []))
      .catch(console.error)
  }, [])

  // WebSocket 消息处理 - 实时刷新
  useEffect(() => {
    if (wsMessage && currentFile) {
      const msg = JSON.parse(wsMessage)
      if (msg.type === 'reload' && msg.path === currentFile) {
        loadFile(currentFile)
      }
    }
  }, [wsMessage, currentFile])

  const loadFile = async (path: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      setContent(data.content || '')
      setOutline(data.outline || [])
      setCurrentFile(path)
    } catch (error) {
      console.error('Failed to load file:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (path: string) => {
    loadFile(path)
  }

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div className="header-left">
          <h1 className="logo">mdserve</h1>
        </div>
        <div className="header-center">
          <SearchBar onFileSelect={handleFileSelect} />
        </div>
        <div className="header-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      
      <main className="main">
        <aside className="sidebar">
          <FileTree 
            files={files} 
            onSelect={handleFileSelect}
            selectedPath={currentFile}
          />
        </aside>
        
        <div className="content-wrapper">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : content ? (
            <MarkdownViewer content={content} />
          ) : (
            <div className="empty-state">
              <p>请从左侧选择一个 Markdown 文件开始浏览</p>
            </div>
          )}
        </div>
        
        <aside className="outline-sidebar">
          {outline.length > 0 && <Outline items={outline} />}
        </aside>
      </main>
    </div>
  )
}

export default App
