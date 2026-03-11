"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const pizzas = {
  mushroom: "/assets/pizzas/mushroom.png",
  pepperoni: "/assets/pizzas/pepperoni.png",
  veggie: "/assets/pizzas/veggie.png",
  corn: "/assets/pizzas/corn.png",
};

export default function Home() {
  const [angle, setAngle] = useState(0);
  const [topPizza, setTopPizza] = useState("veggie");
  const [bottomPizza, setBottomPizza] = useState("corn");
  const [nextTarget, setNextTarget] = useState("bottom");
  const [size, setSize] = useState("M"); // size selection
  const [selectedPizza, setSelectedPizza] = useState("veggie"); // track selected flavor

  const sizeMap = { S: 0.8, M: 0.9, L: 1 };

  const handleSwitch = (selected) => {
    setSelectedPizza(selected);
    if (nextTarget === "bottom") {
      setBottomPizza(selected);
      setNextTarget("top");
    } else {
      setTopPizza(selected);
      setNextTarget("bottom");
    }
    setAngle((prev) => prev + 180);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* Controls pinned at top */}
      <div className="absolute top-24 flex flex-col items-center gap-4 z-10">
        {/* Size buttons */}
        <div className="flex gap-4">
          {["S", "M", "L"].map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold transition ${size === s
                  ? "bg-black text-white border-yellow-400"
                  : "bg-white text-black border-gray-400 hover:border-yellow-400"
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Flavor buttons */}
        <div className="flex gap-4 flex-wrap justify-center">
          {Object.keys(pizzas).map((pizza) => (
            <button
              key={pizza}
              onClick={() => handleSwitch(pizza)}
              className={`px-4 py-2 rounded-lg font-bold shadow-md transition capitalize
        ${selectedPizza === pizza
                  ? "bg-yellow-500 text-black hover:bg-yellow-400"
                  : "bg-black/70 text-yellow-400 border border-yellow-400 hover:shadow-yellow-500/40"
                }`}
            >
              {pizza} Pizza
            </button>
          ))}
        </div>
      </div>

      {/* Pizza Container */}
      <div
        className="absolute overflow-hidden rounded-full transition-transform duration-700"
        style={{
          left: "50%",
          bottom: "0",
          transform: `translateX(-50%) rotate(${angle}deg) scale(${sizeMap[size]})`,
          height: "1000px",
          width: "1000px",
          top: "250px",
        }}
      >
        {/* Top half */}
        <div className="absolute inset-0 overflow-hidden clip-top">
          <Image
            src={pizzas[topPizza]}
            alt={topPizza}
            fill
            className="object-contain"
          />
        </div>

        {/* Bottom half */}
        <div className="absolute inset-0 overflow-hidden clip-bottom">
          <Image
            src={pizzas[bottomPizza]}
            alt={bottomPizza}
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Inline styles for clipping */}
      <style jsx>{`
        .clip-top {
          clip-path: inset(0 0 50% 0);
        }
        .clip-bottom {
          clip-path: inset(50% 0 0 0);
        }
      `}</style>
    </div>
  );
}
