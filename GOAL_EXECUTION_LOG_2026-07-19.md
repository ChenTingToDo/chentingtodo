# Goal 执行日志（2026-07-19）

## 目标

在不修改文章正文和文章格式的前提下，完成以下工程维护：

- GitHub Actions 使用 Node.js 22 执行 `npm ci` 和 `npm run check`。
- 增加依赖更新与 Next.js 内置 PostCSS 告警的持续监控。
- 将本机 Node.js 18 升级到 Node.js 22。
- 把 README 改成一页中文使用与发布手册。
- 将旧代码审查报告标记为修复前快照。
- 完成检查、提交、推送和 GitHub Actions 验证。

## 边界

- 不修改 `content/articles` 下的文章。
- 不确定文章格式，不实现文章导入/发布流水线。
- 保留工作区中与本轮无关的未跟踪文件。
- 不使用 `npm audit fix --force`。

## 进度

- [x] 明确目标、范围和验收标准。
- [x] 核对仓库、GitHub 与本机 Node 安装状态。
- [x] 新增 CI、Dependabot 和 PostCSS 定时监控。
- [x] 完善 README 与旧审查报告状态。
- [x] 升级并验证本机 Node.js 22。
- [x] 完整检查、提交、推送并确认 Actions。

## 每轮记录约定

从本轮开始，所有 `/goal` 执行都必须在对应日期的 Goal 日志中记录目标、边界、进度、验证结果和未完成事项；不能只在对话中报告。

## 已完成修改

- 新增 `.github/workflows/ci.yml`：在 `main` 推送和 Pull Request 上使用 Node.js 22 执行 `npm ci` 与 `npm run check`。
- 新增 `.github/workflows/dependency-monitor.yml`：每周一检查高危/严重漏洞，并检查 Next.js backport 内置 PostCSS 是否达到 8.5.10。
- 新增 `.github/dependabot.yml`：每周检查 npm 依赖，每月检查 GitHub Actions。
- 新增 `scripts/check-next-postcss.mjs` 与 `npm run monitor:postcss`。
- README 从 UTF-16 标准化为 UTF-8，并重写为中文本地运行、检查、文章发布和部署手册。
- `CODE_AUDIT_REPORT_2026-07-18.md` 已标记为基于 `e56cf2d` 的修复前快照。
- `ARTICLE_PUBLISHING_PLAN_2026-07-18.md` 作为文章格式研究记录纳入版本库，但未实施其中的格式和发布工具方案。
- 本机 Node.js 已从 18.20.4 升级到 22.23.1，npm 为 10.9.8。

## 本地验证记录

- `npm ci`：通过，共安装 446 个包。
- `npm run monitor:postcss`：当前检测到 Next.js 内置 8.4.31，backport 仍为 8.4.31，按设计输出风险接受警告并成功退出。
- 模拟 `NEXT_POSTCSS_LATEST_SPEC=8.5.10`：按设计输出升级提示并以退出码 1 失败，证明官方修复出现后定时任务会报警。
- `npm run check`：lint、TypeScript、Markdown 安全测试、Next.js 生产构建和 Pagefind 索引全部通过。
- YAML 解析：两个 workflow 与 Dependabot 配置均通过语法解析。
- 文章正文和文章格式：未修改。

## 线上验收与自迭代

- 首次 Node.js 22 CI 已通过：`https://github.com/ChenTingToDo/chentingtodo/actions/runs/29656942233`。
- 手动触发的依赖监控已通过：`https://github.com/ChenTingToDo/chentingtodo/actions/runs/29656945758`。
- 首次 CI 暴露出 `actions/checkout@v4` 与 `actions/setup-node@v4` 的 Node.js 20 Action 运行时弃用告警；已根据两个项目的当前正式版本升级到 `v7`。
- Actions v7 最终 CI 已通过：`https://github.com/ChenTingToDo/chentingtodo/actions/runs/29656996353`。
- Actions v7 最终依赖监控已通过：`https://github.com/ChenTingToDo/chentingtodo/actions/runs/29657002194`；当前 PostCSS 8.4.31 仅产生已记录的风险接受 warning。

## Next.js 16 独立评估

- 评估基线：已推送提交 `f435b5a`，在独立临时 worktree 中将 `next` 与 `eslint-config-next` 升级到 16.2.10，没有改动主工作区和文章管线文件。
- 运行时条件：Next.js 16.2.10 要求 Node.js `>=20.9.0`，本机与 CI 的 Node.js 22 均满足；React 18.3 仍满足 peer dependency。
- 真实结果：TypeScript、Markdown 安全测试、Turbopack 生产构建、静态导出与 Pagefind 均通过；动态路由 `params` 已使用异步 API，不是阻塞项。
- 已确认的迁移项：ESLint 配置需从 `FlatCompat` 改为 Next.js 16 原生 Flat Config；新规则随后准确发现 3 处 `react-hooks/set-state-in-effect`（文章筛选、移动菜单、主题开关），需重构或明确豁免后 `npm run check` 才能全绿。
- Next.js 16 构建还会把 TypeScript 的 `jsx` 调整为 `react-jsx`，并补充 `.next/dev/types/**/*.ts` include，应作为迁移 diff 一并审查。
- 安全结论：Next.js 16.2.10 当前仍内置 PostCSS 8.4.31，因此升级 Next.js 16 **不能消除这 2 个 moderate 告警**。
- 决策：本轮不升级生产依赖。待文章管线改动完成并提交后，再用独立小提交迁移 ESLint、处理 3 条新规则、升级 Next.js，并以完整 CI 与页面冒烟测试验收；当前继续使用定时监控是更小且可验证的方案。
- 官方迁移指南：`https://nextjs.org/docs/app/guides/upgrading/version-16`。
