'use client'

import { requestSearchOpen } from '@/lib/search'

export default function SearchButton() {
  return (
    <button
      onClick={requestSearchOpen}
      className="w-full flex items-center gap-3 px-4 py-3 
               bg-white dark:bg-zinc-900 
               border border-border-light dark:border-border-dark 
               rounded-xl shadow-sm hover:shadow-md 
               hover:border-garden-300 dark:hover:border-garden-700
               transition-all duration-200 text-left"
    >
      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="flex-1 text-sm text-gray-400 dark:text-gray-500">
        搜索文章... (⌘K)
      </span>
      <kbd className="hidden sm:inline-flex text-xs text-gray-400 dark:text-gray-500 
                    px-1.5 py-0.5 rounded border border-border-light dark:border-border-dark">
        ⌘K
      </kbd>
    </button>
  )
}
