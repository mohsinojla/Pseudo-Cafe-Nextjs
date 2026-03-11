"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import { Suspense } from "react";


function PizzaBoxModel() {
  const { scene } = useGLTF("/assets/3d/pizza-boxx.glb");
  return <primitive object={scene} scale={1} />; // smaller scale
}

export default function About() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-20 bg-black text-white">
      {/* Full Page Glossy Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/80 to-black/90 backdrop-blur-xl rounded-none shadow-2xl -z-10" />

      <section className="w-full max-w-6xl">
        {/* Heading */}
        <h1 className="text-5xl font-extrabold mb-10 text-center 
          bg-gradient-to-r from-yellow-400 via-orange-500 to-rose-600 
          text-transparent bg-clip-text drop-shadow-xl tracking-wide">
          About Us
        </h1>

        <p className="text-lg mb-20 text-center max-w-3xl mx-auto leading-relaxed text-gray-200">
          At <span className="font-semibold text-yellow-400">The Pseudo Engineers Cafe</span>,
          we believe pizza is more than food — it’s an <span className="italic text-orange-400">experience</span>.
          Our mission is to serve authentic flavors with a modern twist, making
          every bite unforgettable.
        </p>

        {/* Mission + Vision */}
        <div className="grid md:grid-cols-2 gap-12">
          <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg shadow-lg hover:shadow-yellow-500/30 hover:scale-[1.02] transition-all duration-300">
            <h2 className="text-2xl font-semibold mb-4 text-yellow-400">🍕 Our Mission</h2>
            <p className="leading-relaxed text-gray-200">
              To create pizzas that bring people together. With the finest
              ingredients, hand-tossed dough, and secret sauces, we aim to
              craft <span className="text-orange-400 font-medium">moments of joy</span>
              and connection for every customer.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-lg shadow-lg hover:shadow-yellow-500/30 hover:scale-[1.02] transition-all duration-300">
            <h2 className="text-2xl font-semibold mb-4 text-yellow-400">🌍 Our Vision</h2>
            <p className="leading-relaxed text-gray-200">
              To be more than just a cafe — a hub where culture, creativity,
              and community blend. Our goal is to expand, innovate, and inspire,
              while staying true to our roots of quality and passion.
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="mt-20 p-10 rounded-2xl bg-white/10 backdrop-blur-lg shadow-lg hover:shadow-yellow-500/30 hover:scale-[1.01] transition-all duration-300">
          <h2 className="text-2xl font-semibold mb-6 text-center text-yellow-400">📖 Our Story</h2>
          <p className="leading-relaxed text-center max-w-4xl mx-auto text-gray-200">
            Started by a group of passionate engineers with a love for food,
            <span className="font-semibold text-orange-400"> Pseudo Engineers Cafe</span> was born
            out of the idea that every pizza should be <span className="text-rose-400 font-medium">unique</span>,
            <span className="text-yellow-400 font-medium"> bold</span>, and full of character.
            From late-night brainstorming sessions to experimenting with flavors,
            our journey has always been fueled by creativity and friendship.
          </p>
        </div>

        {/* Closing Note */}
        <div className="mt-20 text-center p-10 rounded-2xl bg-white/10 backdrop-blur-lg shadow-lg hover:shadow-yellow-500/30 hover:scale-[1.01] transition-all duration-300">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-400">❤️ Why Choose Us?</h2>
          <p className="leading-relaxed max-w-3xl mx-auto text-gray-200">
            Because we don’t just make pizzas — we make <span className="font-semibold text-orange-400">experiences</span>.
            From our cozy ambience to our freshly baked pizzas, everything is designed
            to make you feel <span className="italic text-rose-400">at home</span>.
          </p>
        </div>


        {/* 3D Pizza Box Section */}
        <div className="w-full h-screen">
          <Canvas camera={{ position: [0, 2, 6], fov: 40 }}>
            <ambientLight intensity={1} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <PizzaBoxModel />
            <OrbitControls enableZoom={false} enablePan={false} minDistance={2} maxDistance={10} />
            {/* <OrbitControls enableZoom={false} enablePan={false} /> */}
          </Canvas>
        </div>
      </section>
    </div>
  );
}
