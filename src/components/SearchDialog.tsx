'use client'

import { useEffect, useRef, useState } from 'react'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [pagefindReady, setPagefindReady] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pagefindRef = useRef<any>(null)

  // Load Pagefind dynamically at runtime (not during build)
  useEffect(() => {
    if (!open) return
    if (pagefindRef.current) return

    const loadPagefind = async () => {
      try {
        // Dynamic script tag injection to avoid build-time resolution
        const pagefind = await loadPagefindScript()
        pagefindRef.current = pagefind
        setPagefindReady(true)
      } catch {
        console.log('Pagefind not available. Run `npx pagefind --source out` after build.')
        setPagefindReady(false)
      }
    }
    loadPagefind()
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Search
  useEffect(() => {
    if (!pagefindRef.current || !query.trim()) {
      setResults([])
      return
    }
    const doSearch = async () => {
      setLoading(true)
      try {
        const search = await pagefindRef.current.search(query)
        if (search && search.results) {
          const items = await Promise.all(
            search.results.slice(0, 10).map((r: any) => r.data())
          )
          setResults(items)
        }
      } catch {
        setResults([])
      }
      setLoading(false)
    }
    const timer = setTimeout(doSearch, 300)
    return () => clearTimeout(timer)
  }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl mx-4 bg-white dark:bg-zinc-900 
                      rounded-2xl shadow-2xl border border-border-light dark:border-border-dark
                      overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索文章..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 
                     placeholder-gray-400 dark:placeholder-gray-500 
                     outline-none text-base"
          />
          <kbd className="text-xs text-gray-400 dark:text-gray-500 
                        px-1.5 py-0.5 rounded border border-border-light dark:border-border-dark">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-garden-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && pagefindReady && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>没有找到相关结果</p>
            </div>
          )}

          {!loading && !pagefindReady && query && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">搜索索引尚未生成</p>
              <p className="text-xs mt-1">
                运行 <code className="text-garden-500 bg-garden-50 dark:bg-garden-950 px-1 rounded">npx pagefind --source out</code> 启用搜索
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result: any, i: number) => (
                <a
                  key={i}
                  href={result.url || '#'}
                  onClick={onClose}
                  className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {result.meta?.title || 'Untitled'}
                  </div>
                  {result.meta?.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {result.meta.description}
                    </div>
                  )}
                  {result.excerpt && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1"
                         dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                  )}
                </a>
              ))}
            </div>
          )}

          {!query && !loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              <p>输入关键词搜索文章标题、标签和正文</p>
              <p className="text-xs mt-1">支持中文和英文搜索</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Dynamically load Pagefind by injecting a script tag.
 * This avoids build-time resolution issues with next/static.
 */
async function loadPagefindScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Create a script element pointing to the pagefind bundle
    const script = document.createElement('script')
    script.src = '/pagefind/pagefind.js'
    script.onload = () => {
      // @ts-ignore - pagefind attaches to window
      if (window.pagefind) {
        // @ts-ignore
        resolve(window.pagefind)
      } else {
        reject(new Error('Pagefind loaded but not found on window'))
      }
    }
    script.onerror = () => {
      reject(new Error('Failed to load Pagefind script'))
    }
    document.head.appendChild(script)
  })
}
