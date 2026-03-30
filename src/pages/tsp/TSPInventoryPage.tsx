import { useState, useEffect, useCallback } from 'react'
import type { TaskStore, InventoryItem, InventoryItemType, Transaction } from '@/types'
import type { View, Workspace } from '@/App'
import TSPSidebar from './TSPSidebar'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  onNavigate: (v: View) => void
  onSwitchWorkspace: (ws: Workspace) => void
}

const ITEM_TYPES: InventoryItemType[] = ['book', 'print', 'shirt', 'other']

function stockRemaining(item: InventoryItem, transactions: Transaction[]): number {
  const txs = transactions.filter((t) => t.itemId === item.id)
  const sold = txs.filter((t) => t.type !== 'restock').reduce((s, t) => s + t.quantity, 0)
  const restocked = txs.filter((t) => t.type === 'restock').reduce((s, t) => s + t.quantity, 0)
  return item.initialStock + restocked - sold
}

export default function TSPInventoryPage({ onNavigate, onSwitchWorkspace }: Props) {
  const [store, setStore] = useState<TaskStore>({
    projects: [], tasks: [], dates: [], notes: [], students: [],
    tspProjects: [], tspTasks: [], tspDates: [], inventoryItems: [], transactions: [],
  })
  const [typeFilter, setTypeFilter] = useState<InventoryItemType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<InventoryItem | null | undefined>(undefined)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const items = store.inventoryItems ?? []
  const transactions = store.transactions ?? []
  const tspProjects = store.tspProjects ?? []

  const q = search.toLowerCase()
  const filtered = items.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    if (q && !item.title.toLowerCase().includes(q) && !item.artist.toLowerCase().includes(q)) return false
    return true
  }).sort((a, b) => a.title.localeCompare(b.title))

  const totalStock = filtered.reduce((s, item) => s + stockRemaining(item, transactions), 0)
  const totalValue = filtered.reduce((s, item) => s + stockRemaining(item, transactions) * item.price, 0)

  // Overall stats (all items, not filtered)
  const allStock = items.reduce((s, item) => s + stockRemaining(item, transactions), 0)
  const allStockValue = items.reduce((s, item) => s + stockRemaining(item, transactions) * item.price, 0)
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyRevenue = transactions
    .filter((t) => t.type !== 'restock' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.unitPrice * t.quantity, 0)

  return (
    <div className="flex min-h-screen">
      <TSPSidebar
        projects={tspProjects}
        currentView={{ type: 'tsp-inventory' }}
        onNavigate={onNavigate}
        onReload={load}
        onSwitchWorkspace={onSwitchWorkspace}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-bold text-white">Inventory</h1>
          <div className="flex gap-1">
            {(['all', ...ITEM_TYPES] as (InventoryItemType | 'all')[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  typeFilter === t ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:bg-white/10 transition-colors w-48"
          />
          <div className="ml-auto">
            <button
              onClick={() => setEditItem(null)}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
            >
              + Add Item
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          {/* Inventory stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Items in Catalog', value: items.length },
              { label: 'Units in Stock', value: allStock },
              { label: 'Stock Value', value: `$${allStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: `${MONTH_NAMES[now.getMonth()]} Revenue`, value: `$${monthlyRevenue.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-xs text-white/40 uppercase tracking-widest mb-2">{label}</div>
                <div className="text-2xl font-bold text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex gap-6 mb-5 text-sm">
            <span className="text-white/40">{filtered.length} items</span>
            <span className="text-white/40">{totalStock} units in stock</span>
            <span className="text-white/40">Value: ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-white/30 text-sm border border-white/10 rounded-xl">
              No items found.{' '}
              <button onClick={() => setEditItem(null)} className="underline hover:text-white/50 cursor-pointer transition-colors">
                Add one
              </button>
            </div>
          ) : (
            <div className="border border-white/10 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-2.5 flex items-center gap-4 border-b border-white/10 bg-white/3">
                <span className="text-xs text-white/30 uppercase tracking-widest w-16 shrink-0">Type</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-12 shrink-0">Year</span>
                <span className="text-xs text-white/30 uppercase tracking-widest flex-1">Title</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-32 shrink-0">Artist</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-16 shrink-0 text-right">Price</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-16 shrink-0 text-right">Stock</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-24 shrink-0 text-right">Value</span>
              </div>

              {filtered.map((item) => {
                const remaining = stockRemaining(item, transactions)
                const value = remaining * item.price
                return (
                  <div
                    key={item.id}
                    onClick={() => setEditItem(item)}
                    className="px-5 py-3 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-white/40 capitalize w-16 shrink-0">{item.type}</span>
                    <span className="text-xs text-white/40 w-12 shrink-0">{item.year}</span>
                    <span className="text-sm text-white flex-1 truncate">{item.title}</span>
                    <span className="text-xs text-white/50 w-32 shrink-0 truncate">{item.artist}</span>
                    <span className="text-sm text-white/70 w-16 shrink-0 text-right">${item.price.toFixed(2)}</span>
                    <span className={`text-sm font-medium w-16 shrink-0 text-right ${
                      remaining === 0 ? 'text-red-400' : remaining <= 2 ? 'text-amber-400' : 'text-white'
                    }`}>
                      {remaining}
                    </span>
                    <span className="text-sm text-white/50 w-24 shrink-0 text-right">${value.toFixed(2)}</span>
                  </div>
                )
              })}

              {/* Totals row */}
              <div className="px-5 py-3 flex items-center gap-4 bg-white/3 border-t border-white/10">
                <span className="text-xs text-white/40 uppercase tracking-widest flex-1">Totals</span>
                <span className="w-16 shrink-0" />
                <span className="text-sm font-medium text-white w-16 shrink-0 text-right">{totalStock}</span>
                <span className="text-sm font-medium text-white w-24 shrink-0 text-right">${totalValue.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {editItem !== undefined && (
        <InventoryItemModal
          item={editItem}
          onClose={() => setEditItem(undefined)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ── Inventory Item Modal ─────────────────────────────────────────────────────

function InventoryItemModal({ item, onClose, onSaved }: {
  item: InventoryItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<InventoryItemType>(item?.type ?? 'book')
  const [year, setYear] = useState(item?.year?.toString() ?? new Date().getFullYear().toString())
  const [title, setTitle] = useState(item?.title ?? '')
  const [artist, setArtist] = useState(item?.artist ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(item?.price?.toString() ?? '')
  const [initialStock, setInitialStock] = useState(item?.initialStock?.toString() ?? '0')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) return setError('Title is required')
    if (!artist.trim()) return setError('Artist is required')
    if (!price || isNaN(parseFloat(price))) return setError('Valid price is required')
    setError('')
    setSaving(true)
    try {
      const body = {
        type,
        year: parseInt(year) || new Date().getFullYear(),
        title: title.trim(),
        artist: artist.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        initialStock: parseInt(initialStock) || 0,
      }
      if (item) {
        await window.api.updateInventoryItem(item.id, body)
      } else {
        await window.api.createInventoryItem(body)
      }
      onSaved()
      onClose()
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!item || !confirm('Delete this item? This will also affect transaction history.')) return
    setDeleting(true)
    try {
      await window.api.deleteInventoryItem(item.id)
      onSaved()
      onClose()
    } catch {
      setError('Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a1a24] border border-white/15 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{item ? 'Edit Item' : 'New Item'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Type</label>
            <div className="flex gap-2">
              {ITEM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm capitalize transition-colors cursor-pointer ${
                    type === t ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder-white/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Artist / Author</label>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 resize-none placeholder-white/20"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Initial Stock</label>
            <input
              type="number"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
            />
            {item && <p className="text-xs text-white/30 mt-1">To add stock, record a Restock transaction instead.</p>}
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
          {item && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-red-300/70 hover:text-red-300 text-sm transition-colors mr-auto cursor-pointer disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-50">
            {saving ? 'Saving…' : item ? 'Save' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
