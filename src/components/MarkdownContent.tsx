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

function renderMarkdown(content: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkHtml, { sanitize: false })
    .processSync(content)
  
  return String(result)
}
