'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  DollarSign, ClipboardList, TrendingUp, Table2,
  UtensilsCrossed, Users, BarChart3, ChevronRight,
  Wifi, Monitor, CreditCard,
} from 'lucide-react'

interface DashboardStats {
  todayRevenue: number
  orderCount: number
  avgOrderValue: number
  topItems: { name: string; qty: number }[]
  tableOccupancy: { total: number; occupied: number }
}

export default function OutletDashboard({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = use(params)
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [liveRevenue, setLiveRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [paymentsRes, ordersRes, itemsRes, tablesRes] = await Promise.all([
      supabase.from('payments')
        .select('amount, orders!inner(outlet_id, created_at)')
        .gte('paid_at', today.toISOString()),
      supabase.from('orders')
        .select('id')
        .eq('outlet_id', outletId)
        .gte('created_at', today.toISOString())
        .not('status', 'in', '("draft")'),
      supabase.from('order_items')
        .select('quantity, menu_items(name), orders!inner(outlet_id, created_at)')
        .gte('orders.created_at', today.toISOString()),
      supabase.from('tables')
        .select('status')
        .eq('outlet_id', outletId),
    ])

    const revenue = (paymentsRes.data ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0)
    const orderCount = ordersRes.data?.length ?? 0
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0

    const itemQty: Record<string, { name: string; qty: number }> = {}
    for (const row of (itemsRes.data ?? []) as unknown as { quantity: number; menu_items: { name: string } | null }[]) {
      const name = row.menu_items?.name ?? 'Unknown'
      if (!itemQty[name]) itemQty[name] = { name, qty: 0 }
      itemQty[name].qty += row.quantity
    }
    const topItems = Object.values(itemQty).sort((a, b) => b.qty - a.qty).slice(0, 5)

    const tables = tablesRes.data ?? []
    const occupied = tables.filter((t: { status: string }) => t.status !== 'free').length

    setStats({ todayRevenue: revenue, orderCount, avgOrderValue, topItems, tableOccupancy: { total: tables.length, occupied } })
    setLiveRevenue(revenue)
    setLoading(false)
  }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStats()

    const channel = supabase
      .channel(`dashboard-${outletId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
        setLiveRevenue((prev) => prev + (payload.new as { amount: number }).amount)
        fetchStats()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${outletId}` }, () => fetchStats())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [outletId, fetchStats]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen text-gray-400 text-lg">
        Loading dashboard…
      </div>
    )
  }

  const statCards = [
    {
      label: "Today's Revenue",
      value: `PKR ${liveRevenue.toLocaleString()}`,
      sub: 'Live',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      icon: DollarSign,
    },
    {
      label: 'Orders Today',
      value: stats?.orderCount.toString() ?? '0',
      sub: 'Completed & active',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      icon: ClipboardList,
    },
    {
      label: 'Avg Order Value',
      value: `PKR ${Math.round(stats?.avgOrderValue ?? 0).toLocaleString()}`,
      sub: 'Today',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      icon: TrendingUp,
    },
    {
      label: 'Tables Occupied',
      value: `${stats?.tableOccupancy.occupied} / ${stats?.tableOccupancy.total}`,
      sub: 'Right now',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      icon: Table2,
    },
  ]

  const posLinks = [
    { href: `/waiter/${outletId}`, label: 'Waiter POS', desc: 'Floor view & order builder', icon: Wifi, color: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    { href: `/kitchen/${outletId}`, label: 'Kitchen Display', desc: 'Live order queue', icon: Monitor, color: 'bg-gray-700 hover:bg-gray-600 text-white' },
    { href: `/cashier/${outletId}`, label: 'Cashier', desc: 'Billing & payments', icon: CreditCard, color: 'bg-gray-700 hover:bg-gray-600 text-white' },
  ]

  return (
    <div className="p-6 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          {posLinks.map((pl) => {
            const Icon = pl.icon
            return (
              <Link
                key={pl.href}
                href={pl.href}
                className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition ${pl.color}`}
              >
                <Icon size={15} />
                {pl.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-gray-900 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{card.sub}</span>
              </div>
              <div className={`text-2xl font-bold ${card.color} mb-1`}>{card.value}</div>
              <div className="text-gray-400 text-sm">{card.label}</div>
            </div>
          )
        })}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-yellow-400" />
            Top Items Today
          </h2>
          {(stats?.topItems.length ?? 0) === 0 ? (
            <p className="text-gray-500 text-sm">No orders yet today</p>
          ) : (
            <div className="space-y-3">
              {stats?.topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs font-mono w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm">{item.name}</span>
                      <span className="text-gray-400 text-sm">{item.qty} sold</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1">
                      <div
                        className="bg-yellow-500 rounded-full h-1 transition-all duration-700"
                        style={{ width: `${Math.round((item.qty / (stats.topItems[0]?.qty ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: `/outlet/${outletId}/menu`, label: 'Manage Menu', desc: 'Add, edit or remove items', icon: UtensilsCrossed },
              { href: `/outlet/${outletId}/staff`, label: 'Manage Staff', desc: 'Invite and manage team', icon: Users },
              { href: `/outlet/${outletId}/reports`, label: 'View Reports', desc: 'Sales & order history', icon: BarChart3 },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-white/5 transition group"
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium group-hover:text-yellow-400 transition-colors">{action.label}</p>
                    <p className="text-gray-500 text-xs">{action.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
