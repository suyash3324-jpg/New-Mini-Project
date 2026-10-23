import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { SalesRecord } from '../types/sales'
import type { Period } from '../utils/analytics'
import { createDemoRecords } from '../utils/demoData'

type AnalysisContextValue = {
  records: SalesRecord[]
  source: 'empty' | 'demo' | 'upload'
  period: Period
  setPeriod: (period: Period) => void
  selectedProduct: string
  setSelectedProduct: (product: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  customStart: string
  customEnd: string
  setCustomStart: (date: string) => void
  setCustomEnd: (date: string) => void
  replaceRecords: (records: SalesRecord[], source: 'demo' | 'upload') => void
  clear: () => void
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [source, setSource] = useState<AnalysisContextValue['source']>('empty')
  const [period, setPeriod] = useState<Period>('all')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const value = useMemo(() => ({
    records,
    source,
    period,
    setPeriod,
    selectedProduct,
    setSelectedProduct,
    selectedCategory,
    setSelectedCategory,
    customStart,
    customEnd,
    setCustomStart,
    setCustomEnd,
    replaceRecords: (next: SalesRecord[], origin: 'demo' | 'upload') => {
      setRecords(next)
      setSource(origin)
    },
    clear: () => {
      setRecords([])
      setSource('empty')
    },
  }), [records, source, period, selectedProduct, selectedCategory, customStart, customEnd])
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
}

export function useAnalysis() {
  const value = useContext(AnalysisContext)
  if (!value) throw new Error('useAnalysis must be used inside AnalysisProvider')
  return value
}

export function loadDemoData() {
  return createDemoRecords()
}
