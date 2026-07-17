import { Suspense } from 'react'
import { getArticles, getAllCategories, getAllTags } from '@/lib/content'
import ArticlesList from './ArticlesList'

export default function ArticlesPage() {
  const articles = getArticles()
  const categories = getAllCategories()
  const tags = getAllTags()

  return (
    <Suspense fallback={null}>
      <ArticlesList
        articles={articles}
        categories={categories}
        tags={tags}
      />
    </Suspense>
  )
}
