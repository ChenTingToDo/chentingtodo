import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '关于',
  description: '了解沉汀和 ChenTingToDo 的由来',
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-mono font-bold text-3xl text-gray-900 dark:text-gray-100">
          <span className="text-garden-500">#</span> 关于
        </h1>
      </div>

      {/* Main content */}
      <div className="space-y-10">

        {/* Who */}
        <section>
          <h2 className="font-mono font-bold text-xl text-gray-900 dark:text-gray-100 mb-4">
            沉汀是谁
          </h2>
          <div className="prose dark:prose-dark max-w-none">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              沉汀，一个正在学习 AI 技术的开发者。
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
              相信行动优于完美。相信持续积累的力量。
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
              目前正在探索 AI Agent、RAG、MCP 等领域，同时也在不断提升工程能力。
            </p>
          </div>
        </section>

        {/* Why */}
        <section className="border-t border-border-light dark:border-border-dark pt-8">
          <h2 className="font-mono font-bold text-xl text-gray-900 dark:text-gray-100 mb-4">
            为什么创建 ChenTingToDo
          </h2>
          <div className="prose dark:prose-dark max-w-none space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              我需要一个地方来记录学习过程。不是最终结果，而是真实的过程—— 
              遇到的问题、踩过的坑、找到的解决方案、以及每个阶段的想法。
            </p>
            <p>
              市面上有很多博客平台，但它们都太「完美」了。我想记录的是真实的学习轨迹，
              而不是精心包装的成果展示。
            </p>
            <p>
              所以有了 ChenTingToDo。
            </p>
            <p className="italic text-gray-500 dark:text-gray-400">
              ChenTing = 沉汀 · ToDo = 去行动、去执行、去实践
            </p>
            <p>
              这是一个长期成长记录平台。目标是多年后回顾时，可以看到完整的成长轨迹。
            </p>
          </div>
        </section>

        {/* Philosophy */}
        <section className="border-t border-border-light dark:border-border-dark pt-8">
          <h2 className="font-mono font-bold text-xl text-gray-900 dark:text-gray-100 mb-6">
            核心理念
          </h2>

          <div className="space-y-6">
            <div className="evergreen pl-4">
              <h3 className="font-mono font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Action Over Perfection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                行动优于完美。先记录，再优化。
              </p>
            </div>

            <div className="evergreen pl-4">
              <h3 className="font-mono font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Build In Public
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                公开记录学习过程，记录真实问题与真实解决方案。
              </p>
            </div>

            <div className="evergreen pl-4">
              <h3 className="font-mono font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Knowledge Compounding
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                知识复利。每篇文章都是未来自己的参考资料。
              </p>
            </div>

            <div className="evergreen pl-4">
              <h3 className="font-mono font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Personal First
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                首先服务自己。其次服务未来可能访问网站的人。
              </p>
            </div>
          </div>
        </section>

        {/* Learning Goals */}
        <section className="border-t border-border-light dark:border-border-dark pt-8">
          <h2 className="font-mono font-bold text-xl text-gray-900 dark:text-gray-100 mb-4">
            学习目标
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { area: 'AI Agent', desc: '构建实用的 AI 代理系统' },
              { area: 'RAG', desc: '深入理解检索增强生成' },
              { area: 'MCP', desc: '掌握 Model Context Protocol' },
              { area: 'LangGraph', desc: '构建复杂的语言模型工作流' },
              { area: '全栈开发', desc: '提升前后端工程能力' },
              { area: 'DevOps', desc: 'Docker、部署、自动化' },
            ].map(item => (
              <div key={item.area} className="garden-card p-4">
                <h3 className="font-mono font-semibold text-sm text-garden-600 dark:text-garden-400">
                  {item.area}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="border-t border-border-light dark:border-border-dark pt-8">
          <h2 className="font-mono font-bold text-xl text-gray-900 dark:text-gray-100 mb-4">
            技术栈
          </h2>

          <div className="garden-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: '框架', value: 'Next.js (App Router)' },
                { label: '样式', value: 'Tailwind CSS' },
                { label: '内容', value: 'Markdown + Frontmatter' },
                { label: '搜索', value: 'Pagefind' },
                { label: '部署', value: 'Vercel' },
                { label: 'DNS', value: 'Cloudflare' },
                { label: '版本控制', value: 'Git + GitHub' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-garden-500 font-bold">{item.label}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tagline footer */}
        <div className="border-t border-border-light dark:border-border-dark pt-8 text-center">
          <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
            Think Less. Do More.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Learn Less. Build More.
          </p>
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 font-mono">
            &gt; 今天的记录，是未来的资产_
          </p>
        </div>
      </div>
    </div>
  )
}
