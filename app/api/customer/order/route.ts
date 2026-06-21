import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to place an order' }, { status: 401 })

  const body = await request.json()
  const { items, orderType, address } = body as {
    items: { item: { id: string; price: number }; qty: number }[]
    orderType: 'dine_in' | 'delivery'
    address: string
  }

  if (!items?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  const admin = await createAdminClient()

  const { data: outlet } = await admin
    .from('outlets')
    .select('id')
    .limit(1)
    .single() as { data: { id: string } | null; error: unknown }

  if (!outlet) return NextResponse.json({ error: 'No outlet found' }, { status: 500 })

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      outlet_id: outlet.id,
      table_id: null,
      order_type: orderType,
      status: 'in_kitchen',
      created_by: null,
    } as Record<string, unknown>)
    .select('id')
    .single() as { data: { id: string } | null; error: unknown }

  if (orderError || !order) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })

  const orderItems = items.map(({ item, qty }) => ({
    order_id: order.id,
    menu_item_id: item.id,
    quantity: qty,
    unit_price: item.price,
    status: 'queued',
    notes: orderType === 'delivery' && address ? `Delivery to: ${address}` : null,
  }))

  await admin.from('order_items').insert(orderItems as Record<string, unknown>[])

  return NextResponse.json({ orderId: order.id })
}
