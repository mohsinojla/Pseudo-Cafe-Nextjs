import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  owner: '/outlet',
  manager: '/outlet',
  cashier: '/cashier',
  waiter: '/waiter',
  kitchen: '/kitchen',
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isStaffRoute =
    pathname.startsWith('/outlet') ||
    pathname.startsWith('/waiter') ||
    pathname.startsWith('/kitchen') ||
    pathname.startsWith('/cashier')
  const isApiRoute = pathname.startsWith('/api/orders') ||
    pathname.startsWith('/api/payments') ||
    pathname.startsWith('/api/tables') ||
    pathname.startsWith('/api/staff')

  if (!user && (isStaffRoute || isApiRoute)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('users')
      .select('outlet_id, roles(name)')
      .eq('id', user.id)
      .single() as { data: { outlet_id: string | null; roles: { name: string } | null } | null; error: unknown }

    if (profile) {
      const roleName = profile.roles?.name ?? ''
      const base = ROLE_HOME[roleName] ?? '/dashboard'
      const dest = profile.outlet_id ? `${base}/${profile.outlet_id}` : base
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/outlet/:path*',
    '/waiter/:path*',
    '/kitchen/:path*',
    '/cashier/:path*',
    '/api/orders/:path*',
    '/api/payments/:path*',
    '/api/tables/:path*',
    '/api/staff/:path*',
    '/login',
  ],
}
