import { getArticles, getAllCategories, getAllTags } from '@/lib/content'
import ArticlesList from './ArticlesList'

export default function ArticlesPage() {
  const articles = getArticles()
  const categories = getAllCategories()
  const tags = getAllTags()

  return (
    <ArticlesList 
      articles={articles}
      categories={categories}
      tags={tags}
    />
  )
}
