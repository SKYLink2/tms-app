'use client';

import NotificationCenter from '@/components/NotificationCenter';

interface HeaderProps {
  userRole?: string;
  userName?: string;
}

export default function Header({ userRole = 'admin', userName = 'owner' }: HeaderProps) {
  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Brand & Role */}
      <div className="flex items-center space-x-3">
        <span className="font-extrabold text-lg tracking-tight text-white">FreightOS</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono uppercase">
          {userRole}
        </span>
      </div>

      {/* Right: Notification Center & User Profile */}
      <div className="flex items-center space-x-4">
        <NotificationCenter />

        <div className="flex items-center space-x-2 pl-3 border-l border-gray-800">
          <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-400/40 flex items-center justify-center font-bold text-xs text-white">
            {userName.charAt(0)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-gray-200">{userName}</div>
            <div className="text-[10px] text-gray-400 capitalize">{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}