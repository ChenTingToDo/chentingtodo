'use client'

import { useState, useEffect } from 'react'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check stored preference or system preference
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => {
    const newDark = !dark
    setDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  if (!mounted) {
    return <div className={`w-9 h-9 ${className}`} />
  }

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-lg text-gray-600 dark:text-gray-400 
                 hover:bg-gray-100 dark:hover:bg-zinc-800 
                 hover:text-gray-900 dark:hover:text-gray-100
                 transition-colors ${className}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  )
}
