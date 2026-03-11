"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  if (status === "loading") return null; // avoid mismatch


  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="bg-black/70 text-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/assets/logo/logo.png"
            alt="Pizza Palace Logo"
            width={40}
            height={40}
            priority
            className="invert"
            style={{ objectFit: "contain" }}
          />

          <span className="text-2xl font-bold">Cafe</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6 font-medium items-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-yellow-400 transition-colors ${pathname === link.href
                ? "text-yellow-400 font-bold border-b-2 border-yellow-400"
                : ""
                }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Auth buttons */}
          {!session ? (
            <button
              onClick={() => signIn("google")}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg transition"
            >
              Login
            </button>
          ) : (
            <div className="relative">
              <Image
                src={session.user.image}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              />
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white text-black rounded-lg shadow-lg">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-200 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Button */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-black/80 flex flex-col items-center py-4 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-yellow-400 ${pathname === link.href ? "text-yellow-400 font-bold" : ""
                }`}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {/* Auth buttons */}
          {!session ? (
            <Link
              href="/login"
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg transition"
            >
              Login
            </Link>
          ) : (
            <div className="relative">
              <Image
                src={session.user?.image || "/assets/default-avatar.png"}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              />
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white text-black rounded-lg shadow-lg">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-200 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}


        </div>
      )}
    </nav>
  );
}
