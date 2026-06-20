'use client'

import { use, useEffect, useState, useCallback, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Eye, EyeOff, UtensilsCrossed, ImageIcon } from 'lucide-react'
import type { MenuItem, MenuCategory } from '@/types/database'

type MenuItemWithCategory = MenuItem & {
  menu_categories: MenuCategory | null
  menu_item_modifiers: { id: string; name: string; price_delta: number }[]
  image_url?: string | null
}

// Category-based placeholder images from Unsplash (stable IDs)
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

function getCategoryImage(categoryName: string): string {
  const key = categoryName.toLowerCase().trim()
  return CATEGORY_IMAGES[key] ?? CATEGORY_IMAGES.default
}

export default function MenuManagementPage({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = use(params)
  const supabase = createClient()

  const [items, setItems] = useState<MenuItemWithCategory[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editItem, setEditItem] = useState<MenuItemWithCategory | null>(null)

  const [form, setForm] = useState({
    name: '', price: '', category_id: '', is_available: true, image_url: '',
  })

  const fetchData = useCallback(async () => {
    const [itemsRes, catsRes] = await Promise.all([
      supabase
        .from('menu_items')
        .select('*, menu_categories(*), menu_item_modifiers(*)')
        .eq('outlet_id', outletId)
        .order('category_id'),
      supabase.from('menu_categories').select('*').eq('outlet_id', outletId).order('sort_order'),
    ])
    if (itemsRes.data) setItems(itemsRes.data as MenuItemWithCategory[])
    if (catsRes.data) setCategories(catsRes.data)
    setLoading(false)
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', price: '', category_id: categories[0]?.id ?? '', is_available: true, image_url: '' })
    setShowForm(true)
  }

  const openEdit = (item: MenuItemWithCategory) => {
    setEditItem(item)
    setForm({
      name: item.name,
      price: String(item.price),
      category_id: item.category_id ?? '',
      is_available: item.is_available,
      image_url: item.image_url ?? '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      category_id: form.category_id,
      is_available: form.is_available,
      outlet_id: outletId,
      image_url: form.image_url.trim() || null,
    }

    if (editItem) {
      await supabase.from('menu_items').update(payload as any).eq('id', editItem.id)
    } else {
      await supabase.from('menu_items').insert(payload as any)
    }

    setSaving(false)
    setShowForm(false)
    await fetchData()
  }

  const toggleAvailability = async (item: MenuItemWithCategory) => {
    await supabase.from('menu_items').update({ is_available: !item.is_available } as any).eq('id', item.id)
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i))
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const grouped = items.reduce<Record<string, MenuItemWithCategory[]>>((acc, item) => {
    const cat = item.menu_categories?.name ?? 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  if (loading) {
    return <div className="flex items-center justify-center h-full min-h-screen text-gray-400">Loading…</div>
  }

  return (
    <div className="p-6 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Menu Management</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} items across {categories.length} categories</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded-xl text-sm transition"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} className="mb-10">
          {/* Category header */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">{category}</h2>
            <div className="flex-1 h-px bg-yellow-500/10" />
            <span className="text-xs text-gray-600">{catItems.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {catItems.map((item) => {
              const imgSrc = item.image_url || getCategoryImage(category)
              return (
                <div
                  key={item.id}
                  className={`bg-gray-900 border rounded-2xl overflow-hidden flex flex-col group transition ${
                    item.is_available ? 'border-white/5 hover:border-white/10' : 'border-red-500/20 opacity-60'
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-36 bg-gray-800 overflow-hidden">
                    <Image
                      src={imgSrc}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    {/* Availability overlay */}
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-red-400 text-xs font-semibold bg-red-500/20 px-2 py-1 rounded-full">Unavailable</span>
                      </div>
                    )}
                    {/* Available badge */}
                    {item.is_available && (
                      <div className="absolute top-2 right-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 backdrop-blur-sm border border-emerald-500/20">
                          Available
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-white font-semibold leading-tight mb-0.5">{item.name}</p>
                    <p className="text-yellow-400 font-bold text-sm mb-2">PKR {item.price.toLocaleString()}</p>
                    {item.menu_item_modifiers.length > 0 && (
                      <p className="text-gray-600 text-xs mb-2">{item.menu_item_modifiers.length} modifier(s)</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        onClick={() => openEdit(item)}
                        title="Edit"
                        className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs py-1.5 rounded-lg transition"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAvailability(item)}
                        title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                        className="flex items-center justify-center w-8 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition"
                      >
                        {item.is_available ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        title="Delete"
                        className="flex items-center justify-center w-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
            <UtensilsCrossed size={28} className="text-gray-600" />
          </div>
          <p className="text-lg mb-1">No menu items yet</p>
          <p className="text-sm text-gray-700 mb-4">Add your first item to get started</p>
          <button onClick={openCreate} className="text-yellow-400 hover:text-yellow-300 transition text-sm">
            Add item →
          </button>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg mb-5">{editItem ? 'Edit Item' : 'Add Menu Item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Price (PKR)</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Category</label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-gray-500" />
                  Image URL <span className="text-gray-600 text-xs">(optional — leave blank for auto)</span>
                </label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                {form.image_url && (
                  <div className="mt-2 relative h-28 rounded-lg overflow-hidden bg-gray-800">
                    <Image src={form.image_url} alt="Preview" fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="available"
                  checked={form.is_available}
                  onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
                  className="w-4 h-4 accent-yellow-500"
                />
                <label htmlFor="available" className="text-sm text-gray-300">Available for ordering</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl transition"
                >
                  {saving ? 'Saving…' : editItem ? 'Update' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
