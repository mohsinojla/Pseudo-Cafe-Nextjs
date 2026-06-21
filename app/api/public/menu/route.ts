import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createAdminClient()

  const { data: outlet } = await supabase
    .from('outlets')
    .select('id')
    .limit(1)
    .single() as { data: { id: string } | null; error: unknown }

  if (!outlet) return NextResponse.json({ items: [], categories: [], outletId: null })

  const [itemsRes, catsRes] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, name, price, image_url, is_available, menu_categories(id, name)')
      .eq('outlet_id', outlet.id)
      .order('name'),
    supabase
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('outlet_id', outlet.id)
      .order('sort_order'),
  ])

  return NextResponse.json({
    items: itemsRes.data ?? [],
    categories: catsRes.data ?? [],
    outletId: outlet.id,
  })
}
