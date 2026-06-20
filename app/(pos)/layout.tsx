import type { ReactNode } from 'react'

// POS layout: full-screen, no Navbar, no footer — optimized for tablets
export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  )
}
