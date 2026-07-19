import fs from 'node:fs'
import path from 'node:path'

export interface ArticleFrontmatterInput {
  title?: unknown
  date?: unknown
  tags?: unknown
  category?: unknown
  description?: unknown
  published?: unknown
}

export interface ArticleValidationIssue {
  level: 'error' | 'warning'
  message: string
  line?: number
  suggestion?: string
}

export interface ValidateArticleOptions {
  slug: string
  data: ArticleFrontmatterInput
  content: string
  forPublish?: boolean
  sourcePath?: string
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const placeholderPattern = /^(?:todo|待补充|待分类|请补充)/i

export function isSafeArticleSlug(slug: string): boolean {
  return slugPattern.test(slug)
}

export function validateArticleDocument({
  slug,
  data,
  content,
  forPublish = false,
  sourcePath,
}: ValidateArticleOptions): ArticleValidationIssue[] {
  const issues: ArticleValidationIssue[] = []

  if (!isSafeArticleSlug(slug)) {
    issues.push({ level: 'error', message: `slug“${slug}”只能包含小写字母、数字和单个连字符。` })
  }

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    issues.push({ level: 'error', message: '文章标题缺失。', suggestion: '在文件最上方的 title 后填写文章标题。' })
  }

  if (typeof data.date !== 'string' || !isValidCalendarDate(data.date)) {
    issues.push({ level: 'error', message: '发布日期格式不正确。', suggestion: '把 date 写成 YYYY-MM-DD，例如 2026-07-19。' })
  }

  if (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string' || tag.trim() === '')) {
    issues.push({ level: 'error', message: '标签格式不正确。', suggestion: '重新导入原稿可自动生成标签，或在 tags 中保留列表格式。' })
  } else if (forPublish && data.tags.length === 0) {
    issues.push({ level: 'error', message: '文章还没有标签。', suggestion: '重新选择原稿生成推荐，或填写 1～5 个能描述主题的标签。' })
  }

  if (typeof data.category !== 'string' || data.category.trim() === '') {
    issues.push({ level: 'error', message: '文章类型缺失。', suggestion: '重新导入原稿并选择文章类型。' })
  } else if (forPublish && placeholderPattern.test(data.category.trim())) {
    issues.push({ level: 'error', message: '文章类型还是占位内容。', suggestion: '改成问题复盘、学习记录或项目记录。' })
  }

  if (typeof data.description !== 'string' || data.description.trim() === '') {
    issues.push({ level: 'error', message: '文章缺少一句话摘要。', suggestion: '重新选择原稿自动生成，或用一句话说明这篇文章解决了什么问题。' })
  } else if (forPublish && placeholderPattern.test(data.description.trim())) {
    issues.push({ level: 'error', message: '一句话摘要还是占位内容。', suggestion: '重新选择原稿自动生成，或改成文章的问题与结果。' })
  }

  if (typeof data.published !== 'boolean') {
    issues.push({ level: 'error', message: '文章缺少发布状态。', suggestion: '重新导入原稿，工具会自动补全该字段。' })
  } else if (forPublish && data.published !== true) {
    issues.push({ level: 'error', message: '正式发布检查要求 published 为 true。' })
  }

  if (content.trim() === '') {
    issues.push({ level: 'error', message: '文章正文为空。', suggestion: '打开当前 Markdown 并补充正文后再检查。' })
    return issues
  }

  issues.push(...validateMarkdownBody(content, sourcePath))
  return issues
}

export function formatArticleIssues(fileName: string, issues: ArticleValidationIssue[]): string[] {
  return issues.map(issue => {
    const location = issue.line ? `${fileName}:${issue.line}` : fileName
    const label = issue.level === 'error' ? '错误' : '提醒'
    return `[${label}] ${location} — ${issue.message}`
  })
}

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function validateMarkdownBody(content: string, sourcePath?: string): ArticleValidationIssue[] {
  const issues: ArticleValidationIssue[] = []
  const lines = content.split(/\r?\n/)
  let fence: '`' | '~' | null = null
  let previousHeadingLevel: number | null = null

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    if (containsLikelySecret(line)) {
        issues.push({ level: 'error', line: lineNumber, message: '检测到疑似密钥、Token 或私钥。', suggestion: '删除真实凭据，改用 YOUR_API_KEY 等示例占位符。' })
    }

    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~'
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      return
    }
    if (fence !== null) return
    const prose = line.replace(/`[^`]*`/g, '')

    const heading = line.match(/^(#{1,6})\s+\S/)
    if (heading) {
      const level = heading[1].length
      if (level === 1) {
        issues.push({ level: 'error', line: lineNumber, message: '正文中出现了重复的一级标题。', suggestion: '把这一行的 # 改成 ##；页面会自动显示文章标题。' })
      }
      if (previousHeadingLevel === null && level > 2) {
        issues.push({ level: 'error', line: lineNumber, message: '正文第一个小标题层级过深。', suggestion: '把第一个小标题改成 ## 开头。' })
      } else if (previousHeadingLevel !== null && level > previousHeadingLevel + 1) {
        issues.push({ level: 'error', line: lineNumber, message: `小标题层级从 H${previousHeadingLevel} 跳到了 H${level}。`, suggestion: '让标题按 ##、###、#### 逐级排列。' })
      }
      previousHeadingLevel = level
    }

    if (/<\s*(script|iframe|object|embed|form|input|style|svg)\b/i.test(prose)
      || /\bon[a-z]+\s*=/i.test(prose)
      || /javascript\s*:/i.test(prose)) {
      issues.push({ level: 'error', line: lineNumber, message: '检测到可能执行脚本的 HTML。', suggestion: '删除该 HTML，改用普通 Markdown 文本或代码块展示。' })
    }

    if (/\[[^\]]*\]\(\s*\)/.test(prose)) {
      issues.push({ level: 'error', line: lineNumber, message: '发现没有网址的链接。', suggestion: '补充链接地址，或删除链接括号。' })
    }

    if (sourcePath) {
      for (const match of prose.matchAll(/\[[^\]]+\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
        const target = match[1].split('#')[0]
        if ((target.startsWith('./') || target.startsWith('../')) && target !== '.') {
          const resolved = decodeAndResolveLink(sourcePath, target)
          if (!resolved) {
            issues.push({ level: 'error', line: lineNumber, message: `链接指向的本地文件不存在：${target}`, suggestion: '修正路径、补齐文件，或删除这个链接。' })
          }
        }
      }
    }
  })

  if (fence !== null) {
    issues.push({ level: 'error', message: '代码块没有正确结束。', suggestion: '在代码块末尾补上一行三个反引号。' })
  }

  return issues
}

function decodeAndResolveLink(sourcePath: string, target: string): string | null {
  try {
    const decoded = decodeURIComponent(target)
    const resolved = path.resolve(path.dirname(sourcePath), decoded)
    return fs.existsSync(resolved) ? resolved : null
  } catch {
    return null
  }
}

function containsLikelySecret(line: string): boolean {
  if (/(?:example|your[_-]|replace[_-]|xxx|\*{4,})/i.test(line)) return false
  return /\bsk-[A-Za-z0-9_-]{20,}\b/.test(line)
    || /\bgh[pousr]_[A-Za-z0-9]{20,}\b/.test(line)
    || /\bAKIA[A-Z0-9]{16}\b/.test(line)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)
    || /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["']?[A-Za-z0-9_./+-]{16,}/i.test(line)
}
