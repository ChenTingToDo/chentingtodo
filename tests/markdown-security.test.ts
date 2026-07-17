import assert from 'node:assert/strict'
import test from 'node:test'
import { renderMarkdown } from '../src/components/MarkdownContent'

test('markdown rendering removes raw HTML and unsafe URL schemes', () => {
  const html = renderMarkdown([
    '<img src=x onerror=alert(1)>',
    '',
    '[unsafe](javascript:alert(2))',
    '',
    '**safe content**',
  ].join('\n'))

  assert.doesNotMatch(html, /onerror/i)
  assert.doesNotMatch(html, /javascript:/i)
  assert.doesNotMatch(html, /<img/i)
  assert.match(html, /<strong>safe content<\/strong>/)
})
