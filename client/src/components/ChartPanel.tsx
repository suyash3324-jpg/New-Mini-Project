import { useRef, useState, type ReactNode } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import { toPng } from 'html-to-image'

export default function ChartPanel({ title, description, children, className = '', extra }: {
  title: string
  description: string
  children: ReactNode
  className?: string
  extra?: ReactNode
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  async function downloadPng() {
    if (!chartRef.current) return
    setDownloading(true)
    setError('')
    try {
      const dataUrl = await toPng(chartRef.current, { pixelRatio: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() })
      const link = document.createElement('a')
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
      link.href = dataUrl
      link.click()
    } catch {
      setError('Chart image could not be generated. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className={`panel chart-panel ${className}`}>
      <div className="panel-header">
        <div><h2>{title}</h2><p>{description}</p></div>
        <div className="chart-tools">{extra}<button type="button" className="chart-download" onClick={() => void downloadPng()} disabled={downloading} aria-label={`Download ${title} chart as PNG`}>
            {downloading ? <LoaderCircle className="spin-icon" size={15} /> : <Download size={15} />}
            <span>PNG</span>
          </button></div>
      </div>
      <div className="chart-export-area" ref={chartRef}>{children}</div>
      {error && <span className="export-error" role="alert">{error}</span>}
    </section>
  )
}
