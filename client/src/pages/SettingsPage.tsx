import { Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAnalysis, loadDemoData } from '../context/AnalysisContext'
import { useTheme, type ThemePreference } from '../context/ThemeContext'

export default function SettingsPage() {
  const { preference, setPreference } = useTheme()
  const { records, source, clear, replaceRecords } = useAnalysis()
  const options: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', description: 'Bright surfaces and dark text.', icon: Sun },
    { value: 'dark', label: 'Dark', description: 'Dark surfaces with high-contrast text.', icon: Moon },
    { value: 'system', label: 'System', description: 'Follow the device appearance preference.', icon: Monitor },
  ]
  return (
    <div className="section-page">
      <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> PREFERENCES</div><h1>Settings</h1><p className="page-intro">Manage how ShopInsight appears and how your current analysis is handled.</p></div></div>
      <section className="panel settings-panel">
        <div className="settings-section-heading"><h2>Appearance</h2><p>Your theme preference is saved in this browser. Sales data is not.</p></div>
        <div className="theme-options">{options.map(({ value, label, description, icon: Icon }) => (
          <button key={value} type="button" className={`theme-option${preference === value ? ' theme-option-active' : ''}`} onClick={() => setPreference(value)} aria-pressed={preference === value}>
            <Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span><span className="theme-radio" />
          </button>
        ))}</div>
      </section>
      <section className="panel settings-panel">
        <div className="settings-section-heading"><h2>Current analysis</h2><p>{records.length ? `${records.length.toLocaleString()} records · ${source === 'demo' ? 'Demo dataset' : 'Uploaded file'}` : 'No active analysis'}</p></div>
        <div className="data-retention-notice"><strong>Browser-only and temporary</strong><span>Sales records remain in memory in this tab. Reloading or closing the tab may clear the dataset. Data is not uploaded or saved to localStorage.</span></div>
        <div className="settings-actions">
          <Link className="secondary-button" to="/import">Start another analysis</Link>
          {source === 'demo' && <button className="secondary-button" onClick={() => { if (window.confirm('Reset the demo dataset to its original sample records?')) replaceRecords(loadDemoData(), 'demo') }}>Reset demo data</button>}
          {records.length > 0 && <button className="danger-button" onClick={() => { if (window.confirm('Clear the current analysis? This cannot be undone.')) clear() }}><Trash2 size={15} /> Clear current analysis</button>}
        </div>
      </section>
      <section className="panel settings-panel">
        <div className="settings-section-heading"><h2>Privacy & storage</h2><p>No account or cloud sync is configured.</p></div>
        <div className="data-retention-notice"><strong>Local browser processing</strong><span>The browser processes spreadsheet files on this device. Theme preference is stored in localStorage; sales data is not. Do not use a shared or public device for sensitive business files.</span></div>
      </section>
    </div>
  )
}
