import Link from 'next/link'
import { ArticleData } from '@/lib/content'
import TagChip from './TagChip'

interface ArticleCardProps {
  article: ArticleData
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { title, date, description, tags, category } = article.frontmatter
  const isRecent = isWithinDays(date, 30)

  return (
    <article className={`garden-card-hover p-5 ${isRecent ? 'seedling' : 'evergreen'}`}>
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3">
          <time className="text-xs text-gray-500 dark:text-gray-500 font-mono">
            {formatDate(date)}
          </time>
          {isRecent && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              🌱 New
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full 
                       bg-garden-50 dark:bg-garden-950 
                       text-garden-600 dark:text-garden-400
                       border border-garden-200 dark:border-garden-800">
            {category}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-mono font-bold mb-2">
          <Link
            href={`/articles/${article.slug}`}
            className="text-gray-900 dark:text-gray-100 hover:text-garden-600 dark:hover:text-garden-400 transition-colors"
          >
            {title}
          </Link>
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}
    </article>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return diff < days * 24 * 60 * 60 * 1000
}
