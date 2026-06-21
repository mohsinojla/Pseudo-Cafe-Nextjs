'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import {
  Target, Globe, BookOpen, Heart, Flame, Leaf, Users, Award,
  ChefHat, Clock, MapPin, Sparkles,
} from 'lucide-react'

function PizzaBoxModel({ scrollY }: { scrollY: number }) {
  const { scene } = useGLTF('/assets/3d/pizza-boxx.glb')
  const ref = useRef<Group>(null)

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y = scrollY * 0.0025
    }
  })

  return <primitive ref={ref} object={scene} scale={1.5} />
}

const stats = [
  { value: '1972', label: 'Est.', icon: Clock },
  { value: '50+', label: 'Menu Items', icon: ChefHat },
  { value: '10K+', label: 'Happy Guests', icon: Users },
  { value: 'Lahore', label: 'Pakistan', icon: MapPin },
]

const values = [
  { icon: Flame, title: 'Crafted with Passion', body: 'Every dish is made with the same love and precision we put into code — nothing shipped until it meets the standard.' },
  { icon: Leaf, title: 'Fresh Ingredients', body: 'We source the freshest produce daily, because quality starts long before it reaches your plate.' },
  { icon: Users, title: 'Community First', body: 'A place where engineers, creatives, and families share a table. Great food is best served with great company.' },
  { icon: Award, title: 'Uncompromising Quality', body: 'From ambience to plating, we obsess over the details so every visit feels intentional and memorable.' },
]

export default function About() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black -z-10" />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=50')] bg-cover bg-center opacity-[0.07]" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            <Sparkles size={12} />
            Our Story
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
            Where Code Meets
            <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Cuisine
            </span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            At <span className="text-yellow-400 font-semibold">The Pseudo Engineers Café</span>, we believe
            food is more than sustenance — it&apos;s an <span className="italic text-orange-400">experience</span> engineered
            with the same precision and passion we bring to everything we build.
          </p>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <Icon size={18} className="text-yellow-400" />
              </div>
              <p className="text-3xl font-black text-white">{value}</p>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission & Vision ─────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          {[
            {
              icon: Target,
              title: 'Our Mission',
              body: 'To create food that brings people together. With the finest ingredients and a passion for quality, we craft moments of joy for every customer — one plate at a time.',
              accent: 'from-yellow-500/20 to-yellow-500/0',
              iconBg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
            },
            {
              icon: Globe,
              title: 'Our Vision',
              body: 'To be more than just a café — a hub where culture, creativity, and community blend seamlessly. We aim to expand, innovate, and inspire while staying rooted in quality and passion.',
              accent: 'from-orange-500/20 to-orange-500/0',
              iconBg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
            },
          ].map(({ icon: Icon, title, body, accent, iconBg }) => (
            <div
              key={title}
              className={`relative p-8 rounded-2xl border border-white/5 bg-gradient-to-br ${accent} bg-white/[0.03] hover:border-white/10 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}
            >
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 ${iconBg}`}>
                <Icon size={22} />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
              <p className="text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
              <BookOpen size={22} className="text-rose-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Our Story</h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-6" />
          </div>
          <p className="text-gray-400 leading-loose text-center text-base">
            Started by a group of passionate engineers with an unyielding love for food,{' '}
            <span className="font-semibold text-white">Pseudo Engineers Café</span> was born from the
            idea that every meal should be{' '}
            <span className="text-rose-400 font-medium">unique</span>,{' '}
            <span className="text-yellow-400 font-medium">bold</span>, and full of character.
            What began as late-night kitchen experiments among friends has grown into a
            full-fledged café experience — where every dish tells a story and every visit feels like coming home.
          </p>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
              <Heart size={12} />
              Why Choose Us
            </div>
            <h2 className="text-3xl font-bold text-white">What makes us different</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-yellow-500/20 hover:bg-yellow-500/[0.03] hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                  <Icon size={18} className="text-yellow-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3D Model (untouched) ─────────────────────────── */}
      <div className="w-full h-[70vh] md:h-[120vh] mt-12 md:mt-20">
        <div className="sticky top-0 h-[70vh] md:h-screen cursor-grab">
          <Canvas camera={{ position: [0, 2, 6], fov: 40 }}>
            <ambientLight intensity={1} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <PizzaBoxModel scrollY={scrollY} />
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
