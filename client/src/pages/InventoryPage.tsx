import { useMemo, useState, type FormEvent } from 'react'
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useInventory, type InventoryProduct } from '../context/InventoryContext'
import { exportInventoryCsv } from '../utils/downloads'
import { formatCurrency } from '../utils/analytics'

const blankForm = { name: '', sku: '', category: '', sellingPrice: '', costPrice: '', stock: '', minimumStock: '' }

export default function InventoryPage() {
  const { products, saveProduct, deleteProduct, adjustStock } = useInventory()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [error, setError] = useState('')
  const visible = useMemo(() => products.filter((product) =>
    `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase().trim()),
  ), [products, query])

  function startAdd() {
    setEditing(null)
    setForm(blankForm)
    setError('')
    setFormOpen(true)
  }
  function startEdit(product: InventoryProduct) {
    setEditing(product.id)
    setForm({
      name: product.name, sku: product.sku, category: product.category,
      sellingPrice: String(product.sellingPrice), costPrice: product.costPrice === undefined ? '' : String(product.costPrice),
      stock: String(product.stock), minimumStock: String(product.minimumStock),
    })
    setError('')
    setFormOpen(true)
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const sellingPrice = Number(form.sellingPrice)
    const costPrice = form.costPrice === '' ? undefined : Number(form.costPrice)
    const stock = Number(form.stock)
    const minimumStock = Number(form.minimumStock)
    if (!form.name.trim() || !Number.isFinite(sellingPrice) || sellingPrice < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(minimumStock) || minimumStock < 0 || (costPrice !== undefined && (!Number.isFinite(costPrice) || costPrice < 0))) {
      setError('Enter a product name, non-negative prices, and whole-number stock quantities.')
      return
    }
    const duplicateSku = products.some((item) => item.id !== editing && form.sku.trim() && item.sku.toLowerCase() === form.sku.trim().toLowerCase())
    if (duplicateSku) {
      setError('That SKU is already used by another product.')
      return
    }
    saveProduct({
      name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim() || 'Uncategorized',
      sellingPrice, costPrice, stock, minimumStock,
    }, editing ?? undefined)
    setFormOpen(false)
  }

  const lowStock = products.filter((product) => product.stock <= product.minimumStock).length
  const outOfStock = products.filter((product) => product.stock === 0).length

  return (
    <div className="section-page">
      <div className="welcome-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> STOCK CONTROL</div><h1>Inventory</h1><p className="page-intro">Current stock is managed separately and is never reduced by historical sales imports.</p></div>
        <div className="inventory-actions">
          {products.length > 0 && <button className="secondary-button" onClick={() => exportInventoryCsv(products)}><Download size={15} /> Export CSV</button>}
          <button className="primary-button" onClick={startAdd}><Plus size={15} /> Add product</button>
        </div>
      </div>
      <div className="inventory-summary">
        <div><span>PRODUCTS</span><strong>{products.length}</strong></div>
        <div><span>LOW STOCK</span><strong className={lowStock ? 'warning-text' : ''}>{lowStock}</strong></div>
        <div><span>OUT OF STOCK</span><strong className={outOfStock ? 'critical-text' : ''}>{outOfStock}</strong></div>
      </div>
      {formOpen && <section className="panel inventory-form-panel">
        <div className="table-toolbar"><div><h2>{editing ? 'Edit product' : 'Add inventory product'}</h2><p>Saved in memory for this browser tab only.</p></div><button className="subtle-button" onClick={() => setFormOpen(false)}>Cancel</button></div>
        <form className="inventory-form" onSubmit={submit}>
          <label className="form-field">Product name *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="form-field">SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
          <label className="form-field">Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label className="form-field">Selling price *<input required min="0" step="0.01" type="number" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} /></label>
          <label className="form-field">Cost price<input min="0" step="0.01" type="number" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} /></label>
          <label className="form-field">Current stock *<input required min="0" step="1" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
          <label className="form-field">Minimum stock threshold *<input required min="0" step="1" type="number" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} /></label>
          {error && <p className="form-alert inventory-form-error" role="alert">{error}</p>}
          <button className="primary-button inventory-form-submit" type="submit">{editing ? 'Save changes' : 'Add product'}</button>
        </form>
      </section>}
      <section className="panel table-panel">
        <div className="table-toolbar"><div><h2>Current stock</h2><p>Stock adjustments are not inferred from imported historical sales.</p></div><label className="search-input"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inventory" /></label></div>
        {products.length ? <div className="table-scroll"><table>
          <thead><tr><th>Product</th><th>Category</th><th>Selling price</th><th>Cost price</th><th>Stock</th><th>Min. threshold</th><th>Stock status</th><th>Adjust</th><th>Actions</th></tr></thead>
          <tbody>{visible.map((product) => <tr key={product.id}>
            <td><strong>{product.name}</strong><small>{product.sku || 'SKU not set'}</small></td>
            <td>{product.category}</td><td>{formatCurrency(product.sellingPrice)}</td><td>{product.costPrice === undefined ? '—' : formatCurrency(product.costPrice)}</td>
            <td>{product.stock}</td><td>{product.minimumStock}</td>
            <td><span className={`demand-pill ${product.stock === 0 ? 'stock-out' : product.stock <= product.minimumStock ? 'stock-low' : 'stock-good'}`}>{product.stock === 0 ? 'Out of stock' : product.stock <= product.minimumStock ? 'Low stock' : 'In stock'}</span></td>
            <td><div className="stock-adjust"><button aria-label={`Decrease ${product.name} stock`} disabled={product.stock <= 0} onClick={() => adjustStock(product.id, -1)}>−</button><button aria-label={`Increase ${product.name} stock`} onClick={() => adjustStock(product.id, 1)}>+</button></div></td>
            <td><div className="row-actions"><button aria-label={`Edit ${product.name}`} onClick={() => startEdit(product)}><Pencil size={14} /></button><button aria-label={`Delete ${product.name}`} onClick={() => { if (window.confirm(`Delete ${product.name} from inventory?`)) deleteProduct(product.id) }}><Trash2 size={14} /></button></div></td>
          </tr>)}</tbody>
        </table>{!visible.length && <p className="table-empty">No products match that search.</p>}</div> :
          <div className="page-empty inventory-empty"><h2>No inventory products yet</h2><p>Add a product to track current stock and low-stock alerts.</p><button className="primary-button" onClick={startAdd}><Plus size={15} /> Add product</button></div>}
      </section>
      <p className="classification-note">Inventory stays only in this tab’s memory and is not saved on a server or across reloads. Stock levels are independent from historical sales imports.</p>
    </div>
  )
}
