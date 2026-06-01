'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import SearchDialog from './SearchDialog'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/articles', label: 'Articles' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-garden-500 flex items-center justify-center 
                           text-white font-mono font-bold text-sm group-hover:bg-garden-600 transition-colors">
                C
              </div>
              <div className="hidden sm:block">
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  ChenTingToDo
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link py-1 ${
                    pathname === link.href 
                      ? 'active text-gray-900 dark:text-gray-100' 
                      : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Search button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 
                         bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 
                         transition-colors border border-border-light dark:border-border-dark"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs 
                              bg-white dark:bg-zinc-900 rounded border border-border-light dark:border-border-dark">
                  ⌘K
                </kbd>
              </button>

              <ThemeToggle />

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <nav className="mx-auto max-w-5xl px-4 sm:px-6 py-4 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-garden-50 dark:bg-garden-950 text-garden-700 dark:text-garden-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Search Dialog */}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
