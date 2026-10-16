'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import NotificationCenter from '@/components/NotificationCenter';
import { useRole } from './role-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function responseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  if (Array.isArray(body?.message)) return body.message.join(', ');
  return body?.message ?? `Request failed (${response.status})`;
}

export default function Header() {
  const { currentUser, currentRole, setSessionUser } = useRole();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [actionError, setActionError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setActionError('');
    try {
      const response = await fetch(`${API_URL}/loads/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await responseError(response));
      setSessionUser(null);
      setIsMenuOpen(false);
      window.location.reload();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not end the session',
      );
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setIsSavingPassword(true);
    try {
      const response = await fetch(`${API_URL}/loads/auth/password`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const updatedUser = (await response.json()) as NonNullable<typeof currentUser>;
      setSessionUser(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    } catch (cause) {
      setPasswordError(
        cause instanceof Error ? cause.message : 'Could not change password',
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const username = currentUser?.username ?? 'Signed out';

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <span className="font-extrabold text-lg tracking-tight text-white">FreightOS</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono uppercase tracking-wider font-semibold">
          TMS Dashboard
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <NotificationCenter />

        <div className="relative pl-3 border-l border-gray-800" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="flex items-center space-x-3 focus:outline-none group rounded-lg p-1 hover:bg-gray-800/60 transition"
          >
            <span className="w-8 h-8 rounded-full bg-blue-600 border border-blue-400/40 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-blue-600/20">
              {currentUser ? username.charAt(0).toUpperCase() : '?'}
            </span>
            <span className="hidden sm:block text-left">
              <span className="block text-xs font-semibold text-gray-200 group-hover:text-white transition">
                {username}
              </span>
              <span className="block text-[10px] text-blue-400 font-mono uppercase font-semibold">
                {currentRole || 'No active session'}
              </span>
            </span>
            <span className="text-xs text-gray-400 group-hover:text-white transition">▾</span>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl py-2 z-50 text-xs text-gray-200 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-4 py-3 border-b border-gray-800 space-y-1">
                <p className="font-bold text-sm text-white">{username}</p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Active role:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold uppercase border border-blue-500/30">
                    {currentRole || 'None'}
                  </span>
                </div>
              </div>

              {currentUser ? (
                <>
                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setPasswordError('');
                        setIsPasswordModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-800/80 text-gray-300 hover:text-white flex items-center space-x-2 transition"
                    >
                      <span aria-hidden="true">🔑</span>
                      <span>Change Password</span>
                    </button>

                    {(currentRole === 'admin' || currentRole === 'owner') && (
                      <Link
                        href="/users"
                        role="menuitem"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-800/80 text-blue-400 hover:text-blue-300 flex items-center space-x-2 transition font-semibold"
                      >
                        <span aria-hidden="true">⚙️</span>
                        <span>User Management</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      className="w-full text-left px-4 py-2 hover:bg-gray-800/80 text-gray-300 hover:text-white flex items-center space-x-2 transition"
                    >
                      <span aria-hidden="true">🔄</span>
                      <span>Switch User</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-gray-800">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 flex items-center space-x-2 transition font-semibold"
                    >
                      <span aria-hidden="true">🚪</span>
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="px-4 py-3 text-gray-400">
                  Sign in from the dashboard to access account actions.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="fixed right-4 top-20 z-[60] max-w-sm rounded-xl border border-rose-800/60 bg-gray-900 p-3 text-sm text-rose-300 shadow-xl"
        >
          {actionError}
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl text-white"
          >
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h2 id="change-password-title" className="font-bold text-base">
                Change Password
              </h2>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(event) => void handleChangePassword(event)} className="space-y-4">
              <label className="block text-xs text-gray-400">
                Current password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-1 w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </label>
              <label className="block text-xs text-gray-400">
                New password (at least 16 characters)
                <input
                  type="password"
                  required
                  minLength={16}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1 w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </label>
              <label className="block text-xs text-gray-400">
                Confirm new password
                <input
                  type="password"
                  required
                  minLength={16}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1 w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </label>

              {passwordError && (
                <p role="alert" className="text-sm text-rose-300">
                  {passwordError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-xl text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white disabled:opacity-50"
                >
                  {isSavingPassword ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
