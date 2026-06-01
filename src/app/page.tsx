import Link from 'next/link'
import { getRecentArticles, getRecentProjects } from '@/lib/content'
import ArticleCard from '@/components/ArticleCard'
import ProjectCard from '@/components/ProjectCard'
import SearchButton from './SearchButton'

export default function Home() {
  const recentArticles = getRecentArticles(6)
  const recentProjects = getRecentProjects(3)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">

      {/* ─── Hero Section ─── */}
      <section className="text-center py-16 sm:py-24">
        {/* Garden icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl 
                     bg-garden-50 dark:bg-garden-950 
                     border border-garden-200 dark:border-garden-800 mb-6">
          <span className="text-3xl">🌱</span>
        </div>

        <h1 className="font-mono font-bold text-4xl sm:text-5xl lg:text-6xl 
                     text-gray-900 dark:text-gray-100 tracking-tight">
          ChenTingToDo
        </h1>

        <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
          记录 AI 学习、项目开发与技术成长过程。
        </p>

        <div className="mt-3">
          <span className="inline-block font-mono text-sm text-garden-600 dark:text-garden-400 
                         bg-garden-50 dark:bg-garden-950 
                         px-4 py-1.5 rounded-full border border-garden-200 dark:border-garden-800">
            Think Less. Do More.
          </span>
        </div>

        {/* Search */}
        <div className="mt-10 max-w-md mx-auto">
          <SearchButton />
        </div>
      </section>

      {/* ─── Recent Articles ─── */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono font-bold text-xl text-gray-900 dark:text-gray-100">
            <span className="text-garden-500">#</span> 最近文章
          </h2>
          <Link 
            href="/articles"
            className="text-sm text-garden-600 dark:text-garden-400 hover:text-garden-700 
                     dark:hover:text-garden-300 transition-colors font-medium"
          >
            查看全部 →
          </Link>
        </div>

        {recentArticles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {recentArticles.map(article => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <div className="garden-card p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              还没有文章。先记录，再优化。
            </p>
          </div>
        )}
      </section>

      {/* ─── Latest Projects ─── */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-mono font-bold text-xl text-gray-900 dark:text-gray-100">
            <span className="text-garden-500">#</span> 最新项目
          </h2>
          <Link 
            href="/projects"
            className="text-sm text-garden-600 dark:text-garden-400 hover:text-garden-700 
                     dark:hover:text-garden-300 transition-colors font-medium"
          >
            查看全部 →
          </Link>
        </div>

        {recentProjects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map(project => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <div className="garden-card p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              还没有项目记录。持续行动，持续积累。
            </p>
          </div>
        )}
      </section>

      {/* ─── Footer tagline ─── */}
      <section className="mt-20 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-600 font-mono">
          &gt; 今天的记录，是未来的资产_
        </p>
      </section>
    </div>
  )
}
