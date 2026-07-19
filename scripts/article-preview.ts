import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { isSafeArticleSlug } from '../src/lib/article-schema'

const require = createRequire(import.meta.url)
const [slug, ...rawArgs] = process.argv.slice(2)

if (!slug || !isSafeArticleSlug(slug)) {
  console.error('用法：npm run article:preview -- slug [-- -p 3000]')
  process.exit(1)
}

const draftPath = path.join(process.cwd(), 'content', 'drafts', `${slug}.md`)
if (!fs.existsSync(draftPath)) {
  console.error(`找不到草稿：${draftPath}`)
  process.exit(1)
}

const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs
const portIndex = args.findIndex(arg => arg === '-p' || arg === '--port')
const port = portIndex >= 0 ? args[portIndex + 1] : '3000'
const nextBin = require.resolve('next/dist/bin/next')

console.log(`草稿预览已启用：仅 /articles/${slug} 可读取该草稿。`)
console.log(`打开：http://127.0.0.1:${port}/articles/${slug}`)
const child = spawn(process.execPath, [nextBin, 'dev', ...args], {
  cwd: process.cwd(),
  env: { ...process.env, ARTICLE_PREVIEW_SLUG: slug },
  stdio: 'inherit',
})

child.on('exit', code => {
  process.exitCode = code ?? 1
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal))
}
