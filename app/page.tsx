import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/server'
import { ArrowRight, UtensilsCrossed, Truck, Star, Clock, Users, ChefHat } from 'lucide-react'

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

type MenuItem = {
  id: string; name: string; price: number
  image_url: string | null
  menu_categories: { name: string } | null
}

function getItemImg(item: MenuItem): string {
  if (item.image_url) return item.image_url
  const cat = item.menu_categories?.name?.toLowerCase().trim() ?? ''
  return CATEGORY_IMAGES[cat] ?? CATEGORY_IMAGES.default
}

export default async function Home() {
  let featuredItems: MenuItem[] = []
  let bestDealsItems: MenuItem[] = []

  try {
    const supabase = await createAdminClient()
    const { data: outlet } = await supabase.from('outlets').select('id').limit(1).single() as { data: { id: string } | null; error: unknown }

    if (outlet) {
      const [menuRes, dealsRes] = await Promise.all([
        supabase
          .from('menu_items')
          .select('id, name, price, image_url, menu_categories(name)')
          .eq('outlet_id', outlet.id)
          .eq('is_available', true)
          .limit(8),
        supabase
          .from('menu_items')
          .select('id, name, price, image_url, menu_categories(name)')
          .eq('outlet_id', outlet.id)
          .eq('is_available', true)
          .limit(4)
          .order('price', { ascending: true }),
      ])
      featuredItems = (menuRes.data ?? []) as unknown as MenuItem[]
      bestDealsItems = (dealsRes.data ?? []) as unknown as MenuItem[]
    }
  } catch {
    // gracefully degrade if DB unreachable
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&q=50')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black" />

        <div className="relative text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8">
            <Star size={11} fill="currentColor" /> Est. 1972 · Lahore, Pakistan
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-6">
            <span className="text-white">Crafted with</span>
            <br />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              passion.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Fresh ingredients, bold flavors, and the warmth of home — every single time.
            Where engineers and foodies share the same table.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/menu"
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 px-8 rounded-2xl transition-all duration-200 text-base"
            >
              <UtensilsCrossed size={18} /> Order Online
            </Link>
            <Link
              href="/best-deals"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-3.5 px-8 rounded-2xl border border-white/20 transition-all duration-200 text-base"
            >
              <Star size={16} /> Best Deals
            </Link>
          </div>

          {/* Service badges */}
          <div className="flex flex-wrap gap-3 justify-center mt-12">
            {[
              { icon: Truck, label: 'Delivery Available' },
              { icon: UtensilsCrossed, label: 'Dine In' },
              { icon: Clock, label: 'Open Daily' },
              { icon: ChefHat, label: 'Fresh Kitchen' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-400 text-xs font-medium px-3 py-1.5 rounded-full">
                <Icon size={12} className="text-yellow-400" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Menu ───────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-yellow-400 text-xs font-semibold tracking-widest uppercase mb-2">From Our Kitchen</p>
              <h2 className="text-3xl font-bold text-white">Menu Highlights</h2>
            </div>
            <Link href="/menu" className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-colors">
              Full Menu <ArrowRight size={15} />
            </Link>
          </div>

          {featuredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredItems.map((item) => (
                <Link
                  key={item.id}
                  href="/menu"
                  className="group bg-gray-900/60 border border-white/5 hover:border-yellow-500/30 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="relative h-36 overflow-hidden bg-gray-800">
                    <Image
                      src={getItemImg(item)}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      unoptimized
                    />
                    {item.menu_categories?.name && (
                      <span className="absolute top-2 left-2 text-xs font-semibold bg-black/70 text-yellow-400 px-2 py-0.5 rounded-full">
                        {item.menu_categories.name}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-white font-medium text-sm truncate">{item.name}</p>
                    <p className="text-yellow-400 font-bold text-sm mt-0.5">PKR {item.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-600">
              <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
              <p>Menu coming soon — check back shortly.</p>
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl transition"
            >
              View Full Menu & Order <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Best Deals ──────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 items-center">

            {/* Text side */}
            <div>
              <p className="text-yellow-400 text-xs font-semibold tracking-widest uppercase mb-3">
                <Star size={11} className="inline mr-1" fill="currentColor" /> Today&apos;s Best Deals
              </p>
              <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                Spin the wheel.<br />
                <span className="text-yellow-400">Find your deal.</span>
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Our interactive Best Deals page lets you customize your perfect pizza and discover our
                rotating offers — with sizes from personal to XL at incredible prices.
              </p>

              {bestDealsItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {bestDealsItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl p-2.5">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-gray-800">
                        <Image src={getItemImg(item)} alt={item.name} fill className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.name}</p>
                        <p className="text-yellow-400 text-xs font-bold">PKR {item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/best-deals"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold py-3 px-6 rounded-xl transition"
              >
                Explore Best Deals <ArrowRight size={15} />
              </Link>
            </div>

            {/* Visual side */}
            <div className="relative aspect-square max-h-96 rounded-3xl overflow-hidden bg-gray-900 border border-white/5">
              <Image
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=70"
                alt="Best Deals"
                fill
                className="object-cover opacity-70"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <span className="inline-block bg-yellow-500 text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-2">
                  Special Deals
                </span>
                <p className="text-white font-bold text-xl">Interactive Pizza Builder</p>
                <p className="text-gray-300 text-sm">Choose your size, pick your flavour</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Story ────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-gray-900">
            <Image
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=70"
              alt="Our Story"
              fill
              className="object-cover opacity-60"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          </div>
          <div>
            <p className="text-yellow-400 text-xs font-semibold tracking-widest uppercase mb-3">Our Story</p>
            <h2 className="text-4xl font-black text-white mb-4 leading-tight">
              Born in Lahore,<br />
              <span className="text-yellow-400">fuelled by passion.</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              Started by a group of engineers with an undying love for food, Pseudo Engineers Café
              was born from the idea that every meal should be unique, bold, and full of character.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8">
              What began as late-night kitchen experiments has grown into a full-fledged dining
              experience — where every dish tells a story and every visit feels like coming home.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: Clock, value: '1972', label: 'Est.' },
                { icon: Users, value: '10K+', label: 'Guests' },
                { icon: ChefHat, value: '50+', label: 'Items' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="text-center p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                  <Icon size={16} className="text-yellow-400 mx-auto mb-1" />
                  <p className="text-white font-black text-xl">{value}</p>
                  <p className="text-gray-600 text-xs uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
            >
              Read Our Full Story <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/5 bg-yellow-500/[0.03]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3">Hungry right now?</h2>
          <p className="text-gray-400 mb-8">Browse our full menu and place your order — dine in or delivery, your choice.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/menu" className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-7 rounded-xl transition">
              <UtensilsCrossed size={16} /> Order Online
            </Link>
            <Link href="/contact" className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-7 rounded-xl border border-white/10 transition">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
