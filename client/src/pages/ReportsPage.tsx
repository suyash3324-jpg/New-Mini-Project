import { useMemo, useState } from 'react'
import { BarChart3, Download, FileDown, FileSpreadsheet, PackageSearch, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import { filterAnalysisRecords, formatCurrency, productSummaries, summarize } from '../utils/analytics'
import { exportPdfReport, exportProductsCsv, exportSalesCsv, exportTemplate } from '../utils/downloads'

export default function ReportsPage() {
  const { records, period, source, selectedProduct, selectedCategory, customStart, customEnd } = useAnalysis()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const data = useMemo(() => filterAnalysisRecords(records, period, selectedProduct, selectedCategory, customStart, customEnd), [records, period, selectedProduct, selectedCategory, customStart, customEnd])
  const summary = useMemo(() => summarize(data), [data])
  const periodLabel = period === 'all' ? 'All available data' : period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 90 days' : period === 'month' ? 'This month' : period === 'previous' ? 'Previous month' : `${customStart || 'Start'} to ${customEnd || 'Today'}`

  function runExport(action: () => void, success: string) {
    setMessage('')
    setError('')
    try {
      action()
      setMessage(success)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The export could not be generated.')
    }
  }

  const actions = [
    { title: 'Business report PDF', detail: 'Summary KPIs, actual trend and category/product analysis.', icon: FileDown, action: () => exportPdfReport(data, periodLabel), success: 'PDF report generated.' },
    { title: 'Sales records CSV', detail: 'Export the sales lines in the selected period.', icon: ReceiptText, action: () => exportSalesCsv(data), success: 'Sales CSV generated.' },
    { title: 'Product analytics CSV', detail: 'Export filtered product metrics and demand labels.', icon: PackageSearch, action: () => exportProductsCsv(productSummaries(data)), success: 'Product CSV generated.' },
    { title: 'Excel import template', detail: 'A sample workbook with supported headers and example rows.', icon: FileSpreadsheet, action: exportTemplate, success: 'Excel template generated.' },
  ]

  return (
    <div className="section-page">
      <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> EXPORT CENTER</div><h1>Reports & downloads</h1><p className="page-intro">Download files generated from the currently selected browser-session dataset.</p></div></div>
      {records.length > 0 ? (
        <section className="report-summary">
          <div><span>REVENUE</span><strong>{formatCurrency(summary.revenue)}</strong></div>
          <div><span>UNITS SOLD</span><strong>{summary.units.toLocaleString()}</strong></div>
          <div><span>PRODUCTS</span><strong>{summary.productCount}</strong></div>
          <div><span>DATASET</span><strong>{source === 'demo' ? 'Demo' : 'Upload'}</strong></div>
        </section>
      ) : <section className="panel report-empty"><BarChart3 size={24} /><h2>Nothing to report yet</h2><p>Import data or explore the demo dataset to unlock reports.</p><Link className="primary-button" to="/import">Get started</Link></section>}
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="report-actions">
        {actions.map(({ title, detail, icon: Icon, action, success }) => (
          <article className="panel report-action" key={title}>
            <div className="report-action-icon"><Icon size={18} /></div>
            <div className="report-action-copy"><h2>{title}</h2><p>{detail}</p></div>
            <button type="button" className="secondary-button" onClick={() => runExport(action, success)} disabled={title !== 'Excel import template' && !records.length}><Download size={14} /> Download</button>
          </article>
        ))}
      </div>
      <p className="report-note">Individual chart images are available from each chart’s PNG button on the overview. PDF content reflects the selected date filter.</p>
    </div>
  )
}
