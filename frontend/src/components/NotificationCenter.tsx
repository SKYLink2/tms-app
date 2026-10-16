'use client';

import { useState, useEffect, useRef } from 'react';
import { useRole } from '../../app/components/role-context';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  targetRole?: string | null;
  isRead: boolean;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function NotificationCenter() {
  const { currentRole } = useRole();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(
    () =>
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted',
  );
  const hasLoadedNotifications = useRef(false);
  const seenNotificationIds = useRef(new Set<string>());

  // Request Web Push Notification Permissions
  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await window.Notification.requestPermission();
      if (perm === 'granted') {
        setHasPermission(true);
      }
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_URL}/notifications`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch notifications (${response.status})`);
        }
        const data = (await response.json()) as SystemNotification[];
        const role = currentRole.toUpperCase();
        const dispatcherRoles = ['ADMIN', 'OWNER', 'DISPATCH_MANAGER', 'DISPATCHER'];
        const visibleNotifications = (Array.isArray(data) ? data : []).filter(
          (notification) => {
            const targetRole = notification.targetRole?.toUpperCase();
            return (
              !targetRole ||
              targetRole === 'ALL' ||
              targetRole === role ||
              (targetRole === 'DISPATCHER' && dispatcherRoles.includes(role))
            );
          },
        );

        if (hasLoadedNotifications.current) {
          const unseen = visibleNotifications.filter(
            (notification) => !seenNotificationIds.current.has(notification.id),
          );
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            window.Notification.permission === 'granted'
          ) {
            unseen
              .filter((notification) => !notification.isRead)
              .forEach((notification) => {
                new window.Notification(notification.title, {
                  body: notification.message,
                  icon: '/favicon.ico',
                });
              });
          }
        }

        visibleNotifications.forEach((notification) => {
          seenNotificationIds.current.add(notification.id);
        });
        hasLoadedNotifications.current = true;
        setNotifications(visibleNotifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    const initialFetch = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    const interval = setInterval(fetchNotifications, 10000);
    return () => {
      window.clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [currentRole]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to mark notifications read (${response.status})`);
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (unreadCount > 0) markAllRead();
        }}
        className="relative p-2.5 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl transition text-gray-300 hover:text-white"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-Out Event Center Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-gray-900 border-l border-gray-800 w-full max-w-sm h-full p-6 space-y-5 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200 text-white">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-extrabold">System Event Center</h2>
                <p className="text-[10px] text-gray-400">Live operational activity stream</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            {/* Push Permission Prompt */}
            {!hasPermission && (
              <div className="bg-blue-950/40 border border-blue-800/50 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="text-gray-300">Enable desktop alerts for live updates?</span>
                <button
                  onClick={requestPushPermission}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-[10px]"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Notification Stream */}
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-500">
                  No activity events recorded yet.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 transition ${
                      notif.isRead
                        ? 'bg-gray-950/60 border-gray-800/80 text-gray-300'
                        : 'bg-blue-950/30 border-blue-500/40 text-white shadow-inner'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-400 text-[11px]">{notif.title}</span>
                      <span className="text-[9px] text-gray-500">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}