import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import {
  formatArticleIssues,
  isSafeArticleSlug,
  validateArticleDocument,
  type ArticleValidationIssue,
} from '../src/lib/article-schema'

interface PrepareOptions {
  rootDir?: string
  slug?: string
  type?: 'troubleshooting' | 'learning' | 'project'
  tags?: string[]
  description?: string
}

interface PublishOptions {
  rootDir?: string
  runChecks?: (rootDir: string) => boolean
}

interface OnlineArticleResult {
  slug: string
  articlePath: string
  commit: string
  url: string
  deploymentVerified: boolean
}

interface PreparedArticle {
  slug: string
  draftPath: string
  title: string
  description: string
  tags: string[]
}

export interface SuggestedArticleMetadata {
  title: string
  description: string
  tags: string[]
  type: NonNullable<PrepareOptions['type']>
}

const categoryByType = {
  troubleshooting: '问题复盘',
  learning: '学习记录',
  project: '项目记录',
} as const

const tagRules: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /google\s+search\s+console|search\s+console/i, tags: ['Google Search Console', 'SEO'] },
  { pattern: /\bvercel\b/i, tags: ['Vercel'] },
  { pattern: /\bnext\.?js\b/i, tags: ['Next.js'] },
  { pattern: /\bgithub\b/i, tags: ['GitHub'] },
  { pattern: /\bcloudflare\b/i, tags: ['Cloudflare'] },
  { pattern: /\bdns\b|域名/i, tags: ['DNS', '域名'] },
  { pattern: /\bcodex\b/i, tags: ['Codex'] },
  { pattern: /\bskills?\b/i, tags: ['Skills'] },
  { pattern: /\bmcp\b/i, tags: ['MCP'] },
  { pattern: /\bobsidian\b/i, tags: ['Obsidian'] },
  { pattern: /知识库|知识图谱/i, tags: ['知识管理'] },
  { pattern: /embedding|向量数据库|chunking/i, tags: ['RAG'] },
  { pattern: /smartrecipes/i, tags: ['SmartRecipes'] },
  { pattern: /chentingtodo/i, tags: ['ChenTingToDo'] },
  { pattern: /个人网站|网站从零|网站上线/i, tags: ['个人网站'] },
  { pattern: /产品设计|用户痛点|产品定位/i, tags: ['产品设计'] },
  { pattern: /\bdocker\b/i, tags: ['Docker'] },
  { pattern: /\bpython\b/i, tags: ['Python'] },
  { pattern: /\bai\b|人工智能/i, tags: ['AI'] },
]

export function suggestArticleMetadata(
  sourcePath: string,
  options: Pick<PrepareOptions, 'type'> = {},
): SuggestedArticleMetadata {
  const absoluteSource = path.resolve(sourcePath)
  if (!fs.existsSync(absoluteSource) || !fs.statSync(absoluteSource).isFile()) {
    throw new Error(`找不到原稿文件：${absoluteSource}`)
  }
  const source = fs.readFileSync(absoluteSource, 'utf8').replace(/^\uFEFF/, '')
  const parsed = matter(source)
  const extracted = extractLeadingTitle(parsed.content)
  const title = typeof parsed.data.title === 'string' && parsed.data.title.trim()
    ? parsed.data.title.trim()
    : extracted.title || cleanFileTitle(path.basename(absoluteSource, path.extname(absoluteSource)))
  const type = options.type ?? inferArticleType(title)
  const existingDescription = typeof parsed.data.description === 'string'
    ? parsed.data.description.trim()
    : ''
  const description = existingDescription && !/^(?:todo|待补充|请补充)/i.test(existingDescription)
    ? existingDescription
    : createSuggestedDescription(title, type)
  const existingTags = Array.isArray(parsed.data.tags)
    ? parsed.data.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '')
    : []
  const tags = existingTags.length > 0
    ? uniqueTags(existingTags).slice(0, 5)
    : inferTags(title, parsed.content, type)
  return { title, description, tags, type }
}

export function prepareArticle(sourcePath: string, options: PrepareOptions = {}): PreparedArticle {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  const absoluteSource = path.resolve(sourcePath)
  if (!fs.existsSync(absoluteSource) || !fs.statSync(absoluteSource).isFile()) {
    throw new Error(`找不到原稿文件：${absoluteSource}`)
  }
  if (path.extname(absoluteSource).toLowerCase() !== '.md') {
    throw new Error('原稿必须是 .md 文件。')
  }

  const source = fs.readFileSync(absoluteSource, 'utf8').replace(/^\uFEFF/, '')
  const parsed = matter(source)
  const extracted = extractLeadingTitle(parsed.content)
  const title = typeof parsed.data.title === 'string' && parsed.data.title.trim()
    ? parsed.data.title.trim()
    : extracted.title || cleanFileTitle(path.basename(absoluteSource, path.extname(absoluteSource)))
  const generatedSlug = createSlug(title, absoluteSource)
  const slug = options.slug ?? findAvailableSlug(rootDir, generatedSlug)

  if (!isSafeArticleSlug(slug)) {
    throw new Error(`slug“${slug}”不合法，只能使用小写字母、数字和连字符。`)
  }

  const draftsDir = path.join(rootDir, 'content', 'drafts')
  const articlesDir = path.join(rootDir, 'content', 'articles')
  const draftPath = path.join(draftsDir, `${slug}.md`)
  const articlePath = path.join(articlesDir, `${slug}.md`)
  if (fs.existsSync(draftPath) || fs.existsSync(articlePath)) {
    throw new Error(`slug“${slug}”已经存在，未覆盖任何文件。请使用 --slug 指定新名称。`)
  }
  const duplicateTitle = findDuplicateTitle(rootDir, slug, title)[0]
  if (duplicateTitle) {
    throw new Error(`${duplicateTitle.message} 请在小应用中点击“继续已有草稿”，不要重复导入。`)
  }

  const date = typeof parsed.data.date === 'string' && isDate(parsed.data.date)
    ? parsed.data.date
    : inferDate(absoluteSource) ?? todayInChina()
  const suggestions = suggestArticleMetadata(absoluteSource, { type: options.type })
  const tags = options.tags && options.tags.length > 0 ? uniqueTags(options.tags) : suggestions.tags
  const category = typeof parsed.data.category === 'string' && parsed.data.category.trim()
    ? parsed.data.category.trim()
    : categoryByType[suggestions.type]
  const description = options.description?.trim()
    || (typeof parsed.data.description === 'string' && parsed.data.description.trim()
    ? parsed.data.description.trim()
    : suggestions.description)
  const content = normalizeImportedHeadings(extracted.content)
  const output = matter.stringify(content.trimStart(), {
    title,
    date,
    tags,
    category,
    description,
    published: false,
  })

  fs.mkdirSync(draftsDir, { recursive: true })
  fs.writeFileSync(draftPath, output, 'utf8')
  return { slug, draftPath, title, description, tags }
}

export function checkArticleBySlug(
  slug: string,
  options: { rootDir?: string; forPublish?: boolean } = {},
): ArticleValidationIssue[] {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  assertSlug(slug)
  const located = locateArticle(rootDir, slug)
  if (!located) throw new Error(`找不到 slug 为“${slug}”的草稿或文章。`)
  const parsed = matter(fs.readFileSync(located.filePath, 'utf8'))
  const data = located.kind === 'draft' && options.forPublish !== false
    ? { ...parsed.data, published: true }
    : parsed.data
  const sourcePath = located.kind === 'draft' && options.forPublish !== false
    ? path.join(rootDir, 'content', 'articles', `${slug}.md`)
    : located.filePath
  const issues = validateArticleDocument({
    slug,
    data,
    content: parsed.content,
    forPublish: options.forPublish ?? located.kind === 'draft',
    sourcePath,
  })
  issues.push(...validateArticleAssets(rootDir, slug, parsed.content, located.kind))
  issues.push(...findDuplicateTitle(rootDir, slug, parsed.data.title))
  return issues
}

export function repairDraftMetadata(
  slug: string,
  options: { rootDir?: string } = {},
): string[] {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  assertSlug(slug)
  const draftPath = path.join(rootDir, 'content', 'drafts', `${slug}.md`)
  if (!fs.existsSync(draftPath)) return []
  const parsed = matter(fs.readFileSync(draftPath, 'utf8'))
  const category = typeof parsed.data.category === 'string' ? parsed.data.category : ''
  const type: NonNullable<PrepareOptions['type']> = category.includes('问题')
    ? 'troubleshooting'
    : category.includes('项目') ? 'project' : 'learning'
  const suggestions = suggestArticleMetadata(draftPath, { type })
  const updated = { ...parsed.data }
  const fixes: string[] = []
  if (!Array.isArray(updated.tags) || updated.tags.length === 0) {
    updated.tags = suggestions.tags
    fixes.push(`已自动补全标签：${suggestions.tags.join('、')}`)
  }
  if (typeof updated.description !== 'string' || !updated.description.trim()
    || /^(?:todo|待补充|请补充)/i.test(updated.description.trim())) {
    updated.description = suggestions.description
    fixes.push(`已自动补全一句话摘要：${suggestions.description}`)
  }
  if (fixes.length > 0) {
    fs.writeFileSync(draftPath, matter.stringify(parsed.content.trimStart(), updated), 'utf8')
  }
  return fixes
}

export function checkPublishedArticles(rootDir = process.cwd()): Map<string, ArticleValidationIssue[]> {
  const absoluteRoot = path.resolve(rootDir)
  const articlesDir = path.join(absoluteRoot, 'content', 'articles')
  const results = new Map<string, ArticleValidationIssue[]>()
  if (!fs.existsSync(articlesDir)) return results

  for (const fileName of fs.readdirSync(articlesDir).filter(name => name.endsWith('.md')).sort()) {
    const slug = fileName.slice(0, -3)
    const parsed = matter(fs.readFileSync(path.join(articlesDir, fileName), 'utf8'))
    const issues = validateArticleDocument({
      slug,
      data: parsed.data,
      content: parsed.content,
      forPublish: parsed.data.published === true,
      sourcePath: path.join(articlesDir, fileName),
    })
    issues.push(...validateArticleAssets(absoluteRoot, slug, parsed.content, 'article'))
    issues.push(...findDuplicateTitle(absoluteRoot, slug, parsed.data.title, ['articles']))
    results.set(slug, issues)
  }
  return results
}

export function publishArticle(slug: string, options: PublishOptions = {}): string {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  assertSlug(slug)
  const draftPath = path.join(rootDir, 'content', 'drafts', `${slug}.md`)
  const articlePath = path.join(rootDir, 'content', 'articles', `${slug}.md`)
  const draftAssetsPath = getDraftAssetsPath(rootDir, slug)
  const articleAssetsPath = getArticleAssetsPath(rootDir, slug)
  if (!fs.existsSync(draftPath)) throw new Error(`找不到草稿：${draftPath}`)
  if (fs.existsSync(articlePath)) throw new Error(`正式文章已存在：${articlePath}`)
  if (fs.existsSync(articleAssetsPath)) throw new Error(`正式图片目录已存在，未覆盖任何图片：${articleAssetsPath}`)

  const originalDraft = fs.readFileSync(draftPath, 'utf8')
  const parsed = matter(originalDraft)
  const publishedData = { ...parsed.data, published: true }
  const issues = validateArticleDocument({
    slug,
    data: publishedData,
    content: parsed.content,
    forPublish: true,
    sourcePath: articlePath,
  })
  issues.push(...validateArticleAssets(rootDir, slug, parsed.content, 'draft'))
  issues.push(...findDuplicateTitle(rootDir, slug, parsed.data.title))
  const errors = issues.filter(issue => issue.level === 'error')
  if (errors.length > 0) {
    throw new Error(['文章尚未达到发布条件：', ...formatArticleIssues(draftPath, errors)].join(os.EOL))
  }

  const runChecks = options.runChecks ?? runProjectChecks
  let copiedAssets = false
  try {
    if (fs.existsSync(draftAssetsPath)) {
      fs.mkdirSync(path.dirname(articleAssetsPath), { recursive: true })
      fs.cpSync(draftAssetsPath, articleAssetsPath, { recursive: true, errorOnExist: true, force: false })
      copiedAssets = true
    }
    fs.mkdirSync(path.dirname(articlePath), { recursive: true })
    fs.writeFileSync(articlePath, matter.stringify(parsed.content.trimStart(), publishedData), 'utf8')
    fs.rmSync(draftPath)
    if (!runChecks(rootDir)) throw new Error('网站完整检查失败。')
    if (fs.existsSync(draftAssetsPath)) fs.rmSync(draftAssetsPath, { recursive: true })
    return articlePath
  } catch {
    if (fs.existsSync(articlePath)) fs.rmSync(articlePath)
    if (copiedAssets && fs.existsSync(articleAssetsPath)) {
      fs.rmSync(articleAssetsPath, { recursive: true, force: true })
    }
    fs.rmSync(path.join(rootDir, 'out'), { recursive: true, force: true })
    fs.mkdirSync(path.dirname(draftPath), { recursive: true })
    fs.writeFileSync(draftPath, originalDraft, 'utf8')
    throw new Error('发布前完整检查失败，已恢复原草稿和草稿图片，没有留下半发布内容。')
  }
}

export async function publishArticleOnline(
  slug: string,
  options: PublishOptions = {},
): Promise<OnlineArticleResult> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  assertSlug(slug)
  const draftPath = path.join(rootDir, 'content', 'drafts', `${slug}.md`)
  const articlePath = path.join(rootDir, 'content', 'articles', `${slug}.md`)
  if (fs.existsSync(draftPath)) {
    publishArticle(slug, options)
  } else if (fs.existsSync(articlePath)) {
    const issues = checkArticleBySlug(slug, { rootDir, forPublish: true })
    const errors = issues.filter(issue => issue.level === 'error')
    if (errors.length > 0) {
      throw new Error(['文章尚未达到上线条件：', ...formatArticleIssues(articlePath, errors)].join(os.EOL))
    }
    const runChecks = options.runChecks ?? runProjectChecks
    if (!runChecks(rootDir)) throw new Error('网站完整检查失败，文章尚未推送线上。')
  } else {
    throw new Error(`找不到草稿或正式文章：${slug}`)
  }

  const articleAssetsPath = getArticleAssetsPath(rootDir, slug)
  const publishPaths = [articlePath]
  if (fs.existsSync(articleAssetsPath)) publishPaths.push(articleAssetsPath)
  ensureGitCanPublishArticle(rootDir, publishPaths)
  const relativePublishPaths = publishPaths.map(filePath => toGitPath(path.relative(rootDir, filePath)))
  runGit(rootDir, ['add', '--', ...relativePublishPaths])
  if (runGit(rootDir, ['status', '--porcelain', '--', ...relativePublishPaths]).trim()) {
    runGit(rootDir, [
      'commit',
      '--only',
      '-m',
      `content: publish ${slug}`,
      '--',
      ...relativePublishPaths,
    ])
  }
  const commit = runGit(rootDir, ['rev-parse', 'HEAD']).trim()
  runGit(rootDir, ['push', 'origin', 'HEAD:main'])
  const deploymentVerified = await waitForProductionDeployment(commit)
  return {
    slug,
    articlePath,
    commit,
    url: `https://www.chentingtodo.com/articles/${slug}`,
    deploymentVerified,
  }
}

function ensureGitCanPublishArticle(rootDir: string, publishPaths: string[]): void {
  runGit(rootDir, ['rev-parse', '--is-inside-work-tree'])
  runGit(rootDir, ['fetch', 'origin', 'main'])
  const counts = runGit(rootDir, ['rev-list', '--left-right', '--count', 'origin/main...HEAD'])
    .trim().split(/\s+/).map(Number)
  const [behind = 0, ahead = 0] = counts
  if (behind > 0) {
    throw new Error('线上代码比本机更新。为避免覆盖他人修改，请先让 Codex 同步项目后再上线。')
  }
  if (ahead > 0) {
    const allowedPaths = publishPaths.map(filePath => toGitPath(path.relative(rootDir, filePath)))
    const aheadPaths = runGit(rootDir, ['diff', '--name-only', 'origin/main..HEAD'])
      .split(/\r?\n/).map(value => value.trim()).filter(Boolean)
    if (aheadPaths.some(changedPath => !allowedPaths.some(allowedPath => (
      changedPath === allowedPath || changedPath.startsWith(`${allowedPath}/`)
    )))) {
      throw new Error('本机还有其他尚未上线的代码提交。请先让 Codex 检查并同步，再发布文章。')
    }
  }
}

function getDraftAssetsPath(rootDir: string, slug: string): string {
  return path.join(rootDir, 'content', 'draft-assets', slug)
}

function getArticleAssetsPath(rootDir: string, slug: string): string {
  return path.join(rootDir, 'public', 'images', 'articles', slug)
}

function validateArticleAssets(
  rootDir: string,
  slug: string,
  content: string,
  kind: 'draft' | 'article',
): ArticleValidationIssue[] {
  const issues: ArticleValidationIssue[] = []
  const assetRoot = kind === 'draft' ? getDraftAssetsPath(rootDir, slug) : getArticleAssetsPath(rootDir, slug)
  const expectedPrefix = `/images/articles/${slug}/`
  let fence: '`' | '~' | null = null

  content.split(/\r?\n/).forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~'
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      return
    }
    if (fence !== null) return

    for (const match of line.matchAll(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
      const alt = match[1].trim()
      const target = match[2].split(/[?#]/)[0]
      if (target.startsWith('/images/articles/') && !target.startsWith(expectedPrefix)) {
        issues.push({
          level: 'error',
          line: index + 1,
          message: `图片不属于当前文章目录：${target}`,
          suggestion: `使用发布工具重新插图，图片应位于 ${expectedPrefix}`,
        })
        continue
      }
      if (!target.startsWith(expectedPrefix)) continue
      const fileName = target.slice(expectedPrefix.length)
      if (!/^[a-z0-9][a-z0-9-]*\.(?:png|jpe?g)$/i.test(fileName)) {
        issues.push({
          level: 'error',
          line: index + 1,
          message: `图片文件名不安全：${fileName}`,
          suggestion: '使用发布工具重新插图，让工具自动重命名。',
        })
        continue
      }
      if (!alt) {
        issues.push({
          level: 'error',
          line: index + 1,
          message: `图片缺少说明文字：${fileName}`,
          suggestion: '在图片方括号内填写访客能理解的简短说明。',
        })
      }
      const filePath = path.join(assetRoot, fileName)
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        issues.push({
          level: 'error',
          line: index + 1,
          message: `找不到文章图片：${target}`,
          suggestion: '在发布工具中重新选择这张图片。',
        })
      } else if (fs.statSync(filePath).size > 1_500_000) {
        issues.push({
          level: 'error',
          line: index + 1,
          message: `图片超过 1.5 MB：${fileName}`,
          suggestion: '使用发布工具重新插图并自动压缩。',
        })
      }
    }
  })
  return issues
}

function runGit(rootDir: string, args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: rootDir,
      encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const details = error && typeof error === 'object' && 'stderr' in error
      ? String(error.stderr).trim()
      : ''
    throw new Error(`Git 操作失败：${details || args.join(' ')}`)
  }
}

function toGitPath(value: string): string {
  return value.split(path.sep).join('/')
}

async function waitForProductionDeployment(commit: string): Promise<boolean> {
  const deadline = Date.now() + 4 * 60 * 1_000
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'ChenTingToDo-ArticlePublisher' }
  while (Date.now() < deadline) {
    try {
      const deploymentsResponse = await fetch(
        `https://api.github.com/repos/ChenTingToDo/chentingtodo-site/deployments?sha=${commit}&environment=Production&per_page=1`,
        { headers, signal: AbortSignal.timeout(8_000) },
      )
      if (deploymentsResponse.ok) {
        const deployments = await deploymentsResponse.json() as Array<{ statuses_url?: string }>
        const statusesUrl = deployments[0]?.statuses_url
        if (statusesUrl) {
          const statusesResponse = await fetch(statusesUrl, { headers, signal: AbortSignal.timeout(8_000) })
          if (statusesResponse.ok) {
            const statuses = await statusesResponse.json() as Array<{ state?: string }>
            const state = statuses[0]?.state
            if (state === 'success') return true
            if (state === 'error' || state === 'failure') {
              throw new Error('Vercel 生产部署失败，请打开 Vercel 查看构建日志。')
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('生产部署失败')) throw error
    }
    await new Promise(resolve => setTimeout(resolve, 10_000))
  }
  return false
}

function runProjectChecks(rootDir: string): boolean {
  const npmCli = process.env.npm_execpath
  try {
    if (npmCli) {
      execFileSync(process.execPath, [npmCli, 'run', 'check'], {
        cwd: rootDir,
        env: { ...process.env, ARTICLE_PREVIEW_SLUG: '' },
        stdio: 'inherit',
      })
    } else {
      execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'check'], {
        cwd: rootDir,
        env: { ...process.env, ARTICLE_PREVIEW_SLUG: '' },
        shell: process.platform === 'win32',
        stdio: 'inherit',
      })
    }
    return true
  } catch {
    return false
  }
}

function locateArticle(rootDir: string, slug: string): { filePath: string; kind: 'draft' | 'article' } | null {
  const draftPath = path.join(rootDir, 'content', 'drafts', `${slug}.md`)
  if (fs.existsSync(draftPath)) return { filePath: draftPath, kind: 'draft' }
  const articlePath = path.join(rootDir, 'content', 'articles', `${slug}.md`)
  if (fs.existsSync(articlePath)) return { filePath: articlePath, kind: 'article' }
  return null
}

function findDuplicateTitle(
  rootDir: string,
  currentSlug: string,
  title: unknown,
  directories = ['articles', 'drafts'],
): ArticleValidationIssue[] {
  if (typeof title !== 'string' || title.trim() === '') return []
  for (const directory of directories) {
    const contentDir = path.join(rootDir, 'content', directory)
    if (!fs.existsSync(contentDir)) continue
    for (const fileName of fs.readdirSync(contentDir).filter(name => name.endsWith('.md'))) {
      const slug = fileName.slice(0, -3)
      if (slug === currentSlug) continue
      const other = matter(fs.readFileSync(path.join(contentDir, fileName), 'utf8'))
      if (typeof other.data.title === 'string' && other.data.title.trim() === title.trim()) {
        return [{
          level: 'error',
          message: `同标题文章已经存在：${directory}/${fileName}。`,
          suggestion: directory === 'drafts' ? '在小应用中点击“继续已有草稿”。' : '不要重复发布同一篇文章。',
        }]
      }
    }
  }
  return []
}

function extractLeadingTitle(content: string): { title: string | null; content: string } {
  const lines = content.split(/\r?\n/)
  const firstContentIndex = lines.findIndex(line => line.trim() !== '')
  if (firstContentIndex >= 0) {
    const match = lines[firstContentIndex].match(/^#\s+(.+?)\s*$/)
    if (match) {
      lines.splice(firstContentIndex, 1)
      return { title: match[1].trim(), content: lines.join('\n') }
    }
  }
  return { title: null, content }
}

function normalizeImportedHeadings(content: string): string {
  const lines = content.split(/\r?\n/)
  let fence: '`' | '~' | null = null
  return lines.map(line => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~'
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      return line
    }
    if (fence === null && /^#\s+\S/.test(line)) return `#${line}`
    return line
  }).join('\n')
}

function createSlug(title: string, sourcePath: string): string {
  const fromTitle = slugify(title)
  if (fromTitle && /[a-z]/.test(fromTitle)) return fromTitle
  const fromFile = slugify(path.basename(sourcePath, path.extname(sourcePath)))
  if (fromFile && /[a-z]/.test(fromFile)) return fromFile
  const date = inferDate(sourcePath) ?? todayInChina()
  return `${date}-article`
}

function findAvailableSlug(rootDir: string, preferredSlug: string): string {
  const exists = (slug: string) => ['drafts', 'articles'].some(directory => (
    fs.existsSync(path.join(rootDir, 'content', directory, `${slug}.md`))
  ))
  if (!exists(preferredSlug)) return preferredSlug
  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${preferredSlug}-${suffix}`
    if (!exists(candidate)) return candidate
  }
  throw new Error(`无法为“${preferredSlug}”生成可用地址，请填写自定义 slug。`)
}

function inferArticleType(title: string): NonNullable<PrepareOptions['type']> {
  if (/故障|报错|踩坑|排查|修复|问题/.test(title)) return 'troubleshooting'
  if (/项目|产品|设计|上线|部署|配置/.test(title)) return 'project'
  return 'learning'
}

function cleanTitleForSummary(title: string): string {
  return title
    .replace(/^\d{4}-\d{2}-\d{2}\s*/, '')
    .replace(/^(?:项目记录|学习记录|故障复盘|问题复盘)\s*[：:]\s*/, '')
    .trim()
}

function createSuggestedDescription(
  title: string,
  type: NonNullable<PrepareOptions['type']>,
): string {
  const subject = cleanTitleForSummary(title)
  if (type === 'troubleshooting') {
    return `记录${subject}的问题背景、排查过程、解决方案与验证结果。`
  }
  if (type === 'project') {
    return `记录${subject}的项目背景、关键决策、实施过程与验证结果。`
  }
  return `记录${subject}的学习背景、核心概念、实践过程与主要收获。`
}

function inferTags(title: string, content: string, type: NonNullable<PrepareOptions['type']>): string[] {
  const opening = content.slice(0, 1_500)
  const titleTags = tagRules.filter(rule => rule.pattern.test(title)).flatMap(rule => rule.tags)
  const openingTags = uniqueTags(titleTags).length < 2
    ? tagRules.filter(rule => rule.pattern.test(opening)).flatMap(rule => rule.tags)
    : []
  const tags = [...titleTags, ...openingTags]
  const fallback = type === 'troubleshooting' ? '问题复盘' : type === 'project' ? '项目实践' : '学习记录'
  if (uniqueTags(tags).length < 2) tags.push(fallback)
  return uniqueTags(tags).slice(0, 5)
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>()
  return tags
    .map(tag => tag.trim())
    .filter(tag => {
      const key = tag.toLocaleLowerCase()
      if (!tag || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function slugify(value: string): string {
  return value.normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

function cleanFileTitle(value: string): string {
  return value.replace(/^\d{4}-\d{2}-\d{2}\s*/, '').trim() || value
}

function inferDate(filePath: string): string | null {
  return path.basename(filePath).match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ?? null
}

function isDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function todayInChina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function assertSlug(slug: string): void {
  if (!isSafeArticleSlug(slug)) throw new Error(`slug“${slug}”不合法。`)
}

function printIssues(fileName: string, issues: ArticleValidationIssue[]): void {
  if (issues.length === 0) {
    console.log(`✓ ${fileName} 校验通过。`)
    return
  }
  for (const line of formatArticleIssues(fileName, issues)) console.error(line)
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function readPositionals(args: string[], optionsWithValue: string[] = []): string[] {
  const positionals: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (optionsWithValue.includes(arg)) {
      index += 1
    } else if (!arg.startsWith('--')) {
      positionals.push(arg)
    }
  }
  return positionals
}

async function main(): Promise<number> {
  const [command, ...args] = process.argv.slice(2)
  const jsonOutput = args.includes('--json')
  try {
    if (command === 'suggest') {
      const source = readPositionals(args, ['--type'])[0]
      if (!source) throw new Error('请选择一篇 Markdown 原稿后再生成推荐。')
      const type = readOption(args, '--type') as PrepareOptions['type']
      if (type && !(type in categoryByType)) throw new Error('文章类型不正确。')
      const suggestions = suggestArticleMetadata(source, { type })
      if (jsonOutput) console.log(JSON.stringify({ ok: true, action: 'suggest', ...suggestions }))
      else {
        console.log(`摘要：${suggestions.description}`)
        console.log(`标签：${suggestions.tags.join('、')}`)
      }
      return 0
    }

    if (command === 'prepare') {
      const source = readPositionals(args, ['--slug', '--type', '--tags', '--description'])[0]
      if (!source) throw new Error('用法：npm run article:prepare -- "原稿路径.md" [--slug slug] [--type troubleshooting|learning|project]')
      const type = readOption(args, '--type') as PrepareOptions['type']
      if (type && !(type in categoryByType)) throw new Error('--type 只能是 troubleshooting、learning 或 project。')
      const tagsOption = readOption(args, '--tags')
      const tags = tagsOption
        ? tagsOption.split(/[,，]/).map(tag => tag.trim()).filter(Boolean)
        : undefined
      const prepared = prepareArticle(source, {
        slug: readOption(args, '--slug'),
        type,
        tags,
        description: readOption(args, '--description'),
      })
      if (jsonOutput) {
        console.log(JSON.stringify({ ok: true, action: 'prepare', ...prepared }))
      } else {
        console.log(`✓ 已生成草稿：${prepared.draftPath}`)
        console.log(`下一步：npm run article:check -- ${prepared.slug}`)
        console.log(`预览：npm run article:preview -- ${prepared.slug}`)
      }
      return 0
    }

    if (command === 'check') {
      if (args.includes('--published')) {
        const results = checkPublishedArticles()
        let hasErrors = false
        for (const [slug, issues] of results) {
          printIssues(`content/articles/${slug}.md`, issues)
          if (issues.some(issue => issue.level === 'error')) hasErrors = true
        }
        return hasErrors ? 1 : 0
      }
      const slug = readPositionals(args)[0]
      if (!slug) throw new Error('用法：npm run article:check -- slug')
      const fixes = args.includes('--fix') ? repairDraftMetadata(slug) : []
      const issues = checkArticleBySlug(slug)
      if (jsonOutput) {
        console.log(JSON.stringify({
          ok: !issues.some(issue => issue.level === 'error'),
          action: 'check',
          slug,
          fixes,
          issues,
        }))
      } else {
        printIssues(slug, issues)
      }
      return issues.some(issue => issue.level === 'error') ? 1 : 0
    }

    if (command === 'publish') {
      const slug = readPositionals(args)[0]
      if (!slug) throw new Error('用法：npm run article:publish -- slug')
      const articlePath = publishArticle(slug)
      if (jsonOutput) {
        console.log(JSON.stringify({ ok: true, action: 'publish', slug, articlePath }))
      } else {
        console.log(`✓ 发布前检查全部通过：${articlePath}`)
        console.log(`请检查 git diff，确认后再自行提交和推送。`)
      }
      return 0
    }

    if (command === 'online') {
      const slug = readPositionals(args)[0]
      if (!slug) throw new Error('请选择需要正式上线的文章。')
      const result = await publishArticleOnline(slug)
      if (jsonOutput) console.log(JSON.stringify({ ok: true, action: 'online', ...result }))
      else {
        console.log(`✓ 文章已推送并上线：${result.url}`)
        if (!result.deploymentVerified) console.log('Vercel 部署仍在进行，请稍后打开线上地址。')
      }
      return 0
    }

    throw new Error('可用命令：suggest、prepare、check、publish、online。')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (jsonOutput) console.log(JSON.stringify({ ok: false, action: command, error: message }))
    else console.error(message)
    return 1
  }
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  void main().then(code => { process.exitCode = code })
}
