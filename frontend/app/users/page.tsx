'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRole } from '../components/role-context';

type UserRole =
  | 'admin'
  | 'owner'
  | 'dispatch_manager'
  | 'dispatcher'
  | 'driver'
  | 'fleet_manager'
  | 'safety';

interface User {
  id: string;
  username: string;
  role: UserRole;
  driverId: number | null;
  active: boolean;
}

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ROLES: UserRole[] = [
  'admin',
  'owner',
  'dispatch_manager',
  'dispatcher',
  'fleet_manager',
  'safety',
  'driver',
];
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  owner: 'Owner',
  dispatch_manager: 'Dispatch Manager',
  dispatcher: 'Dispatcher',
  fleet_manager: 'Fleet Manager',
  safety: 'Safety Officer',
  driver: 'Driver',
};

async function errorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  if (Array.isArray(body?.message)) return body.message.join(', ');
  return body?.message ?? `Request failed (${response.status})`;
}

export default function UserManagementPage() {
  const { currentRole, isLoading: isRoleLoading } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'dispatcher' as UserRole,
    driverId: '',
  });

  const loadUsers = useCallback(async () => {
    const response = await fetch(`${API_URL}/loads/users`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    return (await response.json()) as User[];
  }, []);

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'owner') return;
    let active = true;
    void loadUsers()
      .then((loadedUsers) => {
        if (active) setUsers(loadedUsers);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Failed to load accounts');
        }
      })
      .finally(() => {
        if (active) setIsLoadingUsers(false);
      });
    return () => {
      active = false;
    };
  }, [currentRole, loadUsers]);

  if (isRoleLoading) {
    return <p className="text-sm text-gray-400">Checking account permissions…</p>;
  }

  const openCreateModal = async () => {
    setError('');
    setNewUser({
      username: '',
      password: '',
      role: 'dispatcher',
      driverId: '',
    });
    setIsModalOpen(true);
    try {
      const response = await fetch(`${API_URL}/drivers`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setDrivers((await response.json()) as Driver[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load drivers');
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/loads/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          role: newUser.role,
          ...(newUser.role === 'driver'
            ? { driverId: Number(newUser.driverId) }
            : {}),
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setUsers(await loadUsers());
      setIsModalOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to create account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (user: User, role: UserRole) => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/loads/users/${user.id}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setUsers(await loadUsers());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to update role');
    }
  };

  const handleDeactivateUser = async (id: string) => {
    if (!window.confirm('Deactivate this account? It will no longer be able to sign in.')) {
      return;
    }
    setError('');
    try {
      const response = await fetch(`${API_URL}/loads/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setUsers(await loadUsers());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to deactivate account');
    }
  };

  if (currentRole !== 'admin' && currentRole !== 'owner') {
    return (
      <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl">
        <h2 className="text-xl font-bold text-rose-400">Access Denied</h2>
        <p className="text-xs text-gray-400 mt-2">
          You do not have administrative permissions to manage accounts.
        </p>
      </div>
    );
  }

  const linkedDriverIds = new Set(
    users.filter((user) => user.driverId !== null).map((user) => user.driverId),
  );
  const availableDrivers = drivers.filter(
    (driver) => !linkedDriverIds.has(driver.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-xs text-gray-400">
            Manage login accounts, assign roles, and control access.
          </p>
        </div>
        <button
          onClick={() => void openCreateModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition"
        >
          + Add New User
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-950 text-gray-400 uppercase text-[10px] font-mono border-b border-gray-800">
            <tr>
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoadingUsers ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  Loading accounts…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  No accounts found. Create one above.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-6 py-4 font-semibold text-white">
                    {user.username}
                    {user.driverId !== null && (
                      <span className="ml-2 text-gray-500">Driver #{user.driverId}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      disabled={!user.active}
                      onChange={(event) =>
                        void handleRoleChange(user, event.target.value as UserRole)
                      }
                      className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs text-blue-400 font-mono uppercase focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      aria-label={`Role for ${user.username}`}
                    >
                      {ROLES.filter(
                        (role) => role !== 'driver' || user.role === 'driver',
                      ).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] border font-mono uppercase ${
                        user.active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}
                    >
                      {user.active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.active && (
                      <button
                        onClick={() => void handleDeactivateUser(user.id)}
                        className="text-rose-400 hover:text-rose-300 font-semibold text-xs transition"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-base">Create Login Account</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="new-username" className="block text-xs text-gray-400 mb-1">
                  Username
                </label>
                <input
                  id="new-username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9._-]+"
                  value={newUser.username}
                  onChange={(event) =>
                    setNewUser({ ...newUser, username: event.target.value })
                  }
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-xs text-gray-400 mb-1">
                  Initial Password (at least 16 characters)
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={16}
                  value={newUser.password}
                  onChange={(event) =>
                    setNewUser({ ...newUser, password: event.target.value })
                  }
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="new-role" className="block text-xs text-gray-400 mb-1">
                  Assigned Role
                </label>
                <select
                  id="new-role"
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser({
                      ...newUser,
                      role: event.target.value as UserRole,
                      driverId: '',
                    })
                  }
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono uppercase"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              {newUser.role === 'driver' && (
                <div>
                  <label htmlFor="new-driver" className="block text-xs text-gray-400 mb-1">
                    Linked Driver
                  </label>
                  <select
                    id="new-driver"
                    required
                    value={newUser.driverId}
                    onChange={(event) =>
                      setNewUser({ ...newUser, driverId: event.target.value })
                    }
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a driver</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName}
                      </option>
                    ))}
                  </select>
                  {availableDrivers.length === 0 && (
                    <p className="mt-1 text-xs text-amber-300">
                      No unlinked drivers are available.
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-xl text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || (newUser.role === 'driver' && availableDrivers.length === 0)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
