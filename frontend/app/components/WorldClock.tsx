'use client';

import { useEffect, useState } from 'react';

interface ZoneConfig {
  label: string;
  timeZone: string;
  badge: string;
}

const ZONES: ZoneConfig[] = [
  { label: 'EST', timeZone: 'America/New_York', badge: 'US East' },
  { label: 'CST', timeZone: 'America/Chicago', badge: 'US Central' },
  { label: 'PST', timeZone: 'America/Los_Angeles', badge: 'US West' },
  { label: 'Tashkent', timeZone: 'Asia/Tashkent', badge: 'UZT' },
];

export default function WorldClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  if (!now) {
    // Skeleton placeholder to prevent SSR hydration jumps
    return (
      <div className="hidden lg:flex items-center space-x-2">
        {ZONES.map((z) => (
          <div key={z.label} className="h-9 w-28 bg-gray-800/60 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center space-x-2">
      {ZONES.map(({ label, timeZone, badge }) => {
        // Format live time (e.g., "09:37 AM")
        const timeStr = new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now);

        // Format short date (e.g., "Fri, Oct 16")
        const dateStr = new Intl.DateTimeFormat('en-US', {
          timeZone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(now);

        return (
          <div
            key={label}
            className="flex items-center space-x-2 rounded-xl bg-gray-950/80 border border-gray-800/80 px-2.5 py-1 text-xs shadow-inner"
          >
            <div className="flex flex-col text-left">
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-gray-300 text-[11px]">{label}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono">
                  {badge}
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="font-mono font-bold text-white text-[11px] tracking-tight">
                  {timeStr}
                </span>
                <span className="text-[9px] text-gray-500 font-medium">{dateStr}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}