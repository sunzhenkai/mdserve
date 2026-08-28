export type OutlineScrollHandler = (slug: string) => boolean

let handler: OutlineScrollHandler | null = null

export function setOutlineScrollHandler(next: OutlineScrollHandler | null): void {
  handler = next
}

export function scrollToOutlineSlug(slug: string): void {
  if (handler?.(slug)) return
  document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth' })
}
