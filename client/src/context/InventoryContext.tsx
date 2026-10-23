import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type InventoryProduct = {
  id: string
  name: string
  sku: string
  category: string
  sellingPrice: number
  costPrice?: number
  stock: number
  minimumStock: number
}

type InventoryContextValue = {
  products: InventoryProduct[]
  saveProduct: (product: Omit<InventoryProduct, 'id'>, id?: string) => void
  deleteProduct: (id: string) => void
  adjustStock: (id: string, delta: number) => void
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const value = useMemo(() => ({
    products,
    saveProduct: (product: Omit<InventoryProduct, 'id'>, id?: string) => setProducts((current) => {
      if (id) return current.map((existing) => existing.id === id ? { ...product, id } : existing)
      return [...current, { ...product, id: crypto.randomUUID() }]
    }),
    deleteProduct: (id: string) => setProducts((current) => current.filter((product) => product.id !== id)),
    adjustStock: (id: string, delta: number) => setProducts((current) => current.map((product) =>
      product.id === id ? { ...product, stock: Math.max(0, product.stock + delta) } : product,
    )),
  }), [products])
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}

export function useInventory() {
  const value = useContext(InventoryContext)
  if (!value) throw new Error('useInventory must be used inside InventoryProvider')
  return value
}
