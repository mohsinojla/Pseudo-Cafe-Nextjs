// app/menu/page.js
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function MenuPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const getProducts = async () => {
      const res = await fetch("/api/menu");
      const data = await res.json();
      setProducts(data);
    };
    getProducts();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product._id} className="bg-white rounded-2xl shadow-lg p-4 text-center">
          <Image
            src="/assets/menu/product.png"
            alt={product.name}
            width={200}
            height={200}
            className="mx-auto"
          />
          <h2 className="text-xl font-bold mt-4">{product.name}</h2>
          <p className="text-gray-600">${product.price}</p>
        </div>
      ))}
    </div>
  );
}
