import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticleBySlug, getArticles } from '@/lib/content'
import TagChip from '@/components/TagChip'
import MarkdownContent from '@/components/MarkdownContent'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  const params = getArticles().map(article => ({
    slug: article.slug,
  }))
  const previewSlug = process.env.NODE_ENV !== 'production'
    ? process.env.ARTICLE_PREVIEW_SLUG
    : undefined

  if (previewSlug && !params.some(param => param.slug === previewSlug) && getArticleBySlug(previewSlug)) {
    params.push({ slug: previewSlug })
  }

  return params
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: '文章未找到' }

  return {
    title: article.frontmatter.title,
    description: article.frontmatter.description || `阅读: ${article.frontmatter.title}`,
    openGraph: {
      title: article.frontmatter.title,
      description: article.frontmatter.description,
      type: 'article',
      publishedTime: article.frontmatter.date,
      tags: article.frontmatter.tags,
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const { title, date, tags, category, description } = article.frontmatter

  // Calculate reading time
  const wordCount = article.content.split(/\s+/).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
        <Link href="/" className="hover:text-garden-600 dark:hover:text-garden-400 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/articles" className="hover:text-garden-600 dark:hover:text-garden-400 transition-colors">
          Articles
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
          {title}
        </span>
      </nav>

      {/* Article header */}
      <header className="mb-10">
        {/* Category badge */}
        <div className="mb-4">
          <Link 
            href={`/articles?category=${encodeURIComponent(category)}`}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                     bg-garden-50 dark:bg-garden-950 
                     text-garden-700 dark:text-garden-300
                     border border-garden-200 dark:border-garden-800
                     hover:bg-garden-100 dark:hover:bg-garden-900 transition-colors"
          >
            {category}
          </Link>
        </div>

        <h1 className="font-mono font-bold text-3xl sm:text-4xl text-gray-900 dark:text-gray-100 leading-tight">
          {title}
        </h1>

        {description && (
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-gray-500 dark:text-gray-400">
          <time dateTime={date} className="font-mono">
            {formatDate(date)}
          </time>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>{readingTime} 分钟阅读</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {tags.length} 个标签
          </span>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map(tag => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>

      {/* Divider */}
      <div className="border-t border-border-light dark:border-border-dark mb-10" />

      {/* Article content */}
      <MarkdownContent content={article.content} />

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between">
          <Link 
            href="/articles"
            className="flex items-center gap-2 text-sm text-garden-600 dark:text-garden-400 
                     hover:text-garden-700 dark:hover:text-garden-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回文章列表
          </Link>

          <a
            href={`https://github.com/ChenTingToDo/chentingtodo-site/edit/main/content/articles/${slug}.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 
                     hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            编辑此页
          </a>
        </div>
      </div>
    </article>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
