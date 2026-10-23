import { useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, Check, FileSpreadsheet, LoaderCircle, UploadCloud } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAnalysis, loadDemoData } from '../context/AnalysisContext'
import type { ColumnField, ColumnMapping, ImportResult, ParseResult } from '../types/sales'
import { MAX_FILE_BYTES, parseSpreadsheet, suggestColumnMapping, validateAndMapRows } from '../utils/spreadsheet'

const fields: { key: ColumnField; label: string; required?: boolean }[] = [
  { key: 'date', label: 'Sale date', required: true },
  { key: 'transactionId', label: 'Transaction / invoice ID' },
  { key: 'product', label: 'Product name', required: true },
  { key: 'sku', label: 'SKU / product ID' },
  { key: 'category', label: 'Category' },
  { key: 'quantity', label: 'Quantity', required: true },
  { key: 'unitPrice', label: 'Selling price per unit' },
  { key: 'unitCost', label: 'Cost per unit' },
  { key: 'revenue', label: 'Total revenue' },
  { key: 'discount', label: 'Discount amount' },
]

export default function ImportPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [result, setResult] = useState<ImportResult | null>(null)
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { replaceRecords, records: activeRecords } = useAnalysis()
  const navigate = useNavigate()

  async function loadFile(nextFile: File, sheetName?: string) {
    setBusy(true)
    setError('')
    setResult(null)
    setIncludeDuplicates(false)
    try {
      const nextParsed = await parseSpreadsheet(nextFile, sheetName)
      setFile(nextFile)
      setParsed(nextParsed)
      setMapping(suggestColumnMapping(nextParsed.headers))
    } catch (cause) {
      setFile(null)
      setParsed(null)
      setError(cause instanceof Error ? cause.message : 'Unable to read this file.')
    } finally {
      setBusy(false)
    }
  }

  function acceptFiles(files: FileList | null) {
    const selected = files?.[0]
    if (!selected) return
    void loadFile(selected)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    acceptFiles(event.dataTransfer.files)
  }

  function checkMapping() {
    if (!parsed) return
    try {
      setResult(validateAndMapRows(parsed.headers, parsed.rows, mapping, parsed.rowNumbers))
      setIncludeDuplicates(false)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check your column mapping.')
    }
  }

  function confirmImport() {
    if (!importRecords.length) return
    if (activeRecords.length && !window.confirm('Replace the currently loaded dataset? This cannot be undone.')) return
    replaceRecords(importRecords.sort((a, b) => a.sourceRow - b.sourceRow), 'upload')
    navigate('/')
  }

  function chooseDemo() {
    if (activeRecords.length && !window.confirm('Replace the currently loaded dataset with demo data? This cannot be undone.')) return
    replaceRecords(loadDemoData(), 'demo')
    navigate('/')
  }

  const canMap = Boolean(mapping.date && mapping.product && mapping.quantity && (mapping.revenue || mapping.unitPrice))
  const importRecords = result
    ? [...result.records, ...(includeDuplicates ? result.duplicateRecords : [])]
    : []

  return (
    <div className="import-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> DATA IMPORT</div>
          <h1>Bring your sales data into focus.</h1>
          <p className="page-intro">Your spreadsheet is parsed in this browser and is not uploaded to a server.</p>
        </div>
        <Link className="back-link import-back" to="/">Back to overview</Link>
      </div>

      {!parsed ? (
        <section className={`panel upload-panel${dragging ? ' upload-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}>
          <div className="upload-icon"><UploadCloud size={25} /></div>
          <h2>Upload your sales file</h2>
          <p>Drop a spreadsheet here or browse files on your device.</p>
          <button className="primary-button" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? <LoaderCircle className="spin-icon" size={16} /> : <FileSpreadsheet size={16} />}
            {busy ? 'Reading file…' : 'Choose a file'}
          </button>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".xlsx,.xls,.csv"
            aria-label="Choose an Excel or CSV file"
            onChange={(event) => acceptFiles(event.currentTarget.files)}
          />
          <span className="upload-caption">Excel (.xlsx, .xls) or CSV · Maximum 10 MB and 20,000 data rows</span>
          {error && <div className="form-alert" role="alert"><AlertTriangle size={16} />{error}</div>}
        </section>
      ) : (
        <section className="panel import-workflow">
          <div className="workflow-heading">
            <div className="workflow-file-icon"><FileSpreadsheet size={20} /></div>
            <div className="workflow-file-copy">
              <strong>{file?.name}</strong>
              <span>{parsed.rows.length.toLocaleString()} data rows · {(file!.size / 1024).toFixed(1)} KB</span>
            </div>
            <button className="subtle-button" type="button" onClick={() => { setParsed(null); setResult(null); setError('') }}>Choose another file</button>
          </div>

          {parsed.sheetNames.length > 1 && (
            <label className="form-field sheet-field">
              <span>Worksheet</span>
              <select value={parsed.selectedSheet} onChange={(event) => { if (file) void loadFile(file, event.target.value) }}>
                {parsed.sheetNames.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
          )}

          <div className="section-heading">
            <div><h2>Map your columns</h2><p>Required fields are marked. Revenue can come from a total column or quantity × selling price.</p></div>
          </div>
          <div className="mapping-grid">
            {fields.map(({ key, label, required }) => (
              <label className="form-field" key={key}>
                <span>{label}{required ? <b> *</b> : null}</span>
                <select value={mapping[key] ?? ''} onChange={(event) => setMapping((current) => ({
                  ...current,
                  [key]: event.target.value || undefined,
                }))}>
                  <option value="">Not mapped</option>
                  {parsed.headers.map((header) => <option value={header} key={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div className="preview-heading"><h3>Data preview</h3><span>First {Math.max(parsed.preview.length - 1, 0)} rows</span></div>
          <div className="table-scroll preview-table">
            <table>
              <thead><tr>{parsed.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
              <tbody>{parsed.preview.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>{parsed.headers.map((_, columnIndex) => (
                  <td key={columnIndex}>{displayCell(row[columnIndex])}</td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
          {error && <div className="form-alert" role="alert"><AlertTriangle size={16} />{error}</div>}
          <div className="workflow-actions">
            <button className="primary-button" type="button" disabled={!canMap} onClick={checkMapping}>
              Validate rows <Check size={16} />
            </button>
          </div>

          {result && (
            <div className="validation-results" aria-live="polite">
              <h3>Validation summary</h3>
              <div className="validation-counts">
                <span className="count-valid"><strong>{result.records.length}</strong> valid rows</span>
                <span className="count-invalid"><strong>{result.invalidRows.length}</strong> invalid rows</span>
                <span className="count-duplicate"><strong>{result.duplicateRows.length}</strong> duplicates</span>
              </div>
              {!!result.revenueWarnings.length && (
                <div className="warning-box"><AlertTriangle size={15} />{result.revenueWarnings.length} rows have a material difference between supplied revenue and quantity × price. Supplied revenue will be retained.</div>
              )}
              {!!result.invalidRows.length && <IssueList title="Invalid rows" rows={result.invalidRows.slice(0, 8).map((item) => `Row ${item.row}: ${item.reasons.join(', ')}`)} />}
              {!!result.duplicateRows.length && <>
                <IssueList title="Potential duplicate rows" rows={result.duplicateRows.slice(0, 8).map((item) => `Row ${item.row} matches row ${item.duplicateOf}`)} />
                <label className="duplicate-option"><input type="checkbox" checked={includeDuplicates} onChange={(event) => setIncludeDuplicates(event.target.checked)} /> Include potential duplicates ({result.duplicateRecords.length})</label>
              </>}
              <p className="validation-policy">Potential duplicates are excluded unless you choose to include them. Revenue values supplied in the file are kept as the source of truth. This analysis remains in memory and may be cleared when you reload or close this tab.</p>
              <button className="primary-button" type="button" disabled={!importRecords.length} onClick={confirmImport}>
                Import {importRecords.length.toLocaleString()} valid rows
              </button>
            </div>
          )}
        </section>
      )}

      <section className="demo-card">
        <div className="demo-badge"><span /> SAMPLE DATA</div>
        <div><h2>Prefer to explore first?</h2><p>Open a clearly labeled, deterministic sample dataset without mixing it into an upload.</p></div>
        <button className="secondary-button" type="button" onClick={chooseDemo}>Open demo dataset</button>
      </section>
      <p className="privacy-note">Files are read locally in your browser. ShopInsight does not send spreadsheet contents to a server.</p>
    </div>
  )
}

function displayCell(value: unknown) {
  if (value === null || value === undefined) return <span className="blank-cell">—</span>
  if (value instanceof Date) return value.toLocaleDateString()
  return String(value)
}

function IssueList({ title, rows }: { title: string; rows: string[] }) {
  return <div className="issue-list"><strong>{title}</strong>{rows.map((row) => <span key={row}>{row}</span>)}</div>
}

export { MAX_FILE_BYTES }
