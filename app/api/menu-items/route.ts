import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/rbac/can'
import { menuItemSchema } from '@/lib/validation/menuSchema'
import type { User } from '@/types/database'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const outletId = url.searchParams.get('outlet_id')
  if (!outletId) return NextResponse.json({ error: 'outlet_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name, sort_order), menu_item_modifiers(*)')
    .eq('outlet_id', outletId)
    .order('category_id') as { data: unknown[] | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = await can(profile, 'menu.edit')
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = menuItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('menu_items')
    .insert({ ...parsed.data, outlet_id: profile.outlet_id! })
    .select()
    .single() as { data: unknown; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
