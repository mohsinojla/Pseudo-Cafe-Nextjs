import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  owner: '/outlet',
  manager: '/outlet',
  cashier: '/cashier',
  waiter: '/waiter',
  kitchen: '/kitchen',
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  // Get the user who just signed in via Google
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  type StaffProfile = { outlet_id: string | null; onboarding_status: string | null; roles: { name: string } | null }

  // Look up their staff profile — first by auth id, then by email (Google may create a new auth id)
  let profile: StaffProfile | null = null

  const byId = await supabase
    .from('users')
    .select('outlet_id, onboarding_status, roles(name)')
    .eq('id', user.id)
    .single() as { data: StaffProfile | null; error: unknown }

  if (byId.data) {
    profile = byId.data
  } else if (user.email) {
    // Google created a separate auth identity — look up by email
    const byEmail = await supabase
      .from('users')
      .select('outlet_id, onboarding_status, roles(name)')
      .eq('email', user.email)
      .single() as { data: StaffProfile | null; error: unknown }
    profile = byEmail.data
  }

  // First-time Google login: flip pending → active (this is the identity verification step)
  if (profile?.onboarding_status === 'pending') {
    await supabase
      .from('users')
      .update({ onboarding_status: 'active' } as Record<string, string>)
      .eq('email', user.email!)
  }

  // Route staff to their POS screen, everyone else to home
  if (profile) {
    const roleName = (profile.roles as { name: string } | null)?.name ?? ''
    const base = ROLE_HOME[roleName] ?? '/outlet'
    const dest = profile.outlet_id ? `${base}/${profile.outlet_id}` : base
    return NextResponse.redirect(`${origin}${dest}`)
  }

  // Regular (non-staff) Google user — go to home
  return NextResponse.redirect(`${origin}/`)
}
