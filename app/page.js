export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center text-center py-16 px-4">
      <h1 className="text-5xl md:text-6xl font-bold mb-6">Welcome to Pizza Palace</h1>
      <p className="text-lg max-w-2xl mb-8">
        Fresh ingredients, cheesy perfection, and unbeatable flavors. Order now and taste the magic!
      </p>
      <a
        href="/menu"
        className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition-all"
      >
        View Menu
      </a>
    </section>
  );
}
