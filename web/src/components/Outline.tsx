import { OutlineItem } from '../types'

interface OutlineProps {
  items: OutlineItem[]
}

export function Outline({ items }: OutlineProps) {
  const handleClick = (slug: string) => {
    const element = document.getElementById(slug)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const minLevel = Math.min(...items.map(item => item.level))

  return (
    <div className="outline">
      <div className="outline-header">
        <h3>目录</h3>
      </div>
      <nav className="outline-content">
        {items.map((item, index) => (
          <div
            key={index}
            className={`outline-item level-${item.level - minLevel + 1}`}
            onClick={() => handleClick(item.slug)}
          >
            {item.text}
          </div>
        ))}
      </nav>
    </div>
  )
}
