import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkHtml from 'remark-html'

interface MarkdownContentProps {
  content: string
  className?: string
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const html = renderMarkdown(content)

  return (
    <div 
      className={`article-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function renderMarkdown(content: string): string {
  const result = unified()
    .use(remarkParse)
    // Keep raw HTML and unsafe URL schemes out of generated article markup.
    .use(remarkHtml, { sanitize: true })
    .processSync(content)
  
  return String(result)
}
