"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EditLoadModal from "@/components/EditLoadModal";
import NewLoadModal from "@/components/NewLoadModal";
import LoadProgressDrawer from "@/components/LoadProgressDrawer";
import {
  displayLoadNumber,
  LOAD_STATUSES,
  type Load,
  type LoadsResponse,
} from "@/types/load";
import type { Driver } from "@/types/driver";
import { formatPersonName } from "@/lib/person-name";
import { useRole } from "./components/role-context";

export default function LoadsDashboard() {
  const router = useRouter();
  const { setSessionUser } = useRole();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    role: string;
    driverId?: number | null;
  } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [activeBoard, setActiveBoard] = useState<"operational" | "staged">("operational");
  const [showUsers, setShowUsers] = useState(false);
  const [userForm, setUserForm] = useState({ username: "", password: "", role: "dispatcher", driverId: "" });
  const [users, setUsers] = useState<Array<{ id: string; username: string; role: string; driverId: number | null }>>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [response, setResponse] = useState<LoadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const loads = response?.data ?? [];
  useEffect(() => {
    void fetch(`${apiUrl}/loads/auth/session`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Not logged in");
        setCurrentUser(await res.json());
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecking(false));
  }, [apiUrl]);

  useEffect(() => {
    if (currentUser?.role === "driver") {
      router.replace("/driver");
    }
  }, [currentUser, router]);

  const canManageLoads = currentUser !== null &&
    ["admin", "owner", "dispatch_manager", "dispatcher"].includes(currentUser.role);

  const totalRevenue = loads.reduce(
    (sum, load) => sum + Number(load.rate || 0),
    0,
  );
  const activeLoads = loads.filter(
    (load) => ["IN_TRANSIT", "DISPATCHED"].includes(load.status),
  ).length;
  const deliveredLoads = loads.filter(
    (load) => load.status === "DELIVERED",
  ).length;

  const fetchLoads = useCallback(async () => {
    if (!currentUser || currentUser.role === "driver") {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: "100" });
      params.set("stage", activeBoard === "staged" ? "draft" : "operational");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`${apiUrl}/loads?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch loads from backend");
      const data: LoadsResponse = await res.json();
      setResponse(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeBoard, apiUrl, currentUser, searchQuery, statusFilter]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      void fetchLoads();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser, fetchLoads]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch(`${apiUrl}/loads/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Login failed");
      setCurrentUser(body);
      setSessionUser(body);
      setLoginPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${apiUrl}/loads/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setSessionUser(null);
    setCurrentUser(null);
    setResponse(null);
  };

  const createAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const res = await fetch(`${apiUrl}/loads/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...userForm,
        driverId: userForm.role === "driver" ? Number(userForm.driverId) : undefined,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      alert(Array.isArray(body.message) ? body.message.join(", ") : body.message);
      return;
    }
    setUsers((previous) => [...previous, body]);
    setUserForm({ username: "", password: "", role: "dispatcher", driverId: "" });
  };

  const loadUsers = async () => {
    const [usersResponse, driversResponse] = await Promise.all([
      fetch(`${apiUrl}/loads/users`, { credentials: "include" }),
      fetch(`${apiUrl}/drivers`),
    ]);
    if (!usersResponse.ok) throw new Error("Failed to retrieve load-board accounts");
    if (!driversResponse.ok) throw new Error("Failed to retrieve drivers");
    setUsers(await usersResponse.json());
    setDrivers(await driversResponse.json());
    setShowUsers((visible) => !visible);
  };

  const updateDriverAccountLink = async (userId: string, driverId: string) => {
    try {
      const res = await fetch(`${apiUrl}/loads/users/${userId}/driver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ driverId: driverId ? Number(driverId) : null }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(Array.isArray(body.message) ? body.message.join(", ") : body.message);
      }
      setUsers((previous) =>
        previous.map((user) => (user.id === userId ? body : user)),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not update driver account");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${apiUrl}/loads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchLoads();
    } catch (err: unknown) {
      alert(
        `Error updating status: ${err instanceof Error ? err.message : "An error occurred"}`,
      );
    }
  };

  const handleDelete = async (id: string, loadNumber: string) => {
    if (!confirm(`Are you sure you want to delete load #${loadNumber}?`))
      return;

    try {
      const res = await fetch(`${apiUrl}/loads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete load");
      await fetchLoads();
    } catch (err: unknown) {
      alert(
        `Error deleting load: ${err instanceof Error ? err.message : "An error occurred"}`,
      );
    }
  };

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-300">
        Checking load-board session...
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-gray-100">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md space-y-5 rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-xl"
        >
          <div>
            <h1 className="text-2xl font-bold">Load Board Sign In</h1>
            <p className="mt-1 text-sm text-gray-400">
              Sign in with your load-board account to view and manage loads.
            </p>
          </div>
          {loginError && (
            <div className="rounded-lg border border-red-500 bg-red-900/50 p-3 text-sm text-red-200">
              {loginError}
            </div>
          )}
          <label className="block text-sm text-gray-300">
            Username
            <input
              required
              autoComplete="username"
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-gray-300">
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
            />
          </label>
          <button
            disabled={loggingIn}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  if (currentUser.role === "driver") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 p-6 text-gray-300">
        Opening the Driver Portal...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 p-8 text-gray-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              TMS Load Dispatch
            </h1>
            <p className="mt-1 text-gray-400">
              Manage active shipments, statuses, and rates.
            </p>
          </div>
          {canManageLoads && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              + New Load
            </button>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span>{currentUser.username} ({currentUser.role})</span>
            {["admin", "owner"].includes(currentUser.role) && (
              <button
                onClick={() => void loadUsers().catch((err: unknown) => alert(err instanceof Error ? err.message : "Failed to load users"))}
                className="rounded-lg bg-gray-700 px-3 py-2 hover:bg-gray-600"
              >
                Manage Users
              </button>
            )}
            <button onClick={() => void handleLogout()} className="rounded-lg bg-gray-700 px-3 py-2 hover:bg-gray-600">
              Sign out
            </button>
          </div>
        </header>

        {showUsers && (
          <section className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
            <h2 className="text-lg font-semibold">Load-board accounts</h2>
            <form onSubmit={createAccount} className="grid gap-3 md:grid-cols-5">
              <input required minLength={3} placeholder="Username" value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white" />
              <input required minLength={16} type="password" placeholder="Password (16+ characters)" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white" />
              <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value, driverId: "" })} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white">
                <option value="dispatcher">Dispatcher</option>
                <option value="dispatch_manager">Dispatch Manager</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="driver">Driver</option>
              </select>
              {userForm.role === "driver" && (
                <select
                  required
                  value={userForm.driverId}
                  onChange={(event) => setUserForm({ ...userForm, driverId: event.target.value })}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                >
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option
                      key={driver.id}
                      value={driver.id}
                      disabled={users.some((user) => user.driverId === driver.id)}
                    >
                      {formatPersonName(driver)}
                    </option>
                  ))}
                </select>
              )}
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">Create account</button>
            </form>
            <ul className="divide-y divide-gray-700 text-sm">
              {users.map((user) => {
                const driver = drivers.find((candidate) => candidate.id === user.driverId);
                return (
                  <li key={user.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {user.username} — {user.role}
                      {driver ? ` (${formatPersonName(driver)})` : ""}
                    </span>
                    {user.role === "driver" && (
                      <select
                        aria-label={`Driver linked to ${user.username}`}
                        value={user.driverId?.toString() ?? ""}
                        onChange={(event) => void updateDriverAccountLink(user.id, event.target.value)}
                        className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                      >
                        <option value="">No linked driver</option>
                        {drivers.map((candidate) => (
                          <option
                            key={candidate.id}
                            value={candidate.id}
                            disabled={users.some(
                              (other) =>
                                other.id !== user.id &&
                                other.driverId === candidate.id,
                            )}
                          >
                            {formatPersonName(candidate)}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {canManageLoads && (
          <nav className="flex gap-2 border-b border-gray-800 pb-4" aria-label="Load board stages">
            <button onClick={() => setActiveBoard("operational")} className={`rounded-lg px-4 py-2 text-sm ${activeBoard === "operational" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300"}`}>
              Global Operations Board{activeBoard === "operational" && response ? ` (${response.total})` : ""}
            </button>
            <button onClick={() => setActiveBoard("staged")} className={`rounded-lg px-4 py-2 text-sm ${activeBoard === "staged" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300"}`}>
              Staged / Draft Loads{activeBoard === "staged" && response ? ` (${response.total})` : ""}
            </button>
          </nav>
        )}

        <section
          aria-label="Load summary"
          className="grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          <article className="flex flex-col justify-between rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Revenue (filtered loads)
            </span>
            <span className="mt-2 text-3xl font-extrabold text-emerald-400">
              $
              {totalRevenue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </article>
          <article className="flex flex-col justify-between rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Loads (filtered)
            </span>
            <span className="mt-2 text-3xl font-extrabold text-blue-400">
              {activeLoads}
            </span>
          </article>
          <article className="flex flex-col justify-between rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Delivered Loads (filtered)
            </span>
            <span className="mt-2 text-3xl font-extrabold text-purple-400">
              {deliveredLoads}
            </span>
          </article>
        </section>

        <section
          aria-label="Load search and filters"
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by load #, origin, or destination..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white shadow-inner placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white shadow-inner focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            {LOAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </section>

        {loading && !response && (
          <div className="py-12 text-center text-gray-400">
            Loading loads from database...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-900/50 p-4 text-red-200">
            Error: {error}. Make sure your NestJS backend is running!
          </div>
        )}

        {response && (
          <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-750 text-xs uppercase tracking-wider text-gray-400">
                    <th className="p-4">Load #</th>
                    {currentUser.role !== "driver" && <th className="p-4">Dispatcher</th>}
                    <th className="p-4">Assigned Driver &amp; Unit</th>
                    <th className="p-4">Route / Dates</th>
                    <th className="p-4">Rate</th>
                    <th className="p-4">Status</th>
                    {canManageLoads && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-sm">
                  {loads.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManageLoads ? 7 : 6}
                        className="py-8 text-center text-gray-400"
                      >
                        No loads match your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    loads.map((load) => (
                      <tr
                        key={load.id}
                        aria-label={`View details for load ${displayLoadNumber(load)}`}
                        className="cursor-pointer transition hover:bg-gray-750/50 focus:bg-gray-750/50 focus:outline-none"
                        onClick={() => setDetailLoad(load)}
                        onKeyDown={(event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault();
                            setDetailLoad(load);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="p-4 font-semibold text-blue-400">
                          {displayLoadNumber(load)}
                        </td>
                        {currentUser.role !== "driver" && (
                          <td className="p-4 text-gray-300">
                            {load.dispatcherName || "Unassigned"}
                          </td>
                        )}
                        <td className="p-4">
                          {load.driver ? (
                            <div>
                              <div className="font-medium text-blue-400">
                                {formatPersonName(load.driver)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {load.truckUnitNumber || load.driver.truck_number || "No truck #"}
                              </div>
                            </div>
                          ) : (
                            <span className="italic text-gray-500">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-gray-200">{load.origin}</div>
                          <div className="text-xs text-gray-400">
                            to {load.destination}
                          </div>
                          {(load.pickupDate || load.deliveryDate) && (
                            <div className="mt-1 text-xs text-gray-500">
                              {load.pickupDate || "Pickup TBD"} to{" "}
                              {load.deliveryDate || "Delivery TBD"}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-green-400">
                          $
                          {Number(load.rate).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-4">
                          {canManageLoads ? (
                          <select
                            value={load.status || "DRAFT"}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              void handleStatusChange(
                                load.id,
                                event.target.value,
                              )
                            }
                            className={`cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-1 text-xs font-medium focus:outline-none ${
                              ["DRAFT", "QUOTED", "PENDING_ASSIGNMENT"].includes(load.status)
                                ? "border-yellow-500/30 text-yellow-300"
                                : ["ASSIGNED", "DISPATCHED", "IN_TRANSIT"].includes(load.status)
                                  ? "border-blue-500/30 text-blue-300"
                                  : "border-green-500/30 text-green-300"
                            }`}
                          >
                            {LOAD_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          ) : (
                            <span className="text-xs font-medium text-gray-300">
                              {load.status.replaceAll("_", " ")}
                            </span>
                          )}
                        </td>
                        {canManageLoads && <td className="space-x-2 p-4 text-right">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingLoad(load);
                            }}
                            className="cursor-pointer rounded border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDelete(load.id, displayLoadNumber(load));
                            }}
                            className="cursor-pointer rounded border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {canManageLoads && <NewLoadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onLoadCreated={fetchLoads}
      />}

      {canManageLoads && editingLoad && (
        <EditLoadModal
          onClose={() => setEditingLoad(null)}
          onLoadUpdated={fetchLoads}
          load={editingLoad}
        />
      )}
      {detailLoad && (
        <LoadProgressDrawer
          load={detailLoad}
          onClose={() => setDetailLoad(null)}
          onLoadUpdated={fetchLoads}
        />
      )}
    </main>
  );
}
