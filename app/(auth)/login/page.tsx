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
  const router = useRouter()
  const supabase = createClient()

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

    // Fetch profile to determine redirect
    const { data: profile } = await supabase
      .from('users')
      .select('outlet_id, onboarding_status, roles(name)')
      .eq('id', data.user.id)
      .single() as { data: { outlet_id: string | null; onboarding_status: string | null; roles: { name: string } | null } | null; error: unknown }

    // Flip pending → active on first login
    if (profile?.onboarding_status === 'pending') {
      await supabase.from('users').update({ onboarding_status: 'active' } as any).eq('id', data.user.id)
    }

    if (profile) {
      const roleName = profile.roles?.name ?? ''
      const base = ROLE_HOME[roleName] ?? '/outlet'
      const dest = profile.outlet_id ? `${base}/${profile.outlet_id}` : base
      router.push(dest)
    } else {
      router.push('/outlet')
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/assets/logo/logo.png"
              alt="Pseudo Café"
              width={56}
              height={56}
              className="invert mb-3"
            />
            <h1 className="text-2xl font-bold text-white">Staff Login</h1>
            <p className="text-gray-400 text-sm mt-1">Sign in to your Pseudo Café account</p>
          </div>

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
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-all duration-200 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
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
