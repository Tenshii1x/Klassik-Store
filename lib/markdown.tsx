import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import type { ReactNode } from "react"

interface Props {
  content: string | null | undefined
  className?: string
}

export function Markdown({ content, className }: Props): ReactNode {
  if (!content) return null
  return (
    <div className={className}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
