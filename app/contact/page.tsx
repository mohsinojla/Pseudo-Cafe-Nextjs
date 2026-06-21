'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogIn } from 'lucide-react'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        setEmail(user.email ?? '')
        setName((user.user_metadata?.full_name as string | undefined) ?? '')
      }
      setAuthChecked(true)
    })
  }, [])

  return (
    <section className="px-6 py-16 max-w-6xl mx-auto text-gray-200">
      <h1 className="text-5xl font-bold mb-6 text-yellow-400">Contact Us</h1>
      <p className="text-lg text-gray-300 mb-12">
        Have questions, feedback, or just want to say hi? Drop us a message or visit us —
        we&apos;d love to connect with you.
      </p>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Left: address + map */}
        <div>
          <h2 className="text-3xl font-semibold mb-4">📍 Get in Touch</h2>
          <p className="mb-2">📍 <span className="text-gray-300">The Pseudo Engineers Café by 1972, Lahore, Pakistan</span></p>
          <p className="mb-2">📞 <span className="text-gray-300">+92 334 4320XXX</span></p>
          <p className="mb-6">✉️ <span className="text-gray-300">mohsinaujla@pseudocafe.com</span></p>

          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3681.5766124327424!2d88.37753427475991!3d22.669569129410345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f89dce3e63c7f5%3A0xeba33f69e6e7c6bf!2sThe%20Pseudo%20Engineers%20Cafe%20by%201972%20Food%20Park!5e0!3m2!1sen!2s!4v1755371793791!5m2!1sen!2s"
            width="100%"
            height="280"
            allowFullScreen
            loading="lazy"
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* Right: form or login gate */}
        <div>
          <h2 className="text-3xl font-bold mb-4">✉️ Send us a Message</h2>

          {!authChecked ? (
            /* Loading skeleton */
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/5" />
              ))}
              <div className="h-10 w-36 rounded-lg bg-white/5" />
            </div>
          ) : !isLoggedIn ? (
            /* Login gate */
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <LogIn size={24} className="text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sign in to send a message</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">
                We verify your identity before accepting messages to keep things genuine and spam-free.
              </p>
              <Link
                href="/login"
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all duration-200"
              >
                <LogIn size={16} />
                Sign in
              </Link>
            </div>
          ) : (
            /* Actual form — only shown when logged in */
            <form action="https://formspree.io/f/mblkelke" method="POST" className="space-y-5">
              <div>
                <label className="block mb-1">Your Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-black/10 backdrop-blur-md text-white placeholder-gray-300 shadow-lg focus:outline-none ring-1 ring-yellow-400 focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block mb-1">
                  Your Email
                  <span className="ml-2 text-xs text-gray-400 font-normal">(cannot be changed)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  readOnly
                  className="w-full px-4 py-2 rounded-lg bg-white/5 backdrop-blur-md text-gray-400 shadow-lg ring-1 ring-white/10 cursor-not-allowed select-none"
                />
              </div>
              <div>
                <label className="block mb-1">Message</label>
                <textarea
                  name="message"
                  required
                  placeholder="Write your message..."
                  rows={5}
                  className="w-full px-4 py-2 rounded-lg bg-black/10 backdrop-blur-md text-white placeholder-gray-300 shadow-lg focus:outline-none ring-1 ring-yellow-400 focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <button
                type="submit"
                className="bg-yellow-400 text-black font-bold px-6 py-2 rounded-lg shadow-lg hover:bg-yellow-300 transition"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
