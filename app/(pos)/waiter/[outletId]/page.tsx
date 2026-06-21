'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, ArrowLeft, FileText } from 'lucide-react'
import type { Table, MenuItem, MenuCategory, Order, OrderItem } from '@/types/database'

const TABLE_STATUS_CONFIG = {
  free: { label: 'Free', bg: 'bg-emerald-900/40 border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  seated: { label: 'Seated', bg: 'bg-blue-900/40 border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  ordered: { label: 'Ordered', bg: 'bg-yellow-900/40 border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  bill_requested: { label: 'Bill', bg: 'bg-red-900/40 border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
}

type MenuItemWithCategory = MenuItem & { menu_categories: MenuCategory | null; menu_item_modifiers: [] }
type OrderWithItems = Order & { order_items: OrderItem[] }

export default function WaiterPage({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = use(params)
  const supabase = createClient()

  const [tables, setTables] = useState<Table[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [activeOrder, setActiveOrder] = useState<OrderWithItems | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [menuSearch, setMenuSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [loading, setLoading] = useState(true)
  const noteInputRef = useRef<HTMLInputElement>(null)

  const fetchTables = useCallback(async () => {
    const { data } = await supabase.from('tables').select('*').eq('outlet_id', outletId).order('label')
    if (data) setTables(data)
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMenu = useCallback(async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*, menu_categories(name, sort_order), menu_item_modifiers(*)')
      .eq('outlet_id', outletId)
      .eq('is_available', true)
    if (data) setMenuItems(data as MenuItemWithCategory[])
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchActiveOrder = useCallback(async (tableId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, price))')
      .eq('table_id', tableId)
      .not('status', 'in', '("closed","paid")')
      .maybeSingle()
    setActiveOrder(data as OrderWithItems | null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Promise.all([fetchTables(), fetchMenu()]).then(() => setLoading(false))

    const channel = supabase
      .channel(`waiter-tables-${outletId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tables',
        filter: `outlet_id=eq.${outletId}`,
      }, (payload) => {
        setTables((prev) =>
          prev.map((t) => (t.id === (payload.new as Table).id ? (payload.new as Table) : t))
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [outletId, fetchTables, fetchMenu]) // eslint-disable-line react-hooks/exhaustive-deps

  const openTable = async (table: Table) => {
    setSelectedTable(table)
    setCart({})
    setItemNotes({})
    setMenuSearch('')
    setSendError('')
    await fetchActiveOrder(table.id)
  }

  const adjustCart = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta) }
      if (next[itemId] === 0) {
        delete next[itemId]
        setItemNotes((n) => { const nn = { ...n }; delete nn[itemId]; return nn })
      }
      return next
    })
  }

  const openNoteEditor = (itemId: string) => {
    setEditingNote(itemId)
    setNoteInput(itemNotes[itemId] ?? '')
    setTimeout(() => noteInputRef.current?.focus(), 50)
  }

  const saveNote = () => {
    if (editingNote) {
      setItemNotes((prev) => {
        const next = { ...prev }
        if (noteInput.trim()) next[editingNote] = noteInput.trim()
        else delete next[editingNote]
        return next
      })
    }
    setEditingNote(null)
    setNoteInput('')
  }

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id)
    return sum + (item?.price ?? 0) * qty
  }, 0)

  const sendToKitchen = async () => {
    if (!selectedTable || Object.keys(cart).length === 0) return
    setSending(true)
    setSendError('')

    try {
      let orderId = activeOrder?.id

      if (!orderId) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table_id: selectedTable.id }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to create order')
        }
        const order = await res.json()
        orderId = order.id
      }

      const itemsRes = await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: Object.entries(cart).map(([menu_item_id, quantity]) => ({
            menu_item_id,
            quantity,
            notes: itemNotes[menu_item_id] ?? null,
          })),
        }),
      })
      if (!itemsRes.ok) {
        const err = await itemsRes.json()
        throw new Error(err.error ?? 'Failed to add items')
      }

      // Only transition placed if order is currently draft
      if (!activeOrder || activeOrder.status === 'draft') {
        const placedRes = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'placed' }),
        })
        if (!placedRes.ok) {
          const err = await placedRes.json()
          throw new Error(err.error ?? 'Failed to place order')
        }
      }

      // Transition to in_kitchen only if not already there
      if (!activeOrder || ['draft', 'placed'].includes(activeOrder.status)) {
        const kitchenRes = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_kitchen' }),
        })
        if (!kitchenRes.ok) {
          const err = await kitchenRes.json()
          throw new Error(err.error ?? 'Failed to send to kitchen')
        }
      }

      setCart({})
      setItemNotes({})
      await fetchActiveOrder(selectedTable.id)
      await fetchTables()
    } catch (err) {
      setSendError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const requestBill = async () => {
    if (!activeOrder) return
    await fetch(`/api/orders/${activeOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'billed' }),
    })
    await fetchActiveOrder(selectedTable!.id)
    await fetchTables()
  }

  // Filter + group menu items
  const filteredItems = menuSearch.trim()
    ? menuItems.filter((m) => m.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : menuItems

  const grouped = filteredItems.reduce<Record<string, MenuItemWithCategory[]>>((acc, item) => {
    const cat = item.menu_categories?.name ?? 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Table Grid */}
      <div className={`${selectedTable ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 xl:w-96 bg-gray-900 border-r border-white/5 p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-white">Floor View</h1>
          <span className="text-xs text-gray-400">{tables.filter((t) => t.status === 'free').length} free</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {tables.map((table) => {
            const config = TABLE_STATUS_CONFIG[table.status]
            return (
              <button
                key={table.id}
                onClick={() => openTable(table)}
                className={`relative p-3 rounded-xl border ${config.bg} transition-all duration-200 hover:scale-105 active:scale-95 ${
                  selectedTable?.id === table.id ? 'ring-2 ring-yellow-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                </div>
                <div className="text-white font-bold text-sm">{table.label}</div>
                <div className={`text-xs mt-0.5 ${config.text}`}>{config.label}</div>
                {table.section && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{table.section}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Order Builder */}
      {selectedTable ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => { setSelectedTable(null); setActiveOrder(null); setCart({}); setItemNotes({}) }}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="font-bold text-white">Table {selectedTable.label}</h2>
              <p className="text-xs text-gray-400 capitalize">{TABLE_STATUS_CONFIG[selectedTable.status].label}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {activeOrder && ['served', 'ready'].includes(activeOrder.status) && (
                <button
                  onClick={requestBill}
                  className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-500/30 transition"
                >
                  Request Bill
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Menu */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Search bar */}
              <div className="mb-4 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search menu…"
                  className="w-full bg-gray-800/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              {Object.keys(grouped).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">No items match &quot;{menuSearch}&quot;</p>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">{category}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-gray-800/50 border border-white/5 rounded-xl p-3 flex flex-col justify-between"
                        >
                          <div>
                            <p className="text-white text-sm font-medium leading-tight">{item.name}</p>
                            <p className="text-yellow-400 text-sm font-bold mt-1">PKR {item.price.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => adjustCart(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition text-lg leading-none"
                            >
                              −
                            </button>
                            <span className="text-white text-sm font-bold w-4 text-center">
                              {cart[item.id] ?? 0}
                            </span>
                            <button
                              onClick={() => adjustCart(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black flex items-center justify-center transition text-lg leading-none font-bold"
                            >
                              +
                            </button>
                            {(cart[item.id] ?? 0) > 0 && (
                              <button
                                onClick={() => openNoteEditor(item.id)}
                                title="Add note"
                                className={`ml-auto p-1 rounded-md transition ${
                                  itemNotes[item.id] ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-600 hover:text-gray-400'
                                }`}
                              >
                                <FileText size={13} />
                              </button>
                            )}
                          </div>
                          {(cart[item.id] ?? 0) > 0 && itemNotes[item.id] && (
                            <p className="text-yellow-300/70 text-xs mt-1.5 italic truncate">&quot;{itemNotes[item.id]}&quot;</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Sidebar */}
            <div className="w-64 xl:w-72 bg-gray-900 border-l border-white/5 flex flex-col">
              {/* Active Order Items */}
              {activeOrder?.order_items && activeOrder.order_items.length > 0 && (
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Order</h3>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activeOrder.order_items.map((oi) => (
                      <div key={oi.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 truncate flex-1">{(oi as OrderItem & { menu_items?: { name: string } }).menu_items?.name}</span>
                        <span className="text-gray-500 ml-2">×{oi.quantity}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          oi.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                          oi.status === 'preparing' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>{oi.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart */}
              <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">New Items</h3>
                {Object.entries(cart).length === 0 ? (
                  <p className="text-gray-600 text-sm">Tap + to add items</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(cart).map(([id, qty]) => {
                      const item = menuItems.find((m) => m.id === id)
                      return (
                        <div key={id}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300 truncate flex-1">{item?.name}</span>
                            <span className="text-gray-500 ml-2">×{qty}</span>
                            <span className="text-yellow-400 ml-2">PKR {((item?.price ?? 0) * qty).toLocaleString()}</span>
                          </div>
                          {itemNotes[id] && (
                            <p className="text-yellow-300/60 text-xs italic mt-0.5 truncate">&quot;{itemNotes[id]}&quot;</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Error banner */}
              {sendError && (
                <div className="mx-4 mb-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
                  {sendError}
                </div>
              )}

              {/* Send Button */}
              {Object.keys(cart).length > 0 && (
                <div className="p-4 border-t border-white/5">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-400">Cart total</span>
                    <span className="text-yellow-400 font-bold">PKR {cartTotal.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={sendToKitchen}
                    disabled={sending}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition"
                  >
                    {sending ? 'Sending…' : 'Send to Kitchen'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-gray-600">
          <div className="text-center">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-lg">Select a table to start an order</p>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={saveNote}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">
              Note for {menuItems.find((m) => m.id === editingNote)?.name}
            </h3>
            <input
              ref={noteInputRef}
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveNote()}
              placeholder="e.g. No onions, extra sauce…"
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setNoteInput(''); saveNote() }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition text-sm">
                Clear
              </button>
              <button onClick={saveNote} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 rounded-xl transition text-sm">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
