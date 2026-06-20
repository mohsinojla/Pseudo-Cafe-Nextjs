import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/rbac/can'
import { addOrderItemsSchema, updateOrderItemStatusSchema } from '@/lib/validation/orderSchema'
import type { User } from '@/types/database'

interface MenuItemRow { id: string; price: number; is_available: boolean }
interface OrderItemRow { id: string; order_id: string; menu_item_id: string | null; quantity: number; status: string; notes: string | null; unit_price: number }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = await can(profile, 'order.edit')
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = addOrderItemsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: order } = await supabase.from('orders').select('id, outlet_id').eq('id', orderId).single() as { data: { id: string; outlet_id: string } | null; error: unknown }
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const menuItemIds = parsed.data.items.map((i) => i.menu_item_id)
  const { data: menuItems } = await supabase
    .from('menu_items').select('id, price, is_available').in('id', menuItemIds) as { data: MenuItemRow[] | null; error: unknown }

  const priceMap = Object.fromEntries((menuItems ?? []).map((m) => [m.id, m]))

  const insertRows = parsed.data.items.map((item) => ({
    order_id: orderId,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    notes: item.notes ?? null,
    unit_price: priceMap[item.menu_item_id]?.price ?? 0,
    status: 'queued',
  }))

  const { data: inserted, error } = await supabase
    .from('order_items').insert(insertRows).select() as { data: OrderItemRow[] | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (let i = 0; i < parsed.data.items.length; i++) {
    const item = parsed.data.items[i]
    const insertedItem = (inserted ?? [])[i]
    if (item.modifier_ids?.length && insertedItem) {
      await supabase.from('order_item_modifiers').insert(
        item.modifier_ids.map((mid: string) => ({ order_item_id: insertedItem.id, modifier_id: mid }))
      )
    }
  }

  return NextResponse.json(inserted, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = await can(profile, 'order_item.update_status')
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { item_id, ...rest } = body
  if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 })

  const parsed = updateOrderItemStatusSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('order_items')
    .update({ status: parsed.data.status })
    .eq('id', item_id)
    .eq('order_id', orderId)
    .select()
    .single() as { data: OrderItemRow | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
