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
- [ ] 完整检查、提交、推送并确认 Actions。

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
