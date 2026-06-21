'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tag, ShoppingCart, Star, Slice, LogIn, Loader2 } from 'lucide-react'

const pizzas = {
  mushroom:  { src: '/assets/pizzas/mushroom.png',  label: 'Mushroom',  desc: 'Mushrooms, mozzarella, garlic' },
  pepperoni: { src: '/assets/pizzas/pepperoni.png', label: 'Pepperoni', desc: 'Pepperoni, rich tomato base' },
  veggie:    { src: '/assets/pizzas/veggie.png',    label: 'Veggie',    desc: 'Garden-fresh vegetables, herbs' },
  corn:      { src: '/assets/pizzas/corn.png',      label: 'Corn',      desc: 'Sweet corn, capsicum, onion' },
} as const

type PizzaKey = keyof typeof pizzas

const SIZES = {
  S: { label: 'Small',  inches: '7"',  price: 799  },
  M: { label: 'Medium', inches: '10"', price: 1099 },
  L: { label: 'Large',  inches: '13"', price: 1399 },
} as const

type SizeKey = keyof typeof SIZES

const SCALE: Record<SizeKey, number> = { S: 0.78, M: 0.89, L: 1 }

type MenuItem = {
  id: string; name: string; price: number
  image_url: string | null; is_available: boolean
  menu_categories: { id: string; name: string } | null
}

export default function BestDealsPage() {
  // Desktop: single-pick with flip animation
  const [angle, setAngle]             = useState(0)
  const [topPizza, setTopPizza]       = useState<PizzaKey>('veggie')
  const [bottomPizza, setBottomPizza] = useState<PizzaKey>('corn')
  const [flipTarget, setFlipTarget]   = useState<'top' | 'bottom'>('bottom')
  const [selected, setSelected]       = useState<PizzaKey>('veggie')

  // Mobile: independent half picks (no animation)
  const [mobileTop, setMobileTop]       = useState<PizzaKey>('pepperoni')
  const [mobileBottom, setMobileBottom] = useState<PizzaKey>('corn')
  const [activeHalf, setActiveHalf]     = useState<'top' | 'bottom'>('top')

  const [size, setSize]         = useState<SizeKey>('M')
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser]         = useState<boolean | null>(null)
  const [adding, setAdding]     = useState(false)

  const router = useRouter()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(!!user))
  }, [])

  // Desktop pick — flip animation
  const desktopPick = (pizza: PizzaKey) => {
    setSelected(pizza)
    if (flipTarget === 'bottom') { setBottomPizza(pizza); setFlipTarget('top') }
    else                         { setTopPizza(pizza);    setFlipTarget('bottom') }
    setAngle((a) => a + 180)
  }

  // Mobile pick — directly update chosen half, no animation
  const mobilePick = (pizza: PizzaKey) => {
    if (activeHalf === 'top') setMobileTop(pizza)
    else                      setMobileBottom(pizza)
  }

  // Mobile "Add to Cart" — find matching DB items, save to localStorage, go to /menu
  const addToCart = async () => {
    if (!user) { router.push('/login'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/public/menu')
      const { items } = await res.json() as { items: MenuItem[] }

      const findMatch = (flavor: PizzaKey) =>
        items.find(i => i.name.toLowerCase().includes(flavor))

      const topMatch    = findMatch(mobileTop)
      const bottomMatch = findMatch(mobileBottom)

      const cartMap: Record<string, { item: MenuItem; qty: number }> = {}

      if (topMatch) {
        cartMap[topMatch.id] = { item: topMatch, qty: 1 }
      }
      if (bottomMatch && bottomMatch.id !== topMatch?.id) {
        cartMap[bottomMatch.id] = { item: bottomMatch, qty: 1 }
      } else if (topMatch && mobileTop !== mobileBottom) {
        // Both halves matched the same DB item — qty 1 is fine
      }

      localStorage.setItem('pseudocafe_deals_cart', JSON.stringify(cartMap))
      router.push('/menu')
    } finally {
      setAdding(false)
    }
  }

  const { price } = SIZES[size]

  // Which pizza is shown on which half for current mode
  const displayTop    = isMobile ? mobileTop    : topPizza
  const displayBottom = isMobile ? mobileBottom : bottomPizza

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="pt-24 pb-8 text-center px-4">
        <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
          <Tag size={11} /> Today&apos;s Best Deals
        </div>
        <h1 className="text-4xl md:text-6xl font-black leading-tight">
          Build Your<br />
          <span className="text-yellow-400">Perfect Pizza</span>
        </h1>
        <p className="text-gray-400 mt-3 text-sm md:text-base max-w-xs md:max-w-sm mx-auto">
          {isMobile
            ? 'Pick a different flavour for each half.'
            : 'Pick your flavour, choose your size, and order online.'}
        </p>
      </div>

      {/* ── Size cards ───────────────────────────────────── */}
      <div className="flex justify-center gap-3 px-4 mb-8">
        {(Object.keys(SIZES) as SizeKey[]).map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`flex-1 max-w-[112px] p-3 md:p-4 rounded-2xl border transition-all text-center ${
              size === s
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <p className={`text-xl font-black ${size === s ? 'text-yellow-400' : 'text-white'}`}>{s}</p>
            <p className="text-gray-500 text-xs mt-0.5">{SIZES[s].inches}</p>
            <p className={`text-sm font-bold mt-1.5 ${size === s ? 'text-yellow-400' : 'text-gray-300'}`}>
              PKR {SIZES[s].price.toLocaleString()}
            </p>
          </button>
        ))}
      </div>

      {/* ── Pizza circle ─────────────────────────────────── */}
      <div className="relative flex items-center justify-center" style={{ height: 'min(80vw, 400px)' }}>
        {/* Ambient glow */}
        <div
          className="absolute rounded-full bg-yellow-400/10 blur-3xl pointer-events-none"
          style={{ width: 'min(65vw, 320px)', height: 'min(65vw, 320px)' }}
        />

        <div
          className="relative rounded-full overflow-hidden transition-transform duration-700"
          style={{
            width:  'min(68vw, 340px)',
            height: 'min(68vw, 340px)',
            transform: isMobile
              ? `scale(${SCALE[size]})`
              : `rotate(${angle}deg) scale(${SCALE[size]})`,
          }}
        >
          {/* Top half */}
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(0 0 50% 0)' }}>
            <Image src={pizzas[displayTop].src} alt={displayTop} fill className="object-contain" />
          </div>
          {/* Bottom half */}
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(50% 0 0 0)' }}>
            <Image src={pizzas[displayBottom].src} alt={displayBottom} fill className="object-contain" />
          </div>

          {/* Mobile: dividing line between halves */}
          {isMobile && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-px h-0.5 bg-black/60 z-10 pointer-events-none" />
          )}
        </div>
      </div>

      {/* ── Info label ───────────────────────────────────── */}
      <div className="text-center px-4 mt-3 mb-6">
        {isMobile ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Slice size={14} className="text-yellow-400" />
              <p className="text-white font-bold text-lg">
                ½ {pizzas[mobileTop].label} <span className="text-gray-500">+</span> ½ {pizzas[mobileBottom].label}
              </p>
              <Slice size={14} className="text-yellow-400 scale-x-[-1]" />
            </div>
            <p className="text-gray-500 text-xs">Tap a half below, then choose your flavour</p>
          </>
        ) : (
          <>
            <p className="text-white font-bold text-xl">{pizzas[selected].label} Pizza</p>
            <p className="text-gray-500 text-sm mt-0.5">{pizzas[selected].desc}</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill="#eab308" className="text-yellow-500" />
              ))}
              <span className="text-gray-600 text-xs ml-1">Best seller</span>
            </div>
          </>
        )}
      </div>

      {/* ── MOBILE: Two-half picker ───────────────────────── */}
      {isMobile && (
        <div className="px-4 max-w-sm mx-auto mb-6">
          {/* Half toggle tabs */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(['top', 'bottom'] as const).map((half) => {
              const pizza = half === 'top' ? mobileTop : mobileBottom
              const label = half === 'top' ? 'Top Half' : 'Bottom Half'
              return (
                <button
                  key={half}
                  onClick={() => setActiveHalf(half)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    activeHalf === half
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                      : 'border-white/10 bg-white/[0.03] text-gray-400'
                  }`}
                >
                  <div className="relative w-6 h-6 shrink-0">
                    <Image src={pizzas[pizza].src} alt={pizza} fill className="object-contain" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs opacity-60">{label}</p>
                    <p className="capitalize leading-none">{pizzas[pizza].label}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Flavour grid for active half */}
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(pizzas) as PizzaKey[]).map((pizza) => {
              const isActive = activeHalf === 'top' ? mobileTop === pizza : mobileBottom === pizza
              return (
                <button
                  key={pizza}
                  onClick={() => mobilePick(pizza)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                      : 'bg-white/[0.04] text-gray-300 border-white/10 active:bg-white/10'
                  }`}
                >
                  <div className="relative w-9 h-9 shrink-0">
                    <Image src={pizzas[pizza].src} alt={pizza} fill className="object-contain" />
                  </div>
                  <span className="capitalize text-left leading-tight">{pizzas[pizza].label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DESKTOP: Single-pick flavour grid ────────────── */}
      {!isMobile && (
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto px-4 mb-8">
          {(Object.keys(pizzas) as PizzaKey[]).map((pizza) => (
            <button
              key={pizza}
              onClick={() => desktopPick(pizza)}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border font-semibold text-sm transition-all ${
                selected === pizza
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                  : 'bg-white/[0.04] text-gray-300 border-white/10 hover:border-yellow-500/30 hover:bg-white/[0.07]'
              }`}
            >
              <div className="relative w-9 h-9 shrink-0">
                <Image src={pizzas[pizza].src} alt={pizza} fill className="object-contain" />
              </div>
              <span className="capitalize text-left leading-tight">{pizzas[pizza].label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Order summary + CTA ───────────────────────────── */}
      <div className="px-4 max-w-sm mx-auto pb-14 space-y-3">
        <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Your Selection</p>
            <p className="text-white font-semibold text-sm mt-0.5">
              {isMobile
                ? `½ ${pizzas[mobileTop].label} + ½ ${pizzas[mobileBottom].label}`
                : pizzas[selected].label}{' '}
              · {SIZES[size].label} ({SIZES[size].inches})
            </p>
          </div>
          <p className="text-yellow-400 font-black text-lg">PKR {price.toLocaleString()}</p>
        </div>

        {/* Mobile: Add to Cart / Sign in — Desktop: link to full menu */}
        {isMobile ? (
          user === false ? (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/15 text-white font-bold py-4 rounded-2xl transition-all text-base border border-white/10"
            >
              <LogIn size={18} /> Sign in to Add to Cart
            </Link>
          ) : (
            <button
              onClick={addToCart}
              disabled={adding || user === null}
              className="flex items-center justify-center gap-2 w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-60 text-black font-bold py-4 rounded-2xl transition-all text-base shadow-xl shadow-yellow-500/20"
            >
              {adding ? (
                <><Loader2 size={18} className="animate-spin" /> Adding…</>
              ) : (
                <><ShoppingCart size={18} /> Add to Cart</>
              )}
            </button>
          )
        ) : (
          <Link
            href="/menu"
            className="flex items-center justify-center gap-2 w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold py-4 rounded-2xl transition-all text-base shadow-xl shadow-yellow-500/20"
          >
            <ShoppingCart size={18} /> Order via Full Menu
          </Link>
        )}

        <p className="text-center text-gray-600 text-xs">
          18% GST applied at checkout · Dine in or delivery available
        </p>
      </div>

    </div>
  )
}
