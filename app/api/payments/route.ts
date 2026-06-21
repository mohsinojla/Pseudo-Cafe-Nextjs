import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { can } from '@/lib/rbac/can'
import { paymentSchema } from '@/lib/validation/paymentSchema'
import type { User } from '@/types/database'

interface OrderRow { id: string; status: string; outlet_id: string; table_id: string | null }
interface PaymentRow { id: string; order_id: string; amount: number; method: string; reference_no: string | null; marked_by: string | null; paid_at: string }

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single() as { data: User | null; error: unknown }
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const allowed = await can(profile, 'order.mark_paid')
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (parsed.data.discount && parsed.data.discount > 0) {
    const discountAllowed = await can(profile, 'order.discount', { value: parsed.data.discount })
    if (!discountAllowed) {
      return NextResponse.json({ error: 'Discount exceeds your allowed limit' }, { status: 403 })
    }
  }

  const { data: order } = await supabase
    .from('orders').select('id, status, outlet_id, table_id').eq('id', parsed.data.order_id).single() as { data: OrderRow | null; error: unknown }

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  // Allow payment for billed table orders, or ready online orders (no table)
  const isOnlineReady = order.status === 'ready' && !order.table_id
  if (order.status !== 'billed' && !isOnlineReady) {
    return NextResponse.json({ error: 'Order must be billed (dine-in) or ready (online) to process payment' }, { status: 422 })
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: parsed.data.order_id,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference_no: parsed.data.reference_no ?? null,
      marked_by: user.id,
    })
    .select()
    .single() as { data: PaymentRow | null; error: { message: string } | null }

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message ?? 'Failed to record payment' }, { status: 500 })
  }

  // Transition billed → paid → closed in sequence
  const { error: paidError } = await supabase
    .from('orders').update({ status: 'paid' }).eq('id', order.id) as { error: { message: string } | null }

  if (paidError) {
    return NextResponse.json({ error: `Payment recorded but order status update failed: ${paidError.message}` }, { status: 500 })
  }

  const { error: closedError } = await supabase
    .from('orders').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', order.id) as { error: { message: string } | null }

  if (closedError) {
    return NextResponse.json({ error: `Payment recorded but order close failed: ${closedError.message}` }, { status: 500 })
  }

  // Free the table
  if (order.table_id) {
    await supabase.from('tables').update({ status: 'free' } as any).eq('id', order.table_id)
  }

  return NextResponse.json(payment, { status: 201 })
}
