'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from './role-context';

const navigation = [
  {
    href: '/',
    label: 'Loads',
    icon: '🚛',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher'],
  },
  {
    href: '/schedule',
    label: 'Schedule',
    icon: '📅',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher'],
  },
  {
    href: '/drivers',
    label: 'Drivers',
    icon: '👤',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher'],
  },
  {
    href: '/equipment',
    label: 'Equipment',
    icon: '📦',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher'],
  },
  {
    href: '/accounting',
    label: 'Accounting',
    icon: '💵',
    roles: ['admin', 'owner'],
  },
  {
    href: '/compliance',
    label: 'Compliance',
    icon: '🛡️',
    roles: ['admin', 'owner'],
  },
  {
    href: '/driver',
    label: 'Driver Portal',
    icon: '📱',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher', 'driver'],
  },
  {
    href: '/users',
    label: 'User Management',
    icon: '👥',
    roles: ['admin', 'owner'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentRole } = useRole();

  // Filter items based on current active role
  const visibleNavigation = navigation.filter(
    (item) => !currentRole || item.roles.includes(currentRole),
  );

  return (
    <aside className="w-full shrink-0 border-b border-gray-800 bg-gray-900 p-3 md:w-64 md:border-b-0 md:border-r md:p-5 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href="/" className="mb-3 flex items-center gap-3 px-2 md:mb-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-lg font-black text-white shadow-lg shadow-blue-500/20">
            F
          </span>
          <span className="min-w-0">
            <span className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white">FreightOS</span>
              <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-300 ring-1 ring-inset ring-blue-400/20">
                TMS
              </span>
            </span>
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Fleet operations
            </span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto md:flex-col md:space-y-1.5">
          {visibleNavigation.map(({ href, label, icon }) => {
            const isActive = href === '/'
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`shrink-0 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-base">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Role Indicator Footer */}
      {currentRole && (
        <div className="hidden md:block mt-6 rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-400">
          <div className="font-semibold text-gray-300">Access level</div>
          <div className="mt-0.5 font-mono text-[11px] uppercase text-blue-400">
            {currentRole}
          </div>
        </div>
      )}
    </aside>
  );
}