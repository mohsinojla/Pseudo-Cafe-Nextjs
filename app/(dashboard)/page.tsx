'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardRoot() {
  const router = useRouter()

  useEffect(() => {
    async function go() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('users')
        .select('outlet_id')
        .eq('id', user.id)
        .single()
      router.push(profile?.outlet_id ? `/outlet/${profile.outlet_id}` : '/login')
    }
    go()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center text-gray-400">
        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Redirecting…</p>
      </div>
    </div>
  )
}
