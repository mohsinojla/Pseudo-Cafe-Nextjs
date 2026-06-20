import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/rbac/can'
import { updateOrderStatusSchema } from '@/lib/validation/orderSchema'
import { canTransition } from '@/lib/orders/stateMachine'
import type { OrderStatus, User } from '@/types/database'

interface OrderRow { id: string; status: string; table_id: string | null; outlet_id: string }

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select('*, tables(*), order_items(*, menu_items(name, price), order_item_modifiers(modifier_id, menu_item_modifiers(name, price_delta)))')
    .eq('id', id)
    .single() as { data: unknown; error: unknown }

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = updateOrderStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('status, table_id, outlet_id')
    .eq('id', id)
    .single() as { data: OrderRow | null; error: unknown }

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (!canTransition(order.status as OrderStatus, parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${parsed.data.status}` },
      { status: 422 }
    )
  }

  const permissionMap: Partial<Record<OrderStatus, string>> = {
    placed: 'order.send_to_kitchen',
    in_kitchen: 'order.send_to_kitchen',
    billed: 'order.bill',
    paid: 'order.mark_paid',
  }
  const requiredPerm = permissionMap[parsed.data.status]
  if (requiredPerm) {
    const allowed = await can(profile, requiredPerm, { outlet_id: order.outlet_id })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updatePayload: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.status === 'closed') updatePayload.closed_at = new Date().toISOString()

  const { data: updated, error } = await supabase
    .from('orders').update(updatePayload).eq('id', id).select().single() as { data: unknown; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (order.table_id) {
    if (parsed.data.status === 'in_kitchen') {
      await supabase.from('tables').update({ status: 'ordered' }).eq('id', order.table_id)
    } else if (parsed.data.status === 'billed') {
      await supabase.from('tables').update({ status: 'bill_requested' }).eq('id', order.table_id)
    } else if (parsed.data.status === 'closed') {
      await supabase.from('tables').update({ status: 'free' }).eq('id', order.table_id)
    }
  }

  return NextResponse.json(updated)
}
