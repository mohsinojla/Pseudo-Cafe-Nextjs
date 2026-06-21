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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  type StaffProfile = { outlet_id: string | null; roles: { name: string } | null }

  // Check if this user is a staff member (look up by auth id, then email as fallback)
  let profile: StaffProfile | null = null

  const byId = await supabase
    .from('users')
    .select('outlet_id, roles(name)')
    .eq('id', user.id)
    .single() as { data: StaffProfile | null; error: unknown }

  if (byId.data) {
    profile = byId.data
  } else if (user.email) {
    const byEmail = await supabase
      .from('users')
      .select('outlet_id, roles(name)')
      .eq('email', user.email)
      .single() as { data: StaffProfile | null; error: unknown }
    profile = byEmail.data
  }

  // Staff → route to their POS screen
  if (profile) {
    const roleName = (profile.roles as { name: string } | null)?.name ?? ''
    const base = ROLE_HOME[roleName] ?? '/outlet'
    const dest = profile.outlet_id ? `${base}/${profile.outlet_id}` : base
    return NextResponse.redirect(`${origin}${dest}`)
  }

  // Customer — first-time Google login needs to set a password; returning customers go home
  const passwordSet = user.user_metadata?.password_set === true
  if (!passwordSet) {
    return NextResponse.redirect(`${origin}/setup-account`)
  }

  return NextResponse.redirect(`${origin}/`)
}
