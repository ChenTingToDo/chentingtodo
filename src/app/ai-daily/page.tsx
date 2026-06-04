import { readFileSync } from 'fs'
import { join } from 'path'

export default function AiDailyPage() {
  const html = readFileSync(join(process.cwd(), 'public', 'ai-daily.html'), 'utf-8')
  return <div dangerouslySetInnerHTML={{ __html: html }} suppressHydrationWarning />
}
