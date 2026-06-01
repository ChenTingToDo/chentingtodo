import Link from 'next/link'

interface TagChipProps {
  tag: string
  clickable?: boolean
  className?: string
}

export default function TagChip({ tag, clickable = true, className = '' }: TagChipProps) {
  const baseClasses = `garden-tag ${className}`

  if (clickable) {
    return (
      <Link href={`/articles?tag=${encodeURIComponent(tag)}`} className={baseClasses}>
        #{tag}
      </Link>
    )
  }

  return <span className={baseClasses}>#{tag}</span>
}
