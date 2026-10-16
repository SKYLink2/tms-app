'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '../../app/components/role-context';

const navigation = [
  {
    href: '/',
    label: 'Dashboard / Loads',
    icon: '🚛',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher', 'fleet_manager'],
  },
  {
    href: '/schedule',
    label: 'Weekly Schedule Board',
    icon: '📅',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher', 'fleet_manager'],
  },
  {
    href: '/drivers',
    label: 'Drivers',
    icon: '👤',
    roles: ['admin', 'owner', 'dispatch_manager', 'dispatcher', 'fleet_manager', 'safety'],
  },
  {
    href: '/equipment',
    label: 'Equipment & Fleet',
    icon: '📦',
    roles: ['admin', 'owner', 'dispatch_manager', 'fleet_manager'],
  },
  {
    href: '/accounting',
    label: 'Accounting & Fuel',
    icon: '💵',
    roles: ['admin', 'owner'],
  },
  {
    href: '/compliance',
    label: 'HR & Compliance',
    icon: '🛡️',
    roles: ['admin', 'owner', 'safety'],
  },
  {
    href: '/users',
    label: 'User Management',
    icon: '👥',
    roles: ['admin', 'owner'],
  },
  {
    href: '/driver',
    label: 'Driver Portal',
    icon: '📱',
    roles: [
      'admin',
      'owner',
      'dispatch_manager',
      'dispatcher',
      'driver',
      'fleet_manager',
      'safety',
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentRole } = useRole();
  const visibleNavigation = navigation.filter(
    (item) => Boolean(currentRole) && item.roles.includes(currentRole),
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-gray-800 bg-gray-950 p-4 text-white md:flex md:min-h-screen">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-3 border-b border-gray-800 px-2 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold">
              F
            </span>
            <span>
              <span className="block text-base font-extrabold tracking-wide leading-none">
                FreightOS
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                TMS Dashboard
              </span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="space-y-1.5">
            {visibleNavigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {currentRole && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-400">
            <div className="font-semibold text-gray-300">Access level</div>
            <div className="mt-0.5 font-mono text-[11px] uppercase text-blue-400">
              {currentRole}
            </div>
          </div>
        )}
      </aside>

      {visibleNavigation.length > 0 && (
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-gray-800 bg-gray-950/95 p-2 backdrop-blur md:hidden"
        >
          {visibleNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-0 flex-1 rounded-lg px-2 py-3 text-center text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.href === '/driver' ? 'Portal' : item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
