import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import { filterAnalysisRecords, formatCurrency } from '../utils/analytics'
import { exportSalesCsv } from '../utils/downloads'

export default function SalesPage() {
  const { records, period, selectedProduct, selectedCategory, customStart, customEnd } = useAnalysis()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const sales = useMemo(() => filterAnalysisRecords(records, period, selectedProduct, selectedCategory, customStart, customEnd)
    .filter((record) => `${record.product} ${record.sku ?? ''} ${record.category ?? ''} ${record.transactionId ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [records, period, selectedProduct, selectedCategory, customStart, customEnd, query])
  const pageSize = 25
  const pageCount = Math.max(1, Math.ceil(sales.length / pageSize))
  const pageSales = sales.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="section-page">
      <div className="welcome-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> SALES HISTORY</div><h1>Sales records</h1><p className="page-intro">Imported rows are sales lines, not necessarily unique orders.</p></div>
        {sales.length > 0 && <button className="secondary-button" onClick={() => exportSalesCsv(sales)}><Download size={15} /> Export CSV</button>}
      </div>
      {!records.length ? (
        <section className="panel page-empty"><h2>No sales records yet</h2><p>Import sales records to review and export them here.</p><Link to="/import" className="primary-button">Import sales data</Link></section>
      ) : (
        <section className="panel table-panel">
          <div className="table-toolbar">
            <div><h2>Sales lines</h2><p>{sales.length.toLocaleString()} records in selected period</p></div>
            <label className="search-input"><Search size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search sales" /></label>
          </div>
          <div className="table-scroll"><table>
            <thead><tr><th>Date</th><th>Product</th><th>SKU</th><th>Category</th><th>Qty</th><th>Unit price</th><th>Recorded cost</th><th>Revenue</th><th>Transaction ID</th></tr></thead>
            <tbody>{pageSales.map((record) => (
              <tr key={record.id}>
                <td>{record.date}</td><td><strong>{record.product}</strong></td><td>{record.sku || '—'}</td><td>{record.category || 'Uncategorized'}</td>
                <td>{record.quantity}</td><td>{record.unitPrice === undefined ? '—' : formatCurrency(record.unitPrice)}</td>
                <td>{record.unitCost === undefined ? '—' : formatCurrency(record.unitCost * record.quantity)}</td>
                <td>{formatCurrency(record.revenue)}</td><td>{record.transactionId || 'Not recorded'}</td>
              </tr>
            ))}</tbody>
          </table>{!sales.length && <p className="table-empty">No sales records match the search.</p>}</div>
          {sales.length > pageSize && <div className="table-pagination"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sales.length)} of {sales.length}</span><div><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
        </section>
      )}
    </div>
  )
}
