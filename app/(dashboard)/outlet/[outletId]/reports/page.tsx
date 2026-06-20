'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReportData {
  payments: { amount: number; method: string; paid_at: string }[]
  topItems: { name: string; qty: number; revenue: number }[]
  ordersByHour: Record<number, number>
}

export default function ReportsPage({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = use(params)
  const supabase = createClient()
  const [data, setData] = useState<ReportData | null>(null)
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today')
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const since = new Date(now)

    if (range === 'today') since.setHours(0, 0, 0, 0)
    else if (range === 'week') since.setDate(since.getDate() - 7)
    else since.setDate(since.getDate() - 30)

    const [paymentsRes, itemsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount, method, paid_at, orders!inner(outlet_id)')
        .gte('paid_at', since.toISOString()),
      supabase
        .from('order_items')
        .select('quantity, unit_price, menu_items(name), orders!inner(outlet_id, created_at)')
        .gte('orders.created_at', since.toISOString()),
    ])

    const payments = (paymentsRes.data ?? []) as { amount: number; method: string; paid_at: string }[]

    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const row of (itemsRes.data ?? []) as unknown as { quantity: number; unit_price: number; menu_items: { name: string } | null }[]) {
      const name = row.menu_items?.name ?? 'Unknown'
      if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 }
      itemMap[name].qty += row.quantity
      itemMap[name].revenue += row.quantity * row.unit_price
    }
    const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    const ordersByHour: Record<number, number> = {}
    for (const p of payments) {
      const h = new Date(p.paid_at).getHours()
      ordersByHour[h] = (ordersByHour[h] ?? 0) + 1
    }

    setData({ payments, topItems, ordersByHour })
    setLoading(false)
  }, [outletId, range]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchReport() }, [fetchReport])

  const totalRevenue = data?.payments.reduce((s, p) => s + p.amount, 0) ?? 0
  const byMethod = (data?.payments ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] ?? 0) + p.amount
    return acc
  }, {})

  const rangeLabels = { today: 'Today', week: 'Last 7 days', month: 'Last 30 days' }

  return (
    <div className="p-6 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 text-sm mt-1">{rangeLabels[range]}</p>
        </div>
        <div className="flex gap-1 bg-gray-900 border border-white/5 rounded-xl p-1">
          {(['today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                range === r ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-white/5 rounded-2xl p-5 col-span-2 lg:col-span-1">
              <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
              <p className="text-yellow-400 text-3xl font-bold">PKR {totalRevenue.toLocaleString()}</p>
            </div>
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="bg-gray-900 border border-white/5 rounded-2xl p-5">
                <p className="text-gray-400 text-sm mb-1 capitalize">{method}</p>
                <p className="text-white text-2xl font-bold">PKR {amount.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Top Items */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Top Items by Revenue</h2>
            {data?.topItems.length === 0 ? (
              <p className="text-gray-500 text-sm">No data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="text-left py-2 font-medium">#</th>
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-right py-2 font-medium">Qty Sold</th>
                      <th className="text-right py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.topItems.map((item, i) => (
                      <tr key={item.name} className="border-b border-white/5 last:border-0">
                        <td className="py-3 text-gray-500">{i + 1}</td>
                        <td className="py-3 text-white">{item.name}</td>
                        <td className="py-3 text-gray-400 text-right">{item.qty}</td>
                        <td className="py-3 text-yellow-400 font-semibold text-right">PKR {item.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
