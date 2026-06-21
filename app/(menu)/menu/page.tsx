'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingCart, X, Plus, Minus, Printer, UtensilsCrossed,
  Truck, MapPin, LogIn, ChevronRight, CheckCircle2,
} from 'lucide-react'

const GST = 0.18

const CATEGORY_IMAGES: Record<string, string> = {
  pizza:       'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  burger:      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  burgers:     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  pasta:       'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  drinks:      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  beverages:   'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  coffee:      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
  desserts:    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',
  dessert:     'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',
  salads:      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  salad:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  chicken:     'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80',
  sandwiches:  'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&q=80',
  sandwich:    'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&q=80',
  starters:    'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80',
  appetizers:  'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&q=80',
  seafood:     'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&q=80',
  biryani:     'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
  rice:        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
  default:     'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&q=80',
}

function getImg(item: MenuItem): string {
  if (item.image_url) return item.image_url
  const cat = item.menu_categories?.name?.toLowerCase().trim() ?? ''
  return CATEGORY_IMAGES[cat] ?? CATEGORY_IMAGES.default
}

type Category = { id: string; name: string; sort_order: number }
type MenuItem = {
  id: string; name: string; price: number
  image_url: string | null; is_available: boolean
  menu_categories: { id: string; name: string } | null
}
type CartRow = { item: MenuItem; qty: number }
type SlipData = {
  orderId: string; rows: CartRow[]
  orderType: 'dine_in' | 'delivery'; address: string
  subtotal: number; gst: number; total: number
  placedAt: Date
}

// ── Payment Slip ─────────────────────────────────────────────
function PaymentSlip({ slip, onClose }: { slip: SlipData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
      <div id="slip" className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-md print:rounded-none print:shadow-none print:max-w-full">

        {/* Actions — hidden when printing */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded-xl transition text-sm"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Header */}
          <div className="text-center mb-5 border-b border-dashed border-gray-200 pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo/logo.png" alt="Pseudo Café" width={44} height={44} className="mx-auto mb-2" style={{ objectFit: 'contain' }} />
            <p className="text-2xl font-black tracking-tight text-gray-900">Pseudo Café</p>
            <p className="text-xs text-gray-400 mt-0.5">The Pseudo Engineers Café by 1972, Lahore</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
              <CheckCircle2 size={13} className="text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700">Order Placed</span>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-5">
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-medium">Order ID</p>
              <p className="font-mono font-bold text-gray-800 text-xs">{slip.orderId.slice(0,8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-medium">Date & Time</p>
              <p className="font-semibold text-gray-800">{slip.placedAt.toLocaleDateString('en-PK')} {slip.placedAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide font-medium">Order Type</p>
              <p className="font-semibold text-gray-800 capitalize">{slip.orderType === 'dine_in' ? 'Dine In' : 'Delivery'}</p>
            </div>
            {slip.orderType === 'delivery' && slip.address && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide font-medium">Delivery To</p>
                <p className="font-semibold text-gray-800 text-xs">{slip.address}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <table className="w-full text-sm mb-5">
            <thead>
              <tr className="border-b border-dashed border-gray-200 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left pb-2 font-medium">Item</th>
                <th className="text-center pb-2 font-medium w-8">Qty</th>
                <th className="text-right pb-2 font-medium">Price</th>
                <th className="text-right pb-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {slip.rows.map(({ item, qty }) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800 font-medium pr-2">{item.name}</td>
                  <td className="py-2 text-center text-gray-600">{qty}</td>
                  <td className="py-2 text-right text-gray-600">PKR {item.price.toLocaleString()}</td>
                  <td className="py-2 text-right font-semibold text-gray-800">PKR {(item.price * qty).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1.5 text-sm border-t border-dashed border-gray-200 pt-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>PKR {slip.subtotal.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (18%)</span>
              <span>PKR {slip.gst.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-300 pt-2 mt-2">
              <span>GRAND TOTAL</span>
              <span>PKR {slip.total.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6 border-t border-dashed border-gray-200 pt-4">
            Thank you for ordering with Pseudo Café! 🍕<br />
            Please retain this slip for your reference.
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #slip, #slip * { visibility: visible; }
          #slip { position: fixed; inset: 0; margin: auto; }
        }
      `}</style>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState<Record<string, CartRow>>({})
  const [showCart, setShowCart] = useState(false)
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery'>('dine_in')
  const [address, setAddress] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [slip, setSlip] = useState<SlipData | null>(null)
  const [user, setUser] = useState<{ email: string } | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/public/menu')
      .then(r => r.json())
      .then(({ items, categories }) => {
        setItems(items ?? [])
        setCategories(categories ?? [])
        setLoading(false)
      })
  }, [])

  // Pre-fill cart from Best Deals page selection
  useEffect(() => {
    const saved = localStorage.getItem('pseudocafe_deals_cart')
    if (!saved) return
    try {
      const incoming = JSON.parse(saved) as Record<string, CartRow>
      setCart(prev => ({ ...incoming, ...prev }))
      localStorage.removeItem('pseudocafe_deals_cart')
      setShowCart(true)
    } catch { /* ignore malformed data */ }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser({ email: user.email ?? '' })
    })
  }, [])

  const adjust = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const cur = prev[item.id]?.qty ?? 0
      const next = cur + delta
      if (next <= 0) {
        const { [item.id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [item.id]: { item, qty: next } }
    })
  }

  const cartRows = Object.values(cart)
  const cartCount = cartRows.reduce((s, r) => s + r.qty, 0)
  const subtotal = cartRows.reduce((s, r) => s + r.item.price * r.qty, 0)
  const gst = Math.round(subtotal * GST)
  const total = subtotal + gst

  const placeOrder = async () => {
    if (!user) { window.location.href = '/login'; return }
    if (orderType === 'delivery' && !address.trim()) {
      setPlaceError('Please enter a delivery address.')
      return
    }
    setPlaceError(null)
    setPlacing(true)
    const res = await fetch('/api/customer/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartRows, orderType, address }),
    })
    const data = await res.json()
    if (!res.ok) { setPlaceError(data.error ?? 'Failed to place order'); setPlacing(false); return }
    setSlip({ orderId: data.orderId, rows: cartRows, orderType, address, subtotal, gst, total, placedAt: new Date() })
    setCart({})
    setShowCart(false)
    setPlacing(false)
  }

  const available = items.filter(i => i.is_available)
  const filtered = activeCategory === 'all'
    ? available
    : available.filter(i => i.menu_categories?.id === activeCategory)

  const grouped: Record<string, MenuItem[]> = {}
  if (activeCategory === 'all') {
    available.forEach(i => {
      const cat = i.menu_categories?.name ?? 'Other'
      grouped[cat] = [...(grouped[cat] ?? []), i]
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-950 text-white pt-20">

      {/* Hero */}
      <div className="relative overflow-hidden bg-black/60 border-b border-white/5">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=60')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-yellow-400 text-sm font-semibold tracking-widest uppercase mb-2">Order Online</p>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Fresh from our<br /><span className="text-yellow-400">kitchen to you</span>
            </h1>
            <p className="text-gray-400 mt-3 text-base max-w-md">
              Browse our full menu, build your order, and get a GST-inclusive payment slip in seconds.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setOrderType('dine_in'); tabsRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all text-sm ${orderType === 'dine_in' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <UtensilsCrossed size={16} /> Dine In
            </button>
            <button
              onClick={() => { setOrderType('delivery'); tabsRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all text-sm ${orderType === 'delivery' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <Truck size={16} /> Delivery
            </button>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div ref={tabsRef} className="sticky top-16 z-20 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${activeCategory === 'all' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${activeCategory === cat.id ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu grid */}
      <div className="max-w-6xl mx-auto px-6 pb-32 pt-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 animate-pulse h-64" />
            ))}
          </div>
        ) : activeCategory === 'all' ? (
          Object.entries(grouped).map(([catName, catItems]) => (
            <div key={catName} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-white">{catName}</h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500">{catItems.length} items</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {catItems.map(item => <ItemCard key={item.id} item={item} qty={cart[item.id]?.qty ?? 0} onAdjust={(d) => adjust(item, d)} />)}
              </div>
            </div>
          ))
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(item => <ItemCard key={item.id} item={item} qty={cart[item.id]?.qty ?? 0} onAdjust={(d) => adjust(item, d)} />)}
          </div>
        )}

        {!loading && available.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <UtensilsCrossed size={40} className="mx-auto mb-4 opacity-30" />
            <p>No items available right now.</p>
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-3.5 rounded-2xl shadow-2xl shadow-yellow-500/30 transition-all"
        >
          <ShoppingCart size={20} />
          <span>{cartCount} item{cartCount > 1 ? 's' : ''}</span>
          <span className="bg-black/20 rounded-lg px-2 py-0.5 text-sm">PKR {total.toLocaleString()}</span>
          <ChevronRight size={16} />
        </button>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm bg-gray-950 border-l border-white/10 flex flex-col shadow-2xl overflow-y-auto">

            {/* Cart header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-lg">Your Order</h2>
                <p className="text-gray-400 text-xs">{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            {/* Order type toggle */}
            <div className="px-5 py-4 border-b border-white/10">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Order Type</p>
              <div className="flex gap-2">
                {([
                  { v: 'dine_in', label: 'Dine In', icon: UtensilsCrossed },
                  { v: 'delivery', label: 'Delivery', icon: Truck },
                ] as const).map(({ v, label, icon: Icon }) => (
                  <button
                    key={v}
                    onClick={() => setOrderType(v)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${orderType === v ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/15'}`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {orderType === 'delivery' && (
                <div className="mt-3">
                  <label className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                    <MapPin size={11} /> Delivery Address
                  </label>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="House no., street, area, city…"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 px-5 py-4 space-y-3">
              {cartRows.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-800">
                    <Image src={getImg(item)} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    <p className="text-yellow-400 text-xs font-semibold">PKR {(item.price * qty).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => adjust(item, -1)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                      <Minus size={12} />
                    </button>
                    <span className="text-white text-sm font-bold w-5 text-center">{qty}</span>
                    <button onClick={() => adjust(item, 1)} className="w-6 h-6 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black flex items-center justify-center transition">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill summary */}
            <div className="px-5 py-4 border-t border-white/10 bg-black/40 space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span>PKR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>GST (18%)</span>
                <span>PKR {gst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
                <span>Total</span>
                <span className="text-yellow-400">PKR {total.toLocaleString()}</span>
              </div>

              {placeError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{placeError}</p>
              )}

              {!user ? (
                <Link
                  href="/login"
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl transition"
                >
                  <LogIn size={16} /> Sign in to Place Order
                </Link>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl transition"
                >
                  {placing ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {placing ? 'Placing Order…' : 'Place Order & Get Slip'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Slip */}
      {slip && <PaymentSlip slip={slip} onClose={() => setSlip(null)} />}
    </div>
  )
}

// ── Item Card ────────────────────────────────────────────────
function ItemCard({ item, qty, onAdjust }: { item: MenuItem; qty: number; onAdjust: (d: number) => void }) {
  return (
    <div className="group bg-gray-900/80 border border-white/5 hover:border-yellow-500/30 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col">
      {/* Image */}
      <div className="relative h-36 w-full bg-gray-800 overflow-hidden">
        <Image
          src={getImg(item)}
          alt={item.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized
        />
        {item.menu_categories?.name && (
          <span className="absolute top-2 left-2 text-xs font-semibold bg-black/70 backdrop-blur-sm text-yellow-400 px-2 py-0.5 rounded-full">
            {item.menu_categories.name}
          </span>
        )}
      </div>

      {/* Info + controls */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-white text-sm font-semibold leading-tight">{item.name}</p>
        <p className="text-yellow-400 text-sm font-bold">PKR {item.price.toLocaleString()}</p>

        <div className="mt-auto">
          {qty === 0 ? (
            <button
              onClick={() => onAdjust(1)}
              className="w-full flex items-center justify-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold py-2 rounded-xl transition"
            >
              <Plus size={14} /> Add
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => onAdjust(-1)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
                <Minus size={14} />
              </button>
              <span className="text-white font-bold text-sm">{qty}</span>
              <button onClick={() => onAdjust(1)} className="w-8 h-8 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black flex items-center justify-center transition">
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
