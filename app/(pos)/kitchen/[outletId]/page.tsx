'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ChefHat, Truck, UtensilsCrossed } from 'lucide-react'
import type { Order, OrderItem } from '@/types/database'

type OrderWithItems = Order & {
  order_items: (OrderItem & { menu_items: { name: string } | null })[]
  tables: { label: string } | null
  order_type: string | null
}

const ITEM_STATUS_CYCLE = { queued: 'preparing', preparing: 'ready', ready: 'served' } as const
const ITEM_STATUS_CONFIG = {
  queued: { label: 'Queued', bg: 'bg-gray-700/50 border-gray-600/30', badge: 'bg-gray-700 text-gray-300' },
  preparing: { label: 'Preparing', bg: 'bg-blue-900/30 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400' },
  ready: { label: 'Ready', bg: 'bg-emerald-900/30 border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-400' },
  served: { label: 'Served', bg: 'bg-gray-800/20 border-gray-700/10 opacity-50', badge: 'bg-gray-700 text-gray-500' },
}

function elapsed(createdAt: string): string {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  return `${mins}m`
}

export default function KitchenPage({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = use(params)
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [, setTick] = useState(0)

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(label), order_items(*, menu_items(name))')
      .eq('outlet_id', outletId)
      .eq('status', 'in_kitchen')
      .order('created_at', { ascending: true })
    if (data) setOrders(data as OrderWithItems[])
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel(`kds-${outletId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'order_items',
      }, () => fetchOrders())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `outlet_id=eq.${outletId}`,
      }, () => fetchOrders())
      .subscribe()

    // Clock tick every 10s for accurate age labels
    const timer = setInterval(() => setTick((n) => n + 1), 10_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [outletId, fetchOrders]) // eslint-disable-line react-hooks/exhaustive-deps

  const cycleItemStatus = async (orderId: string, itemId: string, currentStatus: string) => {
    const nextStatus = ITEM_STATUS_CYCLE[currentStatus as keyof typeof ITEM_STATUS_CYCLE]
    if (!nextStatus) return

    await fetch(`/api/orders/${orderId}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, status: nextStatus }),
    })

    // Check if all items are ready → auto-transition order
    const order = orders.find((o) => o.id === orderId)
    if (order && nextStatus === 'ready') {
      const allReady = order.order_items
        .filter((i) => i.id !== itemId)
        .every((i) => i.status === 'ready')
      if (allReady) {
        await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ready' }),
        })
      }
    }

    await fetchOrders()
  }

  const activeItems = (order: OrderWithItems) =>
    order.order_items.filter((i) => i.status !== 'served')

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* KDS Header */}
      <div className="bg-gray-900 border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <ChefHat size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Kitchen Display</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {orders.length} active {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
        </div>
        <div className="text-gray-500 text-sm">
          {new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Order Cards */}
      <div className="flex-1 p-4 overflow-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 py-24">
            <div className="w-20 h-20 rounded-3xl bg-gray-800/60 flex items-center justify-center mb-5">
              <CheckCircle2 size={40} className="text-emerald-500/60" />
            </div>
            <p className="text-xl font-semibold text-gray-500">All caught up!</p>
            <p className="text-sm text-gray-700 mt-1">No orders in queue</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const items = activeItems(order)
              const age = elapsed(order.created_at)
              const isUrgent = (Date.now() - new Date(order.created_at).getTime()) > 15 * 60 * 1000

              return (
                <div
                  key={order.id}
                  className={`bg-gray-900 border rounded-2xl overflow-hidden flex flex-col ${
                    isUrgent ? 'border-red-500/40' : 'border-white/5'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${isUrgent ? 'bg-red-500/10' : 'bg-gray-800/50'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">
                          {order.tables
                            ? `Table ${order.tables.label}`
                            : order.order_type === 'delivery' ? 'Delivery' : 'Online Dine-In'}
                        </span>
                        {!order.tables && (
                          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            order.order_type === 'delivery'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {order.order_type === 'delivery' ? <Truck size={10} /> : <UtensilsCrossed size={10} />}
                            Online
                          </span>
                        )}
                      </div>
                      {isUrgent && (
                        <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">LATE</span>
                      )}
                    </div>
                    <div className={`text-sm font-mono font-bold ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
                      {age}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex-1 p-3 space-y-2">
                    {items.map((item) => {
                      const config = ITEM_STATUS_CONFIG[item.status as keyof typeof ITEM_STATUS_CONFIG]
                      return (
                        <button
                          key={item.id}
                          onClick={() => cycleItemStatus(order.id, item.id, item.status)}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 active:scale-95 ${config.bg}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-white font-semibold text-base leading-tight">
                                {item.menu_items?.name ?? 'Unknown item'}
                              </p>
                              {item.notes && (
                                <p className="text-yellow-300 text-sm mt-1 italic">Note: {item.notes}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className="text-white font-bold text-lg">×{item.quantity}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
                                {config.label}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-500 text-xs mt-2">Tap to advance →</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
