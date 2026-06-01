import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const contentDirectory = path.join(process.cwd(), 'content')

export interface ArticleFrontmatter {
  title: string
  date: string
  tags: string[]
  category: string
  description?: string
  published: boolean
}

export interface ProjectFrontmatter {
  title: string
  date: string
  tech: string[]
  github?: string
  description?: string
  published: boolean
}

export interface ArticleData {
  slug: string
  frontmatter: ArticleFrontmatter
  content: string
}

export interface ProjectData {
  slug: string
  frontmatter: ProjectFrontmatter
  content: string
}

// ─── Article Functions ───────────────────────────────────────────

export function getArticleSlugs(): string[] {
  const articlesDir = path.join(contentDirectory, 'articles')
  if (!fs.existsSync(articlesDir)) return []
  return fs.readdirSync(articlesDir)
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/, ''))
}

export function getArticleBySlug(slug: string): ArticleData | null {
  const fullPath = path.join(contentDirectory, 'articles', `${slug}.md`)
  if (!fs.existsSync(fullPath)) return null

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  return {
    slug,
    frontmatter: data as ArticleFrontmatter,
    content,
  }
}

export function getArticles(): ArticleData[] {
  const slugs = getArticleSlugs()
  const articles = slugs
    .map(slug => getArticleBySlug(slug))
    .filter((article): article is ArticleData => 
      article !== null && article.frontmatter.published !== false
    )
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime())

  return articles
}

export function getRecentArticles(count: number = 6): ArticleData[] {
  return getArticles().slice(0, count)
}

export function getAllCategories(): string[] {
  const articles = getArticles()
  const categories = new Set(articles.map(a => a.frontmatter.category))
  return Array.from(categories).sort()
}

export function getAllTags(): string[] {
  const articles = getArticles()
  const tags = new Set(articles.flatMap(a => a.frontmatter.tags || []))
  return Array.from(tags).sort()
}

export function getArticlesByCategory(category: string): ArticleData[] {
  return getArticles().filter(a => a.frontmatter.category === category)
}

export function getArticlesByTag(tag: string): ArticleData[] {
  return getArticles().filter(a => (a.frontmatter.tags || []).includes(tag))
}

// ─── Project Functions ───────────────────────────────────────────

export function getProjectSlugs(): string[] {
  const projectsDir = path.join(contentDirectory, 'projects')
  if (!fs.existsSync(projectsDir)) return []
  return fs.readdirSync(projectsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/, ''))
}

export function getProjectBySlug(slug: string): ProjectData | null {
  const fullPath = path.join(contentDirectory, 'projects', `${slug}.md`)
  if (!fs.existsSync(fullPath)) return null

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  return {
    slug,
    frontmatter: data as ProjectFrontmatter,
    content,
  }
}

export function getProjects(): ProjectData[] {
  const slugs = getProjectSlugs()
  const projects = slugs
    .map(slug => getProjectBySlug(slug))
    .filter((project): project is ProjectData => 
      project !== null && project.frontmatter.published !== false
    )
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime())

  return projects
}

export function getRecentProjects(count: number = 3): ProjectData[] {
  return getProjects().slice(0, count)
}
