import { getProjects } from '@/lib/content'
import ProjectCard from '@/components/ProjectCard'

export default function ProjectsPage() {
  const projects = getProjects()

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-mono font-bold text-3xl text-gray-900 dark:text-gray-100">
          <span className="text-garden-500">#</span> Projects
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          项目开发记录 · 技术栈 · 实践经验
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-8 text-xs text-gray-400 dark:text-gray-500 font-mono">
        <span>{projects.length} 个项目</span>
      </div>

      {/* Project grid */}
      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      ) : (
        <div className="garden-card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">还没有项目记录</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Build. Learn. Repeat.
          </p>
        </div>
      )}
    </div>
  )
}
