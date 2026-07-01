export const routingTableStart = '<!-- partita:projection:start id="routing-table" source="skills" mode="block-table" -->'
export const routingTableEnd = '<!-- partita:projection:end id="routing-table" -->'

export const fileProjectionPrefix = '<!-- partita:projection:file '
export const blockProjectionStartPrefix = '<!-- partita:projection:start '
export const blockProjectionEndPrefix = '<!-- partita:projection:end '

const fileCopyProjectionPattern = /^<!-- partita:projection:file source="([^"]+)" mode="copy" -->\r?\n/u
const projectionAttributePattern = /([a-z-]+)="([^"]*)"/gu

function fileCopyProjectionHeader(source: string): string {
  return `<!-- partita:projection:file source="${source}" mode="copy" -->`
}

export function fileCopyProjectionSource(text: string): string | undefined {
  return fileCopyProjectionPattern.exec(text)?.[1]
}

export function renderFileCopyProjection(source: string, sourceText: string): string {
  return `${fileCopyProjectionHeader(source)}\n\n${sourceText}`
}

export function validProjectionSource(source: string): boolean {
  return !source.startsWith('/') && !source.split('/').includes('..') && source.endsWith('.md')
}

export function projectionCommentLines(text: string, prefix: string): ReadonlyArray<string> {
  return text
    .split(/\r?\n/u)
    .filter(line => line.startsWith(prefix) && line.endsWith('-->'))
}

export function parseProjectionAttributes(comment: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of comment.matchAll(projectionAttributePattern)) {
    const key = match[1]
    const value = match[2]
    if (key !== undefined && value !== undefined) {
      attrs[key] = value
    }
  }
  return attrs
}
