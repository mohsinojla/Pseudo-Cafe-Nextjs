'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Banknote, Smartphone, CheckCircle2, Receipt } from 'lucide-react'
import type { Order, OrderItem, Table } from '@/types/database'

type OrderWithDetails = Order & {
  tables: Table | null
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

  const [billedOrders, setBilledOrders] = useState<OrderWithDetails[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
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
    setLoading(false)
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchBilledOrders()

    const channel = supabase
      .channel(`cashier-${outletId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `outlet_id=eq.${outletId}`,
      }, () => fetchBilledOrders())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [outletId, fetchBilledOrders]) // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = selectedOrder?.order_items.reduce(
    (sum, item) => sum + (item.unit_price * item.quantity), 0
  ) ?? 0

  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount

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
      await fetchBilledOrders()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-lg">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Order List */}
      <div className="w-80 xl:w-96 bg-gray-900 border-r border-white/5 flex flex-col">
        <div className="px-4 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Receipt size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Cashier</h1>
            <p className="text-gray-500 text-xs mt-0.5">{billedOrders.length} bills pending</p>
          </div>
        </div>

        {successMsg && (
          <div className="mx-4 mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">
            ✅ {successMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {billedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 py-16">
              <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center mb-3">
                <CheckCircle2 size={28} className="text-emerald-500/60" />
              </div>
              <p className="text-sm">No pending bills</p>
            </div>
          ) : (
            billedOrders.map((order) => {
              const orderTotal = order.order_items.reduce(
                (s, i) => s + i.unit_price * i.quantity, 0
              )
              return (
                <button
                  key={order.id}
                  onClick={() => { setSelectedOrder(order); setDiscount(0); setReferenceNo('') }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedOrder?.id === order.id
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-white/5 bg-gray-800/40 hover:bg-gray-800/70'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-semibold">
                        {order.tables ? `Table ${order.tables.label}` : 'Takeaway'}
                      </p>
                      <p className="text-gray-400 text-sm mt-0.5">
                        {order.order_items.length} items
                      </p>
                    </div>
                    <p className="text-yellow-400 font-bold text-sm">
                      PKR {orderTotal.toLocaleString()}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Billing Panel */}
      {selectedOrder ? (
        <div className="flex-1 flex flex-col max-w-lg mx-auto p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Bill — {selectedOrder.tables ? `Table ${selectedOrder.tables.label}` : 'Takeaway'}
          </h2>

          {/* Item List */}
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
            <div className="px-4 py-3 bg-gray-800/50 border-t border-white/5">
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Subtotal</span>
                <span>PKR {subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Discount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Discount (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            {discount > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                − PKR {discountAmount.toLocaleString()} discount applied
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.Icon
                return (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      paymentMethod === m.key
                        ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400'
                        : 'border-white/5 bg-gray-800/40 text-gray-400 hover:bg-gray-800/70'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {paymentMethod !== 'cash' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Reference / Transaction ID (optional)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="TXN123…"
              />
            </div>
          )}

          {/* Total + Confirm */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4 mt-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-300 font-medium">Total</span>
              <span className="text-white text-2xl font-bold">PKR {total.toLocaleString()}</span>
            </div>
            <button
              onClick={processPayment}
              disabled={processing}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-bold py-4 rounded-xl transition text-lg"
            >
              {processing ? 'Processing…' : `Confirm Payment`}
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
          </div>
        </div>
      )}
    </div>
  )
}
