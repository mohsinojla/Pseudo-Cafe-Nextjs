import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface UserProfile { outlet_id: string | null; org_id: string }

export default async function DashboardRoot() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('outlet_id, org_id')
    .eq('id', user.id)
    .single() as { data: UserProfile | null; error: unknown }

  if (profile?.outlet_id) {
    redirect(`/outlet/${profile.outlet_id}`)
  }

  return (
    <div className="flex items-center justify-center h-full min-h-screen text-gray-400">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Pseudo Café</h1>
        <p className="text-gray-400">No outlet assigned to your account. Contact your administrator.</p>
      </div>
    </div>
  )
}
