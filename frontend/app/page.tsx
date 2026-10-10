'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Load } from '@/types/load';
import NewLoadModal from '@/components/NewLoadModal';

async function requestLoads(apiUrl: string): Promise<Load[]> {
  const res = await fetch(`${apiUrl}/loads`);
  if (!res.ok) {
    throw new Error('Failed to fetch loads from backend');
  }

  const response: unknown = await res.json();
  if (Array.isArray(response)) {
    return response as Load[];
  }

  if (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray(response.data)
  ) {
    return response.data as Load[];
  }

  throw new Error('Unexpected response from loads API');
}

export default function LoadsDashboard() {
  const [loads, setLoads] = useState<Load[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const refreshLoads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await requestLoads(apiUrl);
      setLoads(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    let active = true;
    requestLoads(apiUrl)
      .then((data) => {
        if (active) {
          setLoads(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [apiUrl]);

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">TMS Load Dispatch</h1>
            <p className="text-gray-400 mt-1">Manage active shipments, statuses, and rates.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition shadow-lg shadow-blue-600/20"
          >
            + New Load
          </button>
        </header>

        {loading && !loads && <div className="text-center py-12 text-gray-400">Loading loads from database...</div>}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            Error: {error}. Make sure your NestJS backend is running!
          </div>
        )}

        {loads && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-750 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="p-4">Load #</th>
                    <th className="p-4">Broker / Customer</th>
                    <th className="p-4">Route</th>
                    <th className="p-4">Commodity</th>
                    <th className="p-4">Rate</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-sm">
                  {loads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        No loads found in the database. Click &quot;+ New Load&quot; to add one!
                      </td>
                    </tr>
                  ) : (
                    loads.map((load) => (
                      <tr key={load.id} className="hover:bg-gray-750/50 transition">
                        <td className="p-4 font-semibold text-blue-400">{load.load_number}</td>
                        <td className="p-4">
                          <div className="font-medium">{load.broker}</div>
                          <div className="text-xs text-gray-400">{load.customer || 'N/A'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-200">{load.pickup_location}</div>
                          <div className="text-xs text-gray-400">to {load.delivery_location}</div>
                        </td>
                        <td className="p-4 text-gray-300">{load.commodity || 'General'}</td>
                        <td className="p-4 font-semibold text-green-400">
                          ${Number(load.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              load.status === 'Available'
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : load.status === 'In Transit'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}
                          >
                            {load.status || 'Available'}
                          </span>
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

      {/* Modal for Creating Loads */}
      <NewLoadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoadCreated={refreshLoads}
      />
    </main>
  );
}