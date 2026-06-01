'use client'

import { useState, useMemo } from 'react'
import { ArticleData } from '@/lib/content'
import ArticleCard from '@/components/ArticleCard'
import TagChip from '@/components/TagChip'

interface ArticlesListProps {
  articles: ArticleData[]
  categories: string[]
  tags: string[]
}

export default function ArticlesList({ articles, categories, tags }: ArticlesListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)

  const filtered = useMemo(() => {
    let result = articles
    if (selectedCategory) {
      result = result.filter(a => a.frontmatter.category === selectedCategory)
    }
    if (selectedTag) {
      result = result.filter(a => (a.frontmatter.tags || []).includes(selectedTag))
    }
    return result
  }, [articles, selectedCategory, selectedTag])

  const visibleArticles = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-mono font-bold text-3xl text-gray-900 dark:text-gray-100">
          <span className="text-garden-500">#</span> Articles
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          学习笔记 · 环境配置 · 项目日志 · 踩坑记录 · 学习反思
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-8">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedCategory(null); setVisibleCount(10) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-garden-500 text-white'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setVisibleCount(10) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-garden-500 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setVisibleCount(10) }}
              >
                <TagChip 
                  tag={tag} 
                  clickable={false}
                  className={`cursor-pointer transition-all ${
                    selectedTag === tag 
                      ? 'ring-2 ring-garden-500 dark:ring-garden-400' 
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 font-mono">
        {filtered.length} 篇文章
      </p>

      {/* Article grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleArticles.map(article => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setVisibleCount(c => c + 10)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium
                         bg-gray-100 dark:bg-zinc-800 
                         text-gray-700 dark:text-gray-300
                         hover:bg-gray-200 dark:hover:bg-zinc-700
                         border border-border-light dark:border-border-dark
                         transition-colors"
              >
                加载更多 ({filtered.length - visibleCount} 篇)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="garden-card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">没有找到文章</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            试试其他分类或标签
          </p>
        </div>
      )}
    </div>
  )
}
