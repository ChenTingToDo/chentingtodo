import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'ChenTingToDo — Think Less. Do More.',
    template: '%s | ChenTingToDo',
  },
  description: '记录 AI 学习、项目开发与技术成长过程。Think Less. Do More.',
  keywords: ['ChenTingToDo', '沉汀', '技术博客', 'AI学习', '数字花园', 'Digital Garden'],
  authors: [{ name: '沉汀' }],
  openGraph: {
    title: 'ChenTingToDo — Think Less. Do More.',
    description: '记录 AI 学习、项目开发与技术成长过程。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled dark mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100">
        <Header />
        <main className="page-enter min-h-[calc(100vh-16rem)]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
