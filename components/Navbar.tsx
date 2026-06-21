'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/types/database'

const ROLE_HOME: Record<string, string> = {
  owner: '/outlet',
  manager: '/outlet',
  cashier: '/cashier',
  waiter: '/waiter',
  kitchen: '/kitchen',
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<(User & { roles?: { name: string } }) | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user)
      if (user) {
        supabase
          .from('users')
          .select('*, roles(name)')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShowDropdown(false)
    router.push('/')
    router.refresh()
  }

  const staffPortalHref = () => {
    if (!profile) return '/login'
    const roleName = (profile.roles as { name: string } | null)?.name ?? ''
    const base = ROLE_HOME[roleName] ?? '/outlet'
    return profile.outlet_id ? `${base}/${profile.outlet_id}` : base
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/best-deals', label: 'Best Deals' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  const avatarUrl = authUser?.user_metadata?.avatar_url as string | undefined

  return (
    <nav className="bg-black/70 backdrop-blur-md text-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/assets/logo/logo.png"
            alt="Pseudo Café"
            width={40}
            height={40}
            priority
            className="invert"
            style={{ objectFit: 'contain' }}
          />
          <span className="text-2xl font-bold">Pseudo Café</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6 font-medium items-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-yellow-400 transition-colors ${
                pathname === link.href
                  ? 'text-yellow-400 font-bold border-b-2 border-yellow-400'
                  : ''
              }`}
            >
              {link.label}
            </Link>
          ))}

          {authUser && profile && (
            <Link
              href={staffPortalHref()}
              className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors font-medium border border-yellow-400/40 px-3 py-1 rounded-lg"
            >
              <LayoutDashboard size={14} />
              Staff Portal
            </Link>
          )}

          {!authUser ? (
            <Link
              href="/login"
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg transition font-semibold"
            >
              Login
            </Link>
          ) : (
            <div className="relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full cursor-pointer ring-2 ring-yellow-500"
                  onClick={() => setShowDropdown(!showDropdown)}
                />
              ) : (
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-8 h-8 rounded-full bg-yellow-500 text-black font-bold flex items-center justify-center text-sm"
                >
                  {authUser.email?.[0].toUpperCase()}
                </button>
              )}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-black/90 border border-white/10 rounded-xl shadow-xl">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-xs text-gray-400 truncate">{authUser.email}</p>
                    {profile && (
                      <p className="text-xs text-yellow-400 capitalize mt-0.5">
                        {(profile.roles as { name: string } | null)?.name ?? ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/10 rounded-b-xl transition-colors text-gray-300 hover:text-red-400"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden focus:outline-none text-xl"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-md flex flex-col items-center py-4 space-y-4 border-t border-white/10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-yellow-400 transition-colors ${
                pathname === link.href ? 'text-yellow-400 font-bold' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {authUser && profile && (
            <Link
              href={staffPortalHref()}
              className="text-yellow-400 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Staff Portal
            </Link>
          )}

          {!authUser ? (
            <Link
              href="/login"
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg transition font-semibold"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
          ) : (
            <button
              onClick={handleSignOut}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
