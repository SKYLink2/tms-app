'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Load, LoadsResponse } from '@/types/load';

interface DriverPortalUser {
  id: string;
  username: string;
  role: string;
  driverId: number | null;
}

type DriverMilestoneStatus = 'DISPATCHED' | 'AT_PICKUP' | 'IN_TRANSIT' | 'AT_DELIVERY';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function loadNumber(load: Load): string {
  return load.companyLoadNumber ?? load.draftLoadNumber ?? load.id;
}

function responseError(body: { message?: string | string[] }, fallback: string) {
  return Array.isArray(body.message)
    ? body.message.join(', ')
    : body.message ?? fallback;
}

function nextMilestone(status: string): {
  status: DriverMilestoneStatus;
  label: string;
} | null {
  switch (status) {
    case 'ASSIGNED':
      return { status: 'DISPATCHED', label: 'En Route to Pickup' };
    case 'DISPATCHED':
      return { status: 'AT_PICKUP', label: 'Arrived at Pickup' };
    case 'AT_PICKUP':
    case 'LOADED':
      return { status: 'IN_TRANSIT', label: 'Loaded & Rolling' };
    case 'IN_TRANSIT':
      return { status: 'AT_DELIVERY', label: 'Arrived at Delivery' };
    default:
      return null;
  }
}

export default function DriverMobilePortal() {
  const [user, setUser] = useState<DriverPortalUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'loads' | 'settlements'>('loads');
  const [loads, setLoads] = useState<Load[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [updatingLoadId, setUpdatingLoadId] = useState<string | null>(null);

  const fetchDriverLoads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        stage: 'operational',
        limit: '100',
      });
      let response = await fetch(`${API_URL}/loads?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Your session expired. Sign in again to view your loads.'
            : 'Could not load assigned trips.',
        );
      }

      let result: LoadsResponse = await response.json();
      const assignedLoads = [...result.data];
      for (let page = 2; page <= result.lastPage; page += 1) {
        params.set('page', String(page));
        response = await fetch(`${API_URL}/loads?${params}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Could not load all assigned trips.');
        result = await response.json();
        assignedLoads.push(...result.data);
      }
      setLoads(assignedLoads);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load assigned trips.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch(`${API_URL}/loads/auth/session`, { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Could not verify your login session.');
        return (await response.json()) as DriverPortalUser;
      })
      .then((sessionUser) => {
        if (!active) return;
        setUser(sessionUser);
        if (sessionUser?.role === 'driver' && sessionUser.driverId != null) {
          void fetchDriverLoads();
        }
      })
      .catch((sessionError: unknown) => {
        if (active) {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : 'Could not verify your login session.',
          );
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [fetchDriverLoads]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/loads/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(responseError(body, 'Sign-in failed.'));
      }
      const signedInUser = body as DriverPortalUser;
      setUser(signedInUser);
      setPassword('');
      if (signedInUser.role === 'driver' && signedInUser.driverId != null) {
        await fetchDriverLoads();
      }
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error ? loginError.message : 'Sign-in failed.',
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/loads/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not sign out.');
      setUser(null);
      setLoads([]);
      setSelectedLoad(null);
      setError(null);
    } catch (logoutError: unknown) {
      setError(
        logoutError instanceof Error ? logoutError.message : 'Could not sign out.',
      );
    }
  };

  const handlePodUpload = async () => {
    if (!selectedLoad || !podFile) return;
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.append('file', podFile);
    try {
      const response = await fetch(
        `${API_URL}/loads/${selectedLoad.id}/files/pod`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(responseError(body, 'POD upload failed.'));
      }
      setSuccess(
        `POD uploaded for Load #${loadNumber(selectedLoad)}. Dispatch has been notified.`,
      );
      setSelectedLoad(null);
      setPodFile(null);
      await fetchDriverLoads();
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'POD upload failed.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateMilestone = async (
    loadId: string,
    status: DriverMilestoneStatus,
  ) => {
    setUpdatingLoadId(loadId);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/loads/${loadId}/milestone`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(responseError(body, 'Could not update load progress.'));
      }
      await fetchDriverLoads();
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update load progress.',
      );
    } finally {
      setUpdatingLoadId(null);
    }
  };

  const completedLoads = loads.filter((load) =>
    ['DELIVERED', 'INVOICED', 'COMPLETED'].includes(load.status),
  );
  const activeLoads = loads.filter(
    (load) => !['DELIVERED', 'INVOICED', 'COMPLETED'].includes(load.status),
  );
  const totalDeliveredRevenue = completedLoads.reduce(
    (total, load) => total + (Number(load.rate) || 0),
    0,
  );
  const displayName = loads[0]?.driver
    ? `${loads[0].driver.firstName} ${loads[0].driver.lastName}`.trim()
    : user?.username ?? 'Driver';

  if (checkingSession) {
    return (
      <main className="mx-auto min-h-screen max-w-xl p-5 pb-24 text-sm text-gray-400">
        Checking driver session...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10 pb-24">
        <section className="w-full space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Driver portal
            </span>
            <h1 className="mt-1 text-xl font-extrabold text-white">
              Sign in to view your loads
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Use the driver account assigned to your driver profile.
            </p>
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </p>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-sm text-gray-300">
              Username
              <input
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white"
              />
            </label>
            <label className="block text-sm text-gray-300">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white"
              />
            </label>
            <button
              disabled={loggingIn}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (user.role !== 'driver' || user.driverId == null) {
    return (
      <main className="mx-auto min-h-screen max-w-xl p-5 pb-24">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h1 className="text-xl font-bold text-white">
            {user.role !== 'driver' ? 'Driver account required' : 'Driver profile not linked'}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {user.role !== 'driver'
              ? 'Sign in with a driver account to view assigned loads.'
              : 'Ask your fleet administrator to link this login to your driver profile.'}
          </p>
          <button
            onClick={() => void handleLogout()}
            className="mt-5 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            Sign out
          </button>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-5 pb-24 font-sans text-white sm:px-6">
      <div className="mb-6 space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Driver Portal
            </span>
            <h1 className="text-lg font-extrabold text-white">{displayName}</h1>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Sign out
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-950 p-1.5">
          <button
            onClick={() => setActiveTab('loads')}
            className={`rounded-lg py-2.5 text-xs font-semibold transition ${
              activeTab === 'loads'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Assigned Loads ({activeLoads.length})
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`rounded-lg py-2.5 text-xs font-semibold transition ${
              activeTab === 'settlements'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pay (${totalDeliveredRevenue.toFixed(0)})
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          {success}
        </p>
      )}

      {activeTab === 'loads' && (
        <section className="space-y-4" aria-live="polite">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Loading assigned routes...
            </div>
          ) : activeLoads.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-xs text-gray-400">
              No active loads are currently assigned to this driver.
            </div>
          ) : (
            activeLoads.map((load) => {
              const milestone = nextMilestone(load.status);
              return (
                <article
                  key={load.id}
                  className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-xl"
                >
                <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {loadNumber(load)}
                  </span>
                  <span className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-[10px] font-semibold uppercase text-gray-200">
                    {load.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="space-y-1 rounded-xl border border-gray-800/80 bg-gray-950 p-3">
                    <div className="text-[10px] font-bold uppercase text-emerald-400">
                      Pickup
                    </div>
                    <div className="font-semibold text-gray-200">{load.origin || 'TBD'}</div>
                    <div className="text-[10px] text-gray-400">
                      {load.pickupDate || 'Date unavailable'}
                      {load.pickupTime ? ` at ${load.pickupTime}` : ''}
                    </div>
                    {load.origin && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(load.origin)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block pt-1 font-semibold text-emerald-300"
                      >
                        Navigate to pickup
                      </a>
                    )}
                  </div>
                  <div className="space-y-1 rounded-xl border border-gray-800/80 bg-gray-950 p-3">
                    <div className="text-[10px] font-bold uppercase text-rose-400">
                      Delivery
                    </div>
                    <div className="font-semibold text-gray-200">{load.destination || 'TBD'}</div>
                    <div className="text-[10px] text-gray-400">
                      {load.deliveryDate || 'Date unavailable'}
                      {load.deliveryTime ? ` at ${load.deliveryTime}` : ''}
                    </div>
                    {load.destination && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(load.destination)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block pt-1 font-semibold text-rose-300"
                      >
                        Navigate to delivery
                      </a>
                    )}
                  </div>
                </div>
                {milestone && (
                  <button
                    disabled={updatingLoadId === load.id}
                    onClick={() => void handleUpdateMilestone(load.id, milestone.status)}
                    className="w-full rounded-xl border border-indigo-500/30 bg-indigo-600/15 py-3 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600/25 disabled:cursor-wait disabled:opacity-50"
                  >
                    {updatingLoadId === load.id
                      ? 'Updating progress...'
                      : `🚚 ${milestone.label}`}
                  </button>
                )}
                <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 p-3 text-xs">
                  <span className="text-gray-400">
                    Load rate:{' '}
                    <strong className="font-bold text-emerald-400">
                      ${Number(load.rate || 0).toFixed(2)}
                    </strong>
                  </span>
                  {load.truckUnitNumber && (
                    <span className="text-gray-400">
                      Truck: <strong className="text-gray-200">{load.truckUnitNumber}</strong>
                    </span>
                  )}
                </div>
                {load.podUrl && (
                  <a
                    href={`${API_URL}${load.podUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-gray-700 px-3 py-2.5 text-center text-xs font-semibold text-blue-300 hover:bg-gray-800"
                  >
                    View uploaded POD
                  </a>
                )}
                <button
                  onClick={() => {
                    setSelectedLoad(load);
                    setPodFile(null);
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-blue-500/30 bg-blue-600/15 py-2.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-600/25"
                >
                  {load.podUrl ? 'Update signed POD / BOL' : 'Upload signed POD / BOL'}
                </button>
                </article>
              );
            })
          )}
        </section>
      )}

      {activeTab === 'settlements' && (
        <section className="space-y-4">
          <div className="space-y-1 rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-5 text-center shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Delivered load gross value
            </span>
            <div className="text-3xl font-black text-emerald-300">
              ${totalDeliveredRevenue.toFixed(2)}
            </div>
            <p className="text-[10px] text-gray-400">
              Gross load rates across {completedLoads.length} delivered load(s);
              this is not a payroll settlement or take-home pay.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Completed load history
            </h2>
            {completedLoads.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500">
                No completed loads are on record for this driver.
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {completedLoads.map((load) => (
                  <div
                    key={load.id}
                    className="flex items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-blue-400">
                        {loadNumber(load)}
                      </div>
                      <div className="text-gray-300">
                        {load.origin || 'Pickup'} → {load.destination || 'Delivery'}
                      </div>
                    </div>
                    <div className="shrink-0 font-bold text-emerald-400">
                      ${Number(load.rate || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {selectedLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pod-upload-title"
            className="w-full max-w-sm space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h2 id="pod-upload-title" className="text-sm font-bold text-white">
                  Upload POD document
                </h2>
                <p className="mt-0.5 font-mono text-[10px] text-blue-400">
                  Load: {loadNumber(selectedLoad)}
                </p>
              </div>
              <button
                aria-label="Close upload dialog"
                onClick={() => setSelectedLoad(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <label className="block text-xs text-gray-300">
              Take a photo or select a signed document (PDF, JPEG, PNG, or WebP;
              max 10 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && file.size > 10 * 1024 * 1024) {
                    setError('Choose a file smaller than 10 MB.');
                    setPodFile(null);
                    event.target.value = '';
                    return;
                  }
                  setError(null);
                  setPodFile(file);
                }}
                className="mt-2 w-full cursor-pointer text-xs text-gray-400 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500"
              />
            </label>
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-gray-800 pt-3">
              <button
                disabled={isUploading}
                onClick={() => {
                  setSelectedLoad(null);
                  setPodFile(null);
                  setError(null);
                }}
                className="rounded-xl bg-gray-800 px-3.5 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={!podFile || isUploading}
                onClick={() => void handlePodUpload()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Submit POD'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
