import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-24 text-center">
      {/* Garden icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl 
                   bg-garden-50 dark:bg-garden-950 
                   border border-garden-200 dark:border-garden-800 mb-8">
        <span className="text-4xl">🌿</span>
      </div>

      <h1 className="font-mono font-bold text-5xl text-gray-900 dark:text-gray-100 mb-4">
        404
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
        这片花园里还没有种下这个页面。
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-500 mb-10 font-mono">
        This page hasn&apos;t been planted yet.
      </p>

      <div className="flex items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl 
                   bg-garden-500 text-white font-medium text-sm
                   hover:bg-garden-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          回到首页
        </Link>

        <Link
          href="/articles"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl 
                   bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 
                   border border-border-light dark:border-border-dark
                   font-medium text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          浏览文章
        </Link>
      </div>
    </div>
  )
}
