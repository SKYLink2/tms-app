'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-base font-black text-white shadow-lg shadow-blue-500/20">
            F
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-white">Focus</span>
            <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-300 ring-1 ring-inset ring-blue-400/20">
              TMS
            </span>
          </span>
        </span>
        <div className="flex gap-2">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              pathname === '/'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Loads
          </Link>
          <Link
            href="/drivers"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              pathname === '/drivers'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Drivers & Equipment
          </Link>
        </div>
      </div>
    </nav>
  );
}