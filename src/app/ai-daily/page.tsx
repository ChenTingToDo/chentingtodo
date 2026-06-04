import { readFileSync } from 'fs'
import { join } from 'path'

export default function AiDailyPage() {
  const raw = readFileSync(join(process.cwd(), 'public', 'ai-daily.html'), 'utf-8')
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  const style = styleMatch ? styleMatch[1] : ''
  const body = bodyMatch ? bodyMatch[1] : raw

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: style }} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  )
}
