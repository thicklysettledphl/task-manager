import { useState, useEffect, useCallback } from 'react'
import type { TaskStore, InventoryItem, Transaction, Expense, TSPProject } from '@/types'
import type { View, Workspace } from '@/App'
import TSPSidebar from './TSPSidebar'

interface Props {
  onNavigate: (v: View) => void
  onSwitchWorkspace: (ws: Workspace) => void
}

function stockRemaining(item: InventoryItem, transactions: Transaction[]): number {
  const txs = transactions.filter((t) => t.itemId === item.id)
  const sold = txs.filter((t) => t.type !== 'restock').reduce((s, t) => s + t.quantity, 0)
  const restocked = txs.filter((t) => t.type === 'restock').reduce((s, t) => s + t.quantity, 0)
  return item.initialStock + restocked - sold
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type PeriodFilter = 'this-month' | 'last-month' | 'this-year' | 'all-time'

export const EXPENSE_CATEGORIES = ['printing', 'shipping', 'supplies', 'marketing', 'venue', 'fees', 'other'] as const
export type ExpenseCategoryValue = typeof EXPENSE_CATEGORIES[number]

export default function TSPInventoryDashboardPage({ onNavigate, onSwitchWorkspace }: Props) {
  const [store, setStore] = useState<TaskStore>({
    projects: [], tasks: [], dates: [], notes: [], students: [],
    tspProjects: [], tspTasks: [], tspDates: [], tspNotes: [], tspExpenses: [],
    inventoryItems: [], transactions: [],
  })
  const [period, setPeriod] = useState<PeriodFilter>('this-month')
  const [editExpense, setEditExpense] = useState<Expense | null | undefined>(undefined)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const tspProjects = store.tspProjects ?? []
  const items = store.inventoryItems ?? []
  const transactions = store.transactions ?? []
  const expenses = store.tspExpenses ?? []

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()

  function inPeriod(dateStr: string): boolean {
    const d = new Date(dateStr + 'T12:00:00')
    if (period === 'this-month') return d.getFullYear() === thisYear && d.getMonth() === thisMonth
    if (period === 'last-month') {
      const lm = thisMonth === 0 ? 11 : thisMonth - 1
      const ly = thisMonth === 0 ? thisYear - 1 : thisYear
      return d.getFullYear() === ly && d.getMonth() === lm
    }
    if (period === 'this-year') return d.getFullYear() === thisYear
    return true
  }

  const periodRevenue = transactions
    .filter((t) => t.type !== 'restock' && inPeriod(t.date))
    .reduce((s, t) => s + t.unitPrice * t.quantity, 0)

  const periodExpenseTotal = expenses
    .filter((e) => inPeriod(e.date))
    .reduce((s, e) => s + e.amount, 0)

  const netRevenue = periodRevenue - periodExpenseTotal

  const allTimeRevenue = transactions
    .filter((t) => t.type !== 'restock')
    .reduce((s, t) => s + t.unitPrice * t.quantity, 0)

  const allTimeExpenseTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const allTimeNet = allTimeRevenue - allTimeExpenseTotal

  const totalStock = items.reduce((s, item) => s + stockRemaining(item, transactions), 0)
  const totalStockValue = items.reduce((s, item) => s + stockRemaining(item, transactions) * item.price, 0)

  const lowStock = items
    .map((item) => ({ item, remaining: stockRemaining(item, transactions) }))
    .filter(({ remaining }) => remaining >= 0 && remaining <= 2)
    .sort((a, b) => a.remaining - b.remaining)

  const recentTx = [...transactions]
    .filter((t) => t.type !== 'restock')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  const periodExpenseList = [...expenses]
    .filter((e) => inPeriod(e.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  // ── Per-project P&L (revenue via tspProjectId on items; expenses via projectId) ──
  const projectPnL = tspProjects
    .map((proj) => {
      const projItemIds = new Set(items.filter((i) => i.tspProjectId === proj.id).map((i) => i.id))
      const revenue = transactions
        .filter((t) => t.type !== 'restock' && projItemIds.has(t.itemId) && inPeriod(t.date))
        .reduce((s, t) => s + t.unitPrice * t.quantity, 0)
      const expenseTotal = expenses
        .filter((e) => e.projectId === proj.id && inPeriod(e.date))
        .reduce((s, e) => s + e.amount, 0)
      return { proj, revenue, expenseTotal, net: revenue - expenseTotal }
    })
    .filter((r) => r.revenue > 0 || r.expenseTotal > 0)
    .sort((a, b) => b.net - a.net)

  // ── Per-artist revenue ──
  const artistMap: Record<string, number> = {}
  transactions
    .filter((t) => t.type !== 'restock' && inPeriod(t.date))
    .forEach((t) => {
      const item = items.find((i) => i.id === t.itemId)
      if (!item) return
      artistMap[item.artist] = (artistMap[item.artist] ?? 0) + t.unitPrice * t.quantity
    })
  const artistRevenue = Object.entries(artistMap)
    .map(([artist, revenue]) => ({ artist, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  function getItemTitle(itemId: string) {
    return items.find((i) => i.id === itemId)?.title ?? '—'
  }

  function fmt(n: number) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtDate(iso: string) {
    const [year, month, day] = iso.split('-')
    return `${MONTH_NAMES[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
  }

  const periodLabels: Record<PeriodFilter, string> = {
    'this-month': MONTH_NAMES[thisMonth],
    'last-month': MONTH_NAMES[thisMonth === 0 ? 11 : thisMonth - 1],
    'this-year': thisYear.toString(),
    'all-time': 'All Time',
  }

  return (
    <div className="flex min-h-screen">
      <TSPSidebar
        projects={tspProjects}
        currentView={{ type: 'tsp-inventory-dashboard' }}
        onNavigate={onNavigate}
        onReload={load}
        onSwitchWorkspace={onSwitchWorkspace}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-bold text-white">P&amp;L Dashboard</h1>
          <div className="flex gap-1 ml-2">
            {(['this-month', 'last-month', 'this-year', 'all-time'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  period === p ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setEditExpense(null)}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
            >
              + Add Expense
            </button>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* ── Revenue / Expense / Net KPIs ── */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Revenue · {periodLabels[period]}</div>
              <div className="text-2xl font-bold text-white">${fmt(periodRevenue)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Expenses · {periodLabels[period]}</div>
              <div className="text-2xl font-bold text-white">${fmt(periodExpenseTotal)}</div>
            </div>
            <div className={`border rounded-xl p-5 ${netRevenue >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Net · {periodLabels[period]}</div>
              <div className={`text-2xl font-bold ${netRevenue >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {netRevenue >= 0 ? '+' : ''}${fmt(netRevenue)}
              </div>
            </div>
            <div className={`border rounded-xl p-5 ${allTimeNet >= 0 ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">All-Time Net</div>
              <div className={`text-2xl font-bold ${allTimeNet >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {allTimeNet >= 0 ? '+' : ''}${fmt(allTimeNet)}
              </div>
            </div>
          </div>

          {/* ── Stock KPIs ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Items in Catalog</div>
              <div className="text-2xl font-bold text-white">{items.length}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Units in Stock</div>
              <div className="text-2xl font-bold text-white">{totalStock}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Stock Value</div>
              <div className="text-2xl font-bold text-white">${fmt(totalStockValue)}</div>
            </div>
          </div>

          {/* ── Per-Project P&L ── */}
          {projectPnL.length > 0 && (
            <div>
              <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">By Project · {periodLabels[period]}</div>
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-2.5 flex items-center gap-4 border-b border-white/10 bg-white/[0.03]">
                  <span className="text-xs text-white/30 uppercase tracking-widest flex-1">Project</span>
                  <span className="text-xs text-white/30 uppercase tracking-widest w-24 text-right">Revenue</span>
                  <span className="text-xs text-white/30 uppercase tracking-widest w-24 text-right">Expenses</span>
                  <span className="text-xs text-white/30 uppercase tracking-widest w-24 text-right">Net</span>
                </div>
                {projectPnL.map(({ proj, revenue, expenseTotal, net }) => (
                  <div
                    key={proj.id}
                    onClick={() => onNavigate({ type: 'tsp-project', slug: proj.slug })}
                    className="px-5 py-3 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: proj.color }} />
                      <span className="text-sm text-white truncate">{proj.name}</span>
                      {proj.artist && <span className="text-xs text-white/40 truncate">{proj.artist}</span>}
                    </div>
                    <span className="text-sm text-green-300 w-24 text-right">${fmt(revenue)}</span>
                    <span className="text-sm text-red-300 w-24 text-right">${fmt(expenseTotal)}</span>
                    <span className={`text-sm font-medium w-24 text-right ${net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {net >= 0 ? '+' : ''}${fmt(net)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Per-Artist + Recent Transactions + Expenses + Low Stock ── */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-5">
              {artistRevenue.length > 0 && (
                <div>
                  <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">By Artist · {periodLabels[period]}</div>
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    {artistRevenue.map(({ artist, revenue }) => {
                      const pct = periodRevenue > 0 ? (revenue / periodRevenue) * 100 : 0
                      return (
                        <div key={artist} className="px-5 py-3 flex items-center gap-3 border-b border-white/5 last:border-0">
                          <span className="text-sm text-white flex-1 truncate">{artist}</span>
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-green-300 w-20 text-right">${fmt(revenue)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Recent Sales</span>
                  <button onClick={() => onNavigate({ type: 'tsp-transactions' })} className="text-xs text-white/40 hover:text-white cursor-pointer transition-colors">View all →</button>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  {recentTx.length === 0 ? (
                    <div className="px-5 py-8 text-center text-white/30 text-sm">No transactions yet</div>
                  ) : recentTx.map((tx) => (
                    <div key={tx.id} className="px-4 py-2.5 flex items-center gap-3 border-b border-white/5 last:border-0">
                      <span className="text-xs text-white/40 shrink-0 w-20">{fmtDate(tx.date)}</span>
                      <span className="flex-1 text-sm text-white truncate">{getItemTitle(tx.itemId)}</span>
                      <span className="text-xs text-white/40 shrink-0 capitalize">{tx.type.replace('_', ' ')}</span>
                      <span className="text-sm font-medium text-green-300 shrink-0">+${(tx.unitPrice * tx.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Expenses · {periodLabels[period]}</span>
                  <button onClick={() => setEditExpense(null)} className="text-xs text-white/40 hover:text-white cursor-pointer transition-colors">+ Add →</button>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  {periodExpenseList.length === 0 ? (
                    <div className="px-5 py-8 text-center text-white/30 text-sm">No expenses this period</div>
                  ) : periodExpenseList.map((e) => (
                    <div key={e.id} onClick={() => setEditExpense(e)} className="px-4 py-2.5 flex items-center gap-3 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors">
                      <span className="text-xs text-white/40 shrink-0 w-20">{fmtDate(e.date)}</span>
                      <span className="flex-1 text-sm text-white truncate">{e.description}</span>
                      <span className="text-xs text-white/40 shrink-0 capitalize">{e.category}</span>
                      <span className="text-sm font-medium text-red-300 shrink-0">-${e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {lowStock.length > 0 && (
                <div>
                  <div className="mb-3">
                    <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Low Stock</span>
                  </div>
                  <div className="border border-amber-500/20 rounded-xl overflow-hidden">
                    {lowStock.map(({ item, remaining }) => (
                      <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 border-b border-white/5 last:border-0">
                        <span className={`text-xs font-bold shrink-0 w-8 ${remaining === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                          {remaining === 0 ? 'OUT' : remaining}
                        </span>
                        <span className="flex-1 text-sm text-white truncate">{item.title}</span>
                        <button onClick={() => onNavigate({ type: 'tsp-inventory' })} className="text-xs text-white/30 hover:text-white cursor-pointer transition-colors shrink-0">Restock →</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {editExpense !== undefined && (
        <ExpenseModal
          expense={editExpense}
          projects={tspProjects}
          onClose={() => setEditExpense(undefined)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ── Expense Modal (exported for use in TSPProjectPage) ────────────────────────

export function ExpenseModal({ expense, projects, defaultProjectId, onClose, onSaved }: {
  expense: Expense | null
  projects: TSPProject[]
  defaultProjectId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(expense?.date ?? today)
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [category, setCategory] = useState<ExpenseCategoryValue>(expense?.category ?? 'other')
  const [projectId, setProjectId] = useState(expense?.projectId ?? defaultProjectId ?? '')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!description.trim()) return setError('Description is required')
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) return setError('Valid amount is required')
    setError('')
    setSaving(true)
    try {
      const body = {
        date,
        amount: amt,
        description: description.trim(),
        category,
        projectId: projectId || undefined,
        notes: notes.trim() || undefined,
      }
      if (expense) {
        await window.api.updateTSPExpense(expense.id, body)
      } else {
        await window.api.createTSPExpense(body)
      }
      onSaved()
      onClose()
    } catch {
      setError('Failed to save.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!expense || !confirm('Delete this expense?')) return
    setDeleting(true)
    try {
      await window.api.deleteTSPExpense(expense.id)
      onSaved()
      onClose()
    } catch {
      setError('Failed to delete.')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a1a24] border border-white/15 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{expense ? 'Edit Expense' : 'New Expense'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Amount ($)</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder-white/20" />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Printing run for SEVERE PAPER 3000"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder-white/20" />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors cursor-pointer ${
                    category === c ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Project (optional)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30">
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 resize-none placeholder-white/20"
              placeholder="Optional notes" />
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
          {expense && (
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
            {saving ? 'Saving…' : expense ? 'Save' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
