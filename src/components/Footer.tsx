export default function Footer() {
  return (
    <footer className="border-t border-border-light dark:border-border-dark mt-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-900 dark:text-gray-100 font-bold">
              ChenTingToDo
            </span>
            <span className="text-gray-400 dark:text-gray-600">·</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 italic">
              Think Less. Do More.
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <a 
              href="https://github.com/ChenTingToDo/chentingtodo"
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              GitHub
            </a>
            <span>·</span>
            <span>
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
