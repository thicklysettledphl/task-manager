import { useState, useEffect, useCallback } from 'react'
import type { TaskStore, Transaction, TransactionType, PaymentMethod, InventoryItem } from '@/types'
import type { View, Workspace } from '@/App'
import TSPSidebar from './TSPSidebar'

interface Props {
  onNavigate: (v: View) => void
  onSwitchWorkspace: (ws: Workspace) => void
}

const TX_TYPES: TransactionType[] = ['sale', 'gift', 'personal_copy', 'consignment', 'wholesale', 'restock']
const TX_LABELS: Record<TransactionType, string> = {
  sale: 'Sale', gift: 'Gift', personal_copy: 'Personal Copy',
  consignment: 'Consignment', wholesale: 'Wholesale', restock: 'Restock',
}
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'venmo', 'paypal', 'shopify', 'square', 'consignment_wholesale', 'none']
const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash', venmo: 'Venmo', paypal: 'PayPal', shopify: 'Shopify',
  square: 'Square', consignment_wholesale: 'Consignment/Wholesale', none: 'None',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
}

export default function TSPTransactionsPage({ onNavigate, onSwitchWorkspace }: Props) {
  const [store, setStore] = useState<TaskStore>({
    projects: [], tasks: [], dates: [], notes: [], students: [],
    tspProjects: [], tspTasks: [], tspDates: [], inventoryItems: [], transactions: [],
  })
  const [editTx, setEditTx] = useState<Transaction | null | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const items = store.inventoryItems ?? []
  const transactions = store.transactions ?? []
  const tspProjects = store.tspProjects ?? []

  const filtered = [...transactions]
    .filter((t) => typeFilter === 'all' || t.type === typeFilter)
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalRevenue = transactions
    .filter((t) => t.type !== 'restock')
    .reduce((s, t) => s + t.unitPrice * t.quantity, 0)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthRevenue = transactions
    .filter((t) => t.type !== 'restock' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.unitPrice * t.quantity, 0)

  function getItemTitle(itemId: string) {
    return items.find((i) => i.id === itemId)?.title ?? 'Unknown Item'
  }

  return (
    <div className="flex min-h-screen">
      <TSPSidebar
        projects={tspProjects}
        currentView={{ type: 'tsp-transactions' }}
        onNavigate={onNavigate}
        onReload={load}
        onSwitchWorkspace={onSwitchWorkspace}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-bold text-white">Transactions</h1>
          <div className="flex gap-1 flex-wrap">
            {(['all', ...TX_TYPES] as (TransactionType | 'all')[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  typeFilter === t ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {t === 'all' ? 'All' : TX_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setEditTx(null)}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
            >
              + Record
            </button>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Revenue summary */}
          <div className="flex gap-6">
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-1">This Month</div>
              <div className="text-xl font-bold text-white">${monthRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-1">All Time</div>
              <div className="text-xl font-bold text-white">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Transactions</div>
              <div className="text-xl font-bold text-white">{transactions.length}</div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="py-20 text-center text-white/30 text-sm border border-white/10 rounded-xl">
              No transactions yet.{' '}
              <button onClick={() => setEditTx(null)} className="underline hover:text-white/50 cursor-pointer transition-colors">
                Record one
              </button>
            </div>
          ) : (
            <div className="border border-white/10 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-2.5 flex items-center gap-4 border-b border-white/10">
                <span className="text-xs text-white/30 uppercase tracking-widest w-24 shrink-0">Date</span>
                <span className="text-xs text-white/30 uppercase tracking-widest flex-1">Item</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-24 shrink-0">Type</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-24 shrink-0">Payment</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-10 shrink-0 text-right">Qty</span>
                <span className="text-xs text-white/30 uppercase tracking-widest w-20 shrink-0 text-right">Total</span>
                <span className="w-8 shrink-0" />
              </div>

              {filtered.map((tx) => (
                <div
                  key={tx.id}
                  className="px-5 py-3 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs text-white/40 w-24 shrink-0">{formatDate(tx.date)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{getItemTitle(tx.itemId)}</div>
                    {tx.notes && <div className="text-xs text-white/35 truncate">{tx.notes}</div>}
                  </div>
                  <span className="text-xs text-white/50 w-24 shrink-0 capitalize">{TX_LABELS[tx.type]}</span>
                  <span className="text-xs text-white/40 w-24 shrink-0">{PAYMENT_LABELS[tx.paymentMethod]}</span>
                  <span className="text-sm text-white/70 w-10 shrink-0 text-right">{tx.quantity}</span>
                  <span className="text-sm font-medium text-white w-20 shrink-0 text-right">
                    {tx.type === 'restock' ? '—' : `$${(tx.unitPrice * tx.quantity).toFixed(2)}`}
                  </span>
                  <button
                    onClick={() => setEditTx(tx)}
                    className="text-white/25 hover:text-white transition-colors cursor-pointer text-xs w-8 shrink-0 text-right"
                  >
                    ✎
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {editTx !== undefined && (
        <TransactionModal
          tx={editTx}
          items={items}
          onClose={() => setEditTx(undefined)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ── Transaction Modal ────────────────────────────────────────────────────────

function TransactionModal({ tx, items, onClose, onSaved }: {
  tx: Transaction | null
  items: InventoryItem[]
  onClose: () => void
  onSaved: () => void
}) {
  const [itemId, setItemId] = useState(tx?.itemId ?? '')
  const [date, setDate] = useState(tx?.date ?? new Date().toISOString().split('T')[0])
  const [type, setType] = useState<TransactionType>(tx?.type ?? 'sale')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(tx?.paymentMethod ?? 'cash')
  const [quantity, setQuantity] = useState(tx?.quantity?.toString() ?? '1')
  const [unitPrice, setUnitPrice] = useState(tx?.unitPrice?.toString() ?? '')
  const [notes, setNotes] = useState(tx?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill price from item when item changes
  function handleItemChange(id: string) {
    setItemId(id)
    if (!tx) {
      const item = items.find((i) => i.id === id)
      if (item) setUnitPrice(item.price.toString())
    }
  }

  async function handleSave() {
    if (!itemId) return setError('Select an item')
    if (!date) return setError('Date is required')
    const qty = parseInt(quantity)
    if (!qty || qty < 1) return setError('Quantity must be at least 1')
    const price = parseFloat(unitPrice)
    if (type !== 'restock' && (isNaN(price) || price < 0)) return setError('Valid price required')
    setError('')
    setSaving(true)
    try {
      const body = {
        itemId, date, type, paymentMethod,
        quantity: qty,
        unitPrice: type === 'restock' ? 0 : price,
        notes: notes.trim() || undefined,
      }
      if (tx) {
        await window.api.updateTransaction(tx.id, body)
      } else {
        await window.api.createTransaction(body)
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
    if (!tx || !confirm('Delete this transaction?')) return
    setDeleting(true)
    try {
      await window.api.deleteTransaction(tx.id)
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
          <h2 className="text-lg font-bold text-white">{tx ? 'Edit Transaction' : 'Record Transaction'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Item</label>
            <select
              value={itemId}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
            >
              <option value="">Select an item...</option>
              {[...items].sort((a, b) => a.title.localeCompare(b.title)).map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TX_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    type === t ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {TX_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {type !== 'restock' && (
            <>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        paymentMethod === m ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {PAYMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional (e.g. event name)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder-white/20"
            />
          </div>

          {unitPrice && parseInt(quantity) > 0 && type !== 'restock' && (
            <div className="text-sm text-white/50">
              Total: <span className="text-white font-medium">${(parseFloat(unitPrice || '0') * parseInt(quantity || '1')).toFixed(2)}</span>
            </div>
          )}

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
          {tx && (
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
            {saving ? 'Saving…' : tx ? 'Save' : 'Record'}
          </button>
        </div>
      </div>
    </div>
  )
}
