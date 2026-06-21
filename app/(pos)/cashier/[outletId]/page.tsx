'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Banknote, Smartphone, CheckCircle2, Receipt, Truck, UtensilsCrossed } from 'lucide-react'
import type { Order, OrderItem, Table } from '@/types/database'

const GST = 0.18

type OrderWithDetails = Order & {
  tables: Table | null
  order_items: (OrderItem & {
    menu_items: { name: string; price: number } | null
  })[]
}

type OnlineOrder = Order & {
  order_items: (OrderItem & {
    menu_items: { name: string; price: number } | null
  })[]
}

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', Icon: Banknote },
  { key: 'card', label: 'Card', Icon: CreditCard },
  { key: 'other', label: 'Other', Icon: Smartphone },
] as const

export default function CashierPage({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = use(params)
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'table' | 'online'>('table')
  const [billedOrders, setBilledOrders] = useState<OrderWithDetails[]>([])
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | OnlineOrder | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash')
  const [referenceNo, setReferenceNo] = useState('')
  const [discount, setDiscount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchBilledOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, tables(*), order_items(*, menu_items(name, price))')
      .eq('outlet_id', outletId)
      .eq('status', 'billed')
      .order('created_at', { ascending: true })
    if (data) setBilledOrders(data as OrderWithDetails[])
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOnlineOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, price))')
      .eq('outlet_id', outletId)
      .is('table_id', null)
      .in('status', ['in_kitchen', 'ready'])
      .order('created_at', { ascending: true })
    if (data) setOnlineOrders(data as OnlineOrder[])
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Promise.all([fetchBilledOrders(), fetchOnlineOrders()]).then(() => setLoading(false))

    const channel = supabase
      .channel(`cashier-${outletId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${outletId}` },
        () => { fetchBilledOrders(); fetchOnlineOrders() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [outletId, fetchBilledOrders, fetchOnlineOrders]) // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = selectedOrder?.order_items.reduce(
    (sum, item) => sum + (item.unit_price * item.quantity), 0
  ) ?? 0

  const discountAmount = Math.round((subtotal * discount) / 100)
  const afterDiscount = subtotal - discountAmount
  const gstAmount = Math.round(afterDiscount * GST)
  const total = afterDiscount + gstAmount

  const processPayment = async () => {
    if (!selectedOrder) return
    setProcessing(true)
    setSuccessMsg('')

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          amount: total,
          method: paymentMethod,
          reference_no: referenceNo || null,
          discount,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Payment failed')
      }

      setSuccessMsg(`Payment of PKR ${total.toLocaleString()} received via ${paymentMethod}`)
      setSelectedOrder(null)
      setDiscount(0)
      setReferenceNo('')
      await Promise.all([fetchBilledOrders(), fetchOnlineOrders()])
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  const selectOrder = (order: OrderWithDetails | OnlineOrder) => {
    setSelectedOrder(order)
    setDiscount(0)
    setReferenceNo('')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-lg">Loading…</div>
  }

  const isOnline = selectedOrder && !('tables' in selectedOrder && (selectedOrder as OrderWithDetails).tables !== undefined)
  const canProcess = selectedOrder && (
    (selectedOrder as OrderWithDetails).status === 'billed' ||
    ((selectedOrder as OnlineOrder).status === 'ready' && !(selectedOrder as OrderWithDetails).tables)
  )

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* ── Left Panel ── */}
      <div className="w-80 xl:w-96 bg-gray-900 border-r border-white/5 flex flex-col">
        <div className="px-4 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Receipt size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Cashier</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {billedOrders.length} table bill{billedOrders.length !== 1 ? 's' : ''} · {onlineOrders.length} online
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {([
            { key: 'table' as const, label: 'Table Bills', count: billedOrders.length },
            { key: 'online' as const, label: 'Online Orders', count: onlineOrders.length },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSelectedOrder(null) }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === key ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'
                }`}>{count}</span>
              )}
              {activeTab === key && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-yellow-500" />}
            </button>
          ))}
        </div>

        {successMsg && (
          <div className="mx-4 mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">
            <CheckCircle2 size={15} /> {successMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === 'table' ? (
            billedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 py-16">
                <CheckCircle2 size={28} className="mb-3 text-emerald-500/40" />
                <p className="text-sm">No pending bills</p>
              </div>
            ) : (
              billedOrders.map((order) => {
                const orderSubtotal = order.order_items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
                const orderGst = Math.round(orderSubtotal * GST)
                return (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedOrder?.id === order.id
                        ? 'border-yellow-500/50 bg-yellow-500/10'
                        : 'border-white/5 bg-gray-800/40 hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">Table {order.tables?.label ?? '—'}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{order.order_items.length} items</p>
                      </div>
                      <p className="text-yellow-400 font-bold text-sm">
                        PKR {(orderSubtotal + orderGst).toLocaleString()}
                      </p>
                    </div>
                  </button>
                )
              })
            )
          ) : (
            onlineOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 py-16">
                <Truck size={28} className="mb-3 text-gray-700" />
                <p className="text-sm">No online orders</p>
              </div>
            ) : (
              onlineOrders.map((order) => {
                const orderSubtotal = order.order_items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
                const orderGst = Math.round(orderSubtotal * GST)
                const isReady = order.status === 'ready'
                return (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedOrder?.id === order.id
                        ? 'border-yellow-500/50 bg-yellow-500/10'
                        : 'border-white/5 bg-gray-800/40 hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {order.order_type === 'delivery' ? (
                            <Truck size={12} className="text-blue-400" />
                          ) : (
                            <UtensilsCrossed size={12} className="text-emerald-400" />
                          )}
                          <p className="text-white font-semibold text-sm capitalize">
                            {order.order_type === 'delivery' ? 'Delivery' : 'Dine In'}
                          </p>
                        </div>
                        <p className="text-gray-400 text-xs">{order.order_items.length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold text-sm">PKR {(orderSubtotal + orderGst).toLocaleString()}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          isReady ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'
                        }`}>
                          {isReady ? 'Ready' : 'Preparing'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )
          )}
        </div>
      </div>

      {/* ── Billing Panel ── */}
      {selectedOrder ? (
        <div className="flex-1 flex flex-col max-w-lg mx-auto p-6">
          <h2 className="text-xl font-bold text-white mb-1">
            {(selectedOrder as OrderWithDetails).tables
              ? `Table ${(selectedOrder as OrderWithDetails).tables!.label}`
              : (selectedOrder as OnlineOrder).order_type === 'delivery' ? 'Delivery Order' : 'Online Dine-In'}
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            {selectedOrder.order_items.length} item{selectedOrder.order_items.length !== 1 ? 's' : ''}
            {!(selectedOrder as OrderWithDetails).tables && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                selectedOrder.status === 'ready' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'
              }`}>
                {selectedOrder.status === 'ready' ? 'Ready' : 'Preparing'}
              </span>
            )}
          </p>

          {/* Items */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden mb-4">
            <div className="divide-y divide-white/5">
              {selectedOrder.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{item.menu_items?.name}</p>
                    <p className="text-gray-500 text-xs">PKR {item.unit_price.toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">×{item.quantity}</span>
                    <span className="text-white text-sm font-semibold w-24 text-right">
                      PKR {(item.unit_price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Discount (%)</label>
            <input
              type="number" min={0} max={100} value={discount}
              onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ key, label, Icon }) => (
                <button
                  key={key} onClick={() => setPaymentMethod(key)}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                    paymentMethod === key
                      ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400'
                      : 'border-white/5 bg-gray-800/40 text-gray-400 hover:bg-gray-800/70'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod !== 'cash' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Reference / Transaction ID (optional)</label>
              <input
                type="text" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="TXN123…"
              />
            </div>
          )}

          {/* Bill Summary */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4 mt-auto space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span><span>PKR {subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-rose-400">
                <span>Discount ({discount}%)</span><span>− PKR {discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-400">
              <span>GST (18%)</span><span>PKR {gstAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white border-t border-white/10 pt-2 mt-2">
              <span>Total</span><span className="text-yellow-400 text-xl">PKR {total.toLocaleString()}</span>
            </div>

            {!canProcess && selectedOrder.status === 'in_kitchen' && (
              <p className="text-orange-400 text-xs text-center py-1">Waiting for kitchen to mark order ready…</p>
            )}

            <button
              onClick={processPayment}
              disabled={processing || !canProcess}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition text-lg mt-2"
            >
              {processing ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 flex items-center justify-center mx-auto mb-4">
              <CreditCard size={32} className="text-gray-600" />
            </div>
            <p className="text-lg">Select a bill to process</p>
            <p className="text-sm mt-1 text-gray-700">All prices include 18% GST</p>
          </div>
        </div>
      )}
    </div>
  )
}
