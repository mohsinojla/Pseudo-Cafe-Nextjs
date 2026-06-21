'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const ROLE_HOME: Record<string, string> = {
  owner: '/outlet',
  manager: '/outlet',
  cashier: '/cashier',
  waiter: '/waiter',
  kitchen: '/kitchen',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
    // On success the browser is redirected by Supabase — no further action needed
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Login failed')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('outlet_id, roles(name)')
      .eq('id', data.user.id)
      .single() as { data: { outlet_id: string | null; roles: { name: string } | null } | null; error: unknown }

    if (profile) {
      const roleName = profile.roles?.name ?? ''
      const base = ROLE_HOME[roleName] ?? '/outlet'
      const dest = profile.outlet_id ? `${base}/${profile.outlet_id}` : base
      router.push(dest)
    } else {
      // Regular customer — go to home
      router.push('/')
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/assets/logo/logo.png"
              alt="Pseudo Café"
              width={56}
              height={56}
              className="invert mb-3"
            />
            <h1 className="text-2xl font-bold text-white">Sign in</h1>
            <p className="text-gray-400 text-sm mt-1">to your Pseudo Café account</p>
          </div>

          {/* Google OAuth button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold py-3 rounded-xl transition-all duration-200 mb-6"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.5-3-11.3-7.5l-6.5 5C9.7 39.6 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.9 2.4-2.5 4.5-4.6 5.9l6.2 5.2C41.3 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-500 text-xs font-medium">or sign in as staff</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email / password form — for staff with shared credentials */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-all duration-200"
            >
              {loading ? 'Signing in…' : 'Sign in with email'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Not a staff member?{' '}
            <Link href="/" className="text-yellow-400 hover:text-yellow-300 transition-colors">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
