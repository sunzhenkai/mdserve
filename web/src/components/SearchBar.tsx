import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { SearchResult } from '../types'

interface SearchBarProps {
  onFileSelect: (path: string) => void
}

export function SearchBar({ onFileSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)

  const searchFiles = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setShowResults(true)
    
    // 防抖搜索
    const timer = setTimeout(() => {
      searchFiles(value)
    }, 300)
    
    return () => clearTimeout(timer)
  }

  const handleSelect = (path: string) => {
    onFileSelect(path)
    setShowResults(false)
    setQuery('')
    setResults([])
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          placeholder="搜索文件..."
          className="search-input"
        />
        {query && (
          <button className="search-clear" onClick={handleClear}>
            <X size={16} />
          </button>
        )}
      </div>
      
      {showResults && (query || results.length > 0) && (
        <div className="search-results">
          {loading ? (
            <div className="search-loading">搜索中...</div>
          ) : results.length === 0 ? (
            query && <div className="search-empty">未找到结果</div>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={() => handleSelect(result.path)}
              >
                <div className="result-name">{result.name}</div>
                <div className="result-path">{result.path}</div>
                {result.matches.length > 0 && (
                  <div className="result-matches">
                    {result.matches.slice(0, 2).map((match, i) => (
                      <div key={i} className="result-match">{match}</div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
