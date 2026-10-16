'use client';

import { useState, useEffect, useCallback } from 'react';

interface EquipmentItem {
  id: string;
  type: 'Truck' | 'Trailer';
  unitNumber: string;
  vin?: string | null;
  trailerType?: string | null;
  status: string;
  inventory?: string[] | null;
  nextServiceDue?: string | null;
  currentMileage?: number | null;
}

function isEquipmentItem(value: unknown): value is EquipmentItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    (item.type === 'Truck' || item.type === 'Trailer') &&
    typeof item.unitNumber === 'string' &&
    typeof item.status === 'string' &&
    (item.vin === undefined || item.vin === null || typeof item.vin === 'string') &&
    (item.trailerType === undefined ||
      item.trailerType === null ||
      typeof item.trailerType === 'string') &&
    (item.inventory === undefined ||
      item.inventory === null ||
      (Array.isArray(item.inventory) &&
        item.inventory.every((gear) => typeof gear === 'string'))) &&
    (item.nextServiceDue === undefined ||
      item.nextServiceDue === null ||
      typeof item.nextServiceDue === 'string') &&
    (item.currentMileage === undefined ||
      item.currentMileage === null ||
      typeof item.currentMileage === 'number')
  );
}

export default function EquipmentDashboard() {
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Truck' | 'Trailer'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for adding new equipment
  const [unitNumber, setUnitNumber] = useState('');
  const [type, setType] = useState<'Truck' | 'Trailer'>('Truck');
  const [vin, setVin] = useState('');
  const [trailerType, setTrailerType] = useState('Dry Van');
  const [inventoryInput, setInventoryInput] = useState('Samsara ELD, Straps');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const fetchEquipment = useCallback(async () => {
    const res = await fetch(`${apiUrl}/equipment`);
    if (!res.ok) throw new Error('Failed to fetch equipment from backend');
    const data: unknown = await res.json();
    if (!Array.isArray(data) || !data.every(isEquipmentItem)) {
      throw new Error('Backend returned invalid equipment data');
    }
    setEquipmentList(data);
  }, [apiUrl]);

  useEffect(() => {
    const loadEquipment = async () => {
      try {
        await fetchEquipment();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    void loadEquipment();
  }, [fetchEquipment]);

  // Handle adding new unit
  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          unitNumber,
          vin,
          trailerType: type === 'Trailer' ? trailerType : null,
          inventory: inventoryInput.split(',').map((i) => i.trim()),
          status: 'Active',
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || 'Failed to save equipment');
      }
      await fetchEquipment();
      setIsModalOpen(false);
      setUnitNumber('');
      setVin('');
      setInventoryInput('Samsara ELD, Straps');
      setTrailerType('Dry Van');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Safeguard against non-array data responses
  const filteredEquipment = Array.isArray(equipmentList)
    ? equipmentList.filter((item) => {
        const matchesType = filterType === 'All' || item.type === filterType;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [
            item.unitNumber,
            item.type,
            item.trailerType,
            item.vin,
            item.status,
            ...(item.inventory ?? []),
          ].some((value) => value?.toLowerCase().includes(query));
        return matchesType && matchesSearch;
      })
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-white">

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Fleet & Equipment Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage semi-trucks, diverse trailers, and onboard truck inventories.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20"
        >
          + Add New Unit
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500 bg-red-900/50 p-4 text-sm text-red-200">
          Error: {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-800 pb-4">
        {(['All', 'Truck', 'Trailer'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              filterType === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {tab === 'All' ? 'All Assets' : `${tab}s`}
          </button>
        ))}
      </div>

      <section aria-label="Equipment search">
        <input
          type="text"
          placeholder="Search by unit, type, VIN, or onboard gear..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white shadow-inner placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </section>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEquipment.map((item) => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  item.type === 'Truck' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {item.type} {item.trailerType ? `• ${item.trailerType}` : ''}
                </span>
                <h3 className="text-xl font-bold mt-2">{item.unitNumber}</h3>
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                item.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {item.status}
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-400 border-t border-gray-800 pt-3">
              <div className="flex justify-between">
                <span>VIN:</span>
                <span className="text-gray-200 font-mono">{item.vin || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Mileage:</span>
                <span className="text-gray-200">{item.currentMileage ? `${item.currentMileage.toLocaleString()} mi` : 'Not tracked'}</span>
              </div>
              <div className="flex justify-between">
                <span>Next Service:</span>
                <span className="text-gray-200">{item.nextServiceDue || 'Not scheduled'}</span>
              </div>
            </div>

            {/* Onboard Gear / Inventory */}
            <div className="border-t border-gray-800 pt-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Onboard Inventory & Gear</p>
              <div className="flex flex-wrap gap-1.5">
                {item.inventory && item.inventory.length > 0 ? (
                  item.inventory.map((gear, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-800 border border-gray-700/60 rounded-md text-[11px] text-gray-300">
                      {gear}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500 italic">No inventory items listed.</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredEquipment.length === 0 && (
        <p className="py-8 text-center text-gray-400">
          {equipmentList.length === 0
            ? 'No equipment has been added yet.'
            : 'No equipment matches your search or filter.'}
        </p>
      )}

      {/* Add Equipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Fleet Equipment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Asset Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'Truck' | 'Trailer')}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="Truck">Semi-Truck</option>
                    <option value="Trailer">Trailer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Unit Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TRK-104"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              {type === 'Trailer' && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Trailer Type</label>
                  <select
                    value={trailerType}
                    onChange={(e) => setTrailerType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="Dry Van">Dry Van</option>
                    <option value="Flatbed">Flatbed</option>
                    <option value="Refrigerator">Refrigerator (Reefer)</option>
                    <option value="Step Deck">Step Deck</option>
                    <option value="Car Hauler">Car Hauler</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">VIN Number</label>
                <input
                  type="text"
                  placeholder="17-digit VIN"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Onboard Gear (comma separated)</label>
                <input
                  type="text"
                  placeholder="Samsara ELD, 10x Straps, Load Bars"
                  value={inventoryInput}
                  onChange={(e) => setInventoryInput(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
