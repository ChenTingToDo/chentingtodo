import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const fixedVersion = '8.5.10'

function parseVersion(value) {
  const match = String(value).match(/(\d+)\.(\d+)\.(\d+)/)
  if (!match) throw new Error(`无法识别版本：${value}`)
  return match.slice(1).map(Number)
}

function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

const nextPackagePath = require.resolve('next/package.json')
const postcssPackagePath = require.resolve('postcss/package.json', {
  paths: [path.dirname(nextPackagePath)],
})
const installedPostcss = require(postcssPackagePath).version

if (compareVersions(installedPostcss, fixedVersion) >= 0) {
  console.log(`Next.js 当前使用 PostCSS ${installedPostcss}，已包含 ${fixedVersion} 的安全修复。`)
  process.exit(0)
}

const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('请通过 npm run monitor:postcss 执行此检查。')

const latestBackportSpec = (
  process.env.NEXT_POSTCSS_LATEST_SPEC ??
  execFileSync(
    process.execPath,
    [npmCli, 'view', 'next@backport', 'dependencies.postcss', '--json'],
    { encoding: 'utf8' },
  )
).trim().replace(/^"|"$/g, '')

if (compareVersions(latestBackportSpec, fixedVersion) >= 0) {
  console.error(
    `::error title=Next.js 已提供 PostCSS 修复::当前内置 ${installedPostcss}，` +
      `backport 已使用 ${latestBackportSpec}。请升级 Next.js 并重新运行完整检查。`,
  )
  process.exit(1)
}

console.warn(
  `::warning title=等待 Next.js PostCSS 修复::当前内置 ${installedPostcss}，` +
    `backport 仍声明 ${latestBackportSpec}。本站不处理访客 CSS，保留已记录的临时风险接受。`,
)
