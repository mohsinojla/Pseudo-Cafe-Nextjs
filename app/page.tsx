import Link from 'next/link'

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center text-center py-24 px-4 min-h-[80vh]">
      <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-rose-500 text-transparent bg-clip-text">
        Pseudo Café
      </h1>
      <p className="text-lg md:text-xl max-w-2xl mb-10 text-gray-300">
        Fresh ingredients, bold flavors, and the warmth of home — every single time.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/menu"
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-xl transition-all duration-200 text-lg"
        >
          View Menu
        </Link>
        <Link
          href="/about"
          className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-xl border border-white/20 transition-all duration-200 text-lg"
        >
          Our Story
        </Link>
      </div>
    </section>
  )
}
