'use client';

import { useEffect, useState, useCallback } from 'react';
import { Driver } from '@/types/driver';
import NewDriverModal from '@/components/NewDriverModal';
import { formatPersonName } from '@/lib/person-name';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/drivers`);
      if (!res.ok) throw new Error('Failed to fetch drivers from backend');
      const data: Driver[] = await res.json();
      setDrivers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const filteredDrivers = drivers.filter((driver) =>
    [
      driver.firstName,
      driver.middleName,
      driver.lastName,
      driver.phone,
      driver.email,
      driver.status,
      driver.truck_number,
      driver.trailer_number,
    ]
      .some((value) => value?.toLowerCase().includes(searchQuery.trim().toLowerCase())),
  );

  useEffect(() => {
    let active = true;

    const loadDrivers = async () => {
      try {
        const res = await fetch(`${apiUrl}/drivers`);
        if (!res.ok) throw new Error('Failed to fetch drivers from backend');
        const data: Driver[] = await res.json();
        if (active) setDrivers(data);
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadDrivers();
    return () => {
      active = false;
    };
  }, [apiUrl]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete driver ${name}?`)) return;

    try {
      const res = await fetch(`${apiUrl}/drivers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete driver');
      fetchDrivers();
    } catch (err: unknown) {
      alert(
        `Error deleting driver: ${err instanceof Error ? err.message : 'An error occurred'}`,
      );
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Drivers & Equipment</h1>
            <p className="text-gray-400 mt-1">Manage fleet drivers, contact info, trucks, and trailers.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition shadow-lg shadow-blue-600/20"
          >
            + Add Driver
          </button>
        </header>

        {loading && <div className="text-center py-12 text-gray-400">Loading drivers...</div>}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            Error: {error}. Make sure your NestJS backend is running!
          </div>
        )}

        {!loading && !error && (
          <section aria-label="Driver search" className="mb-4">
            <input
              type="text"
              placeholder="Search by driver, contact, truck, or trailer..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white shadow-inner placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </section>
        )}

        {!loading && !error && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-750 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4">Driver Name</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Equipment (Truck / Trailer)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-sm">
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        {drivers.length === 0
                          ? 'No drivers registered yet. Click "+ Add Driver" to get started.'
                          : 'No drivers match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-gray-750/50 transition">
                        <td className="p-4 font-semibold text-blue-400">{formatPersonName(driver)}</td>
                        <td className="p-4">
                          <div className="text-gray-200">{driver.phone || 'No Phone'}</div>
                          <div className="text-xs text-gray-400">{driver.email || 'No Email'}</div>
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-900 border border-gray-700 px-2.5 py-1 rounded text-xs font-mono text-gray-300">
                            Truck: {driver.truck_number || 'N/A'}
                          </span>
                          <span className="ml-2 bg-gray-900 border border-gray-700 px-2.5 py-1 rounded text-xs font-mono text-gray-300">
                            Trailer: {driver.trailer_number || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                              driver.status === 'Active'
                                ? 'bg-green-500/10 text-green-300 border-green-500/30'
                                : driver.status === 'On Duty'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-gray-700/50 text-gray-300 border-gray-600'
                            }`}
                          >
                            {driver.status || 'Active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(driver.id, formatPersonName(driver))}
                            className="text-red-400 hover:text-red-300 text-xs font-medium px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20 transition cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <NewDriverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDriverCreated={fetchDrivers}
      />
    </main>
  );
}