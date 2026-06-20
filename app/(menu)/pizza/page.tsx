'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Product {
  _id: string
  name: string
  price: number
}

export default function PizzaPage() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(console.error)
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product._id} className="bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg p-4 text-center hover:shadow-yellow-500/20 transition">
          <Image
            src="/assets/menu/product.png"
            alt={product.name}
            width={200}
            height={200}
            className="mx-auto"
          />
          <h2 className="text-xl font-bold mt-4 text-white">{product.name}</h2>
          <p className="text-yellow-400 font-semibold mt-1">PKR {product.price.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
