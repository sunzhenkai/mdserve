import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
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
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          placeholder="搜索文件..."
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showResults && (query || results.length > 0) && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50">
          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">搜索中...</div>
            ) : results.length === 0 ? (
              query && <div className="p-4 text-sm text-muted-foreground text-center">未找到结果</div>
            ) : (
              results.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 cursor-pointer transition-colors hover:bg-accent",
                    index !== results.length - 1 && "border-b border-border"
                  )}
                  onClick={() => handleSelect(result.path)}
                >
                  <div className="font-medium text-sm mb-1">{result.name}</div>
                  <div className="text-xs text-muted-foreground mb-1">{result.path}</div>
                  {result.matches.length > 0 && (
                    <div className="mt-2">
                      {result.matches.slice(0, 2).map((match, i) => (
                        <div key={i} className="text-xs text-muted-foreground truncate">{match}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
