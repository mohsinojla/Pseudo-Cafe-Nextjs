import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/rbac/can'
import { createOrderSchema } from '@/lib/validation/orderSchema'
import type { User, Order } from '@/types/database'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  let query = supabase
    .from('orders')
    .select('*, tables(*), order_items(*, menu_items(*))')
    .order('created_at', { ascending: false })

  if (profile.outlet_id) {
    query = query.eq('outlet_id', profile.outlet_id)
  }

  const { data, error } = await query as { data: Order[] | null; error: unknown }
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const allowed = await can(profile, 'order.create')
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      outlet_id: profile.outlet_id!,
      table_id: parsed.data.table_id ?? null,
      order_type: parsed.data.order_type,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single() as { data: Order | null; error: unknown }

  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })

  if (parsed.data.table_id) {
    await supabase.from('tables').update({ status: 'seated' }).eq('id', parsed.data.table_id)
  }

  return NextResponse.json(data, { status: 201 })
}
