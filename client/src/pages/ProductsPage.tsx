import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import { useInventory } from '../context/InventoryContext'
import { filterAnalysisRecords, formatCurrency, productSummaries } from '../utils/analytics'
import { exportProductsCsv } from '../utils/downloads'
import ChartPanel from '../components/ChartPanel'
import { LowDemandChart } from '../components/SalesCharts'

export default function ProductsPage() {
  const { records, period, selectedProduct, selectedCategory, customStart, customEnd } = useAnalysis()
  const { products: inventoryProducts } = useInventory()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'quantity' | 'revenue' | 'product'>('quantity')
  const products = useMemo(() => {
    const summary = productSummaries(filterAnalysisRecords(records, period, selectedProduct, selectedCategory, customStart, customEnd))
    const knownNames = new Set(summary.map((product) => product.product))
    for (const product of inventoryProducts) {
      if (knownNames.has(product.name)) continue
      summary.push({
        product: product.name,
        sku: product.sku || undefined,
        category: product.category || 'Uncategorized',
        quantity: 0,
        revenue: 0,
        avgPrice: 0,
        share: 0,
        demand: 'No recorded sales',
      })
    }
    const search = query.trim().toLowerCase()
    return summary
      .filter((product) => (!selectedProduct || product.product === selectedProduct) && (!selectedCategory || product.category === selectedCategory))
      .filter((product) => !search || `${product.product} ${product.sku ?? ''} ${product.category}`.toLowerCase().includes(search))
      .sort((a, b) => sort === 'product' ? a.product.localeCompare(b.product) : b[sort] - a[sort])
  }, [records, period, selectedProduct, selectedCategory, customStart, customEnd, query, sort, inventoryProducts])
  const pageSize = 25
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize))
  const pageProducts = products.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="section-page">
      <div className="welcome-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> SALES PERFORMANCE</div><h1>Product analytics</h1><p className="page-intro">Demand classifications are relative to the products in the selected period.</p></div>
        {products.length > 0 && <button className="secondary-button" onClick={() => exportProductsCsv(products)}><Download size={15} /> Export CSV</button>}
      </div>
      {!records.length ? <EmptyState /> : <ChartPanel title="Lowest-demand products" description="Products with the fewest recorded units in the selected period">
        <LowDemandChart products={products} />
      </ChartPanel>}
      {!records.length ? null : (
        <section className="panel table-panel">
          <div className="table-toolbar">
            <div><h2>Product performance</h2><p>{products.length} products · Zero-sales items appear when listed in current inventory.</p></div>
            <label className="search-input"><Search size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search products" /></label>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr>
                <th><button className="sort-button" onClick={() => setSort('product')}>Product / SKU</button></th>
                <th>Category</th><th><button className="sort-button" onClick={() => setSort('quantity')}>Units sold</button></th>
                <th><button className="sort-button" onClick={() => setSort('revenue')}>Revenue</button></th>
                <th>Cost</th><th>Gross profit</th><th>Avg. price</th><th>Sales share</th><th>Demand</th>
              </tr></thead>
              <tbody>{pageProducts.map((product) => (
                <tr key={product.product}>
                  <td><strong>{product.product}</strong><small>{product.sku || 'SKU not recorded'}</small></td>
                  <td>{product.category}</td><td>{product.quantity.toLocaleString()}</td><td>{formatCurrency(product.revenue)}</td>
                  <td>{product.cost === undefined ? '—' : formatCurrency(product.cost)}</td>
                  <td>{product.profit === undefined ? '—' : formatCurrency(product.profit)}</td>
                  <td>{formatCurrency(product.avgPrice)}</td><td>{product.share.toFixed(1)}%</td>
                  <td><span className={`demand-pill demand-${product.demand.split(' ')[0].toLowerCase()}`}>{product.demand}</span></td>
                </tr>
              ))}</tbody>
            </table>
            {!products.length && <p className="table-empty">No products match that search.</p>}
          </div>
          {products.length > pageSize && <div className="table-pagination"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, products.length)} of {products.length}</span><div><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
        </section>
      )}
      <p className="classification-note">Classification: the highest-selling product(s) are “High demand”; products at least half the maximum quantity are “Moderate demand”; others with sales are “Low demand.” New products with no records are not assumed to have zero sales.</p>
    </div>
  )
}

function EmptyState() {
  return <section className="panel page-empty"><h2>No sales data yet</h2><p>Import a file or open the demo dataset to compare product performance.</p><Link to="/import" className="primary-button">Import sales data</Link></section>
}
