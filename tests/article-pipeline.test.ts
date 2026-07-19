import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { validateArticleDocument } from '../src/lib/article-schema'
import {
  checkArticleBySlug,
  prepareArticle,
  publishArticle,
  repairDraftMetadata,
  suggestArticleMetadata,
} from '../scripts/article-tool'

function temporaryRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chentingtodo-article-'))
  fs.mkdirSync(path.join(root, 'content', 'articles'), { recursive: true })
  return root
}

function validSource(root: string, fileName = '2026-07-19 中文 原稿.md'): string {
  const source = path.join(root, fileName)
  fs.writeFileSync(source, [
    '---',
    'title: "发布流程测试"',
    'date: "2026-07-19"',
    'tags: ["Testing"]',
    'category: "问题复盘"',
    'description: "验证文章发布流程。"',
    'published: true',
    '---',
    '',
    '# 发布流程测试',
    '',
    '## 背景',
    '',
    '正文。',
  ].join('\n'), 'utf8')
  return source
}

test('导入中文空格路径时生成默认草稿、移除重复 H1 且不覆盖同 slug', () => {
  const root = temporaryRoot()
  try {
    const prepared = prepareArticle(validSource(root), {
      rootDir: root,
      slug: 'pipeline-test',
      tags: ['GUI', 'Testing'],
      description: '由表单写入的摘要。',
    })
    const output = fs.readFileSync(prepared.draftPath, 'utf8')
    assert.match(output, /published: false/)
    assert.match(output, /- GUI/)
    assert.match(output, /由表单写入的摘要/)
    assert.doesNotMatch(output, /^# 发布流程测试$/m)
    assert.match(output, /^## 背景$/m)
    assert.throws(
      () => prepareArticle(validSource(root, '另一篇 原稿.md'), { rootDir: root, slug: 'pipeline-test' }),
      /未覆盖任何文件/,
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('首次使用时摘要和标签全部留空也会自动补全并通过检查', () => {
  const root = temporaryRoot()
  const source = path.join(root, '2026-07-19 项目记录：Vercel 部署排查记录.md')
  fs.writeFileSync(source, [
    '# 2026-07-19 项目记录：Vercel 部署排查记录',
    '',
    '## 问题背景',
    '',
    '网站在 Vercel 构建时出现问题，需要检查 GitHub 配置。',
    '',
    '# 排查过程',
    '',
    '检查构建日志并修正配置。',
  ].join('\n'), 'utf8')
  try {
    const suggested = suggestArticleMetadata(source)
    assert.equal(suggested.type, 'troubleshooting')
    assert.match(suggested.description, /Vercel 部署排查记录/)
    assert.deepEqual(suggested.tags.slice(0, 2), ['Vercel', 'GitHub'])

    const prepared = prepareArticle(source, { rootDir: root })
    const output = fs.readFileSync(prepared.draftPath, 'utf8')
    assert.doesNotMatch(output, /TODO|待补充/)
    assert.match(output, /description:.*Vercel 部署排查记录/)
    assert.match(output, /- Vercel/)
    assert.deepEqual(checkArticleBySlug(prepared.slug, { rootDir: root }), [])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('自动生成的 slug 冲突时使用安全后缀，显式 slug 仍禁止覆盖', () => {
  const root = temporaryRoot()
  const source = validSource(root, '全中文标题.md')
  const secondSource = path.join(root, '另一篇中文标题.md')
  fs.writeFileSync(secondSource, fs.readFileSync(source, 'utf8').replace('发布流程测试', '另一篇测试文章'), 'utf8')
  try {
    const first = prepareArticle(source, { rootDir: root })
    const second = prepareArticle(secondSource, { rootDir: root })
    assert.equal(second.slug, `${first.slug}-2`)
    assert.throws(() => prepareArticle(source, { rootDir: root, slug: first.slug }), /未覆盖任何文件/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('旧草稿的空标签和占位摘要可在检查前安全自动修复', () => {
  const root = temporaryRoot()
  try {
    const prepared = prepareArticle(validSource(root), { rootDir: root, slug: 'legacy-draft' })
    const parsed = fs.readFileSync(prepared.draftPath, 'utf8')
      .replace(/tags:\n(?:\s+-.*\n)*/, 'tags: []\n')
      .replace(/description:.*\n/, 'description: TODO：请补充一句话摘要\n')
    fs.writeFileSync(prepared.draftPath, parsed, 'utf8')
    const fixes = repairDraftMetadata('legacy-draft', { rootDir: root })
    assert.equal(fixes.length, 2)
    assert.deepEqual(checkArticleBySlug('legacy-draft', { rootDir: root }), [])
    const repaired = fs.readFileSync(prepared.draftPath, 'utf8')
    assert.doesNotMatch(repaired, /TODO|tags: \[\]/)
    assert.deepEqual(repairDraftMetadata('legacy-draft', { rootDir: root }), [])
    assert.equal(fs.readFileSync(prepared.draftPath, 'utf8'), repaired)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('校验会阻止标题层级跳跃、危险 HTML、空链接和疑似密钥', () => {
  const root = temporaryRoot()
  const sourcePath = path.join(root, 'content', 'drafts', 'unsafe-article.md')
  const issues = validateArticleDocument({
    slug: 'unsafe-article',
    data: {
      title: '危险文章',
      date: '2026-02-30',
      tags: [],
      category: '待分类',
      description: 'TODO：请补充',
      published: true,
    },
    content: [
      '### 跳级标题',
      '<script>alert(1)</script>',
      '[空链接]()',
      '[失效链接](./missing.md)',
      '```text',
      'api_key = "abcdefghijklmnop123456"',
      '```',
    ].join('\n'),
    forPublish: true,
    sourcePath,
  })
  const messages = issues.map(issue => issue.message).join('\n')
  assert.match(messages, /发布日期格式不正确/)
  assert.match(messages, /还没有标签/)
  assert.match(messages, /占位内容/)
  assert.match(messages, /第一个小标题层级过深/)
  assert.match(messages, /可能执行脚本的 HTML/)
  assert.match(messages, /没有网址的链接/)
  assert.match(messages, /本地文件不存在/)
  assert.match(messages, /疑似密钥/)
  fs.rmSync(root, { recursive: true, force: true })
})

test('缺少 frontmatter 时逐项给出可执行错误', () => {
  const issues = validateArticleDocument({
    slug: 'missing-frontmatter',
    data: {},
    content: '## 正文\n\n内容。',
    forPublish: true,
  })
  const messages = issues.map(issue => issue.message).join('\n')
  for (const field of ['文章标题', '发布日期', '标签', '文章类型', '一句话摘要', '发布状态']) {
    assert.match(messages, new RegExp(field))
  }
  assert.ok(issues.every(issue => issue.suggestion))
})

test('发布前检查失败时原样恢复草稿，不留下半发布文章', () => {
  const root = temporaryRoot()
  try {
    const prepared = prepareArticle(validSource(root), { rootDir: root, slug: 'rollback-test' })
    const before = fs.readFileSync(prepared.draftPath, 'utf8')
    fs.mkdirSync(path.join(root, 'out'), { recursive: true })
    fs.writeFileSync(path.join(root, 'out', 'stale.html'), 'stale', 'utf8')
    assert.throws(
      () => publishArticle('rollback-test', { rootDir: root, runChecks: () => false }),
      /已恢复原草稿/,
    )
    assert.equal(fs.readFileSync(prepared.draftPath, 'utf8'), before)
    assert.equal(fs.existsSync(path.join(root, 'content', 'articles', 'rollback-test.md')), false)
    assert.equal(fs.existsSync(path.join(root, 'out')), false)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('草稿图片缺失、目录错误或说明为空时阻止发布', () => {
  const root = temporaryRoot()
  try {
    const prepared = prepareArticle(validSource(root), { rootDir: root, slug: 'image-check' })
    const original = fs.readFileSync(prepared.draftPath, 'utf8')
    fs.writeFileSync(prepared.draftPath, original + [
      '',
      '![](/images/articles/image-check/missing.png)',
      '![其他文章图片](/images/articles/other-article/image.png)',
    ].join('\n'), 'utf8')
    const messages = checkArticleBySlug('image-check', { rootDir: root }).map(issue => issue.message).join('\n')
    assert.match(messages, /图片缺少说明文字/)
    assert.match(messages, /找不到文章图片/)
    assert.match(messages, /图片不属于当前文章目录/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('发布会移动文章图片，检查失败时同时恢复草稿图片', () => {
  const root = temporaryRoot()
  try {
    const prepared = prepareArticle(validSource(root), { rootDir: root, slug: 'image-rollback' })
    const draftAssets = path.join(root, 'content', 'draft-assets', 'image-rollback')
    fs.mkdirSync(draftAssets, { recursive: true })
    fs.writeFileSync(path.join(draftAssets, '01-result.png'), 'small image fixture', 'utf8')
    fs.appendFileSync(
      prepared.draftPath,
      '\n![部署结果](/images/articles/image-rollback/01-result.png)\n',
      'utf8',
    )

    assert.deepEqual(checkArticleBySlug('image-rollback', { rootDir: root }), [])
    assert.throws(
      () => publishArticle('image-rollback', { rootDir: root, runChecks: () => false }),
      /已恢复原草稿和草稿图片/,
    )
    assert.equal(fs.existsSync(path.join(draftAssets, '01-result.png')), true)
    assert.equal(fs.existsSync(path.join(root, 'public', 'images', 'articles', 'image-rollback')), false)

    const articlePath = publishArticle('image-rollback', { rootDir: root, runChecks: () => true })
    assert.equal(fs.existsSync(prepared.draftPath), false)
    assert.equal(fs.existsSync(draftAssets), false)
    assert.equal(fs.existsSync(path.join(root, 'public', 'images', 'articles', 'image-rollback', '01-result.png')), true)
    assert.match(fs.readFileSync(articlePath, 'utf8'), /01-result\.png/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('合规草稿通过校验后移动到正式目录并明确 published true', () => {
  const root = temporaryRoot()
  try {
    const prepared = prepareArticle(validSource(root), { rootDir: root, slug: 'publish-test' })
    assert.deepEqual(checkArticleBySlug('publish-test', { rootDir: root }), [])
    const articlePath = publishArticle('publish-test', { rootDir: root, runChecks: () => true })
    assert.equal(fs.existsSync(prepared.draftPath), false)
    assert.match(fs.readFileSync(articlePath, 'utf8'), /published: true/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
