'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatPersonName } from '@/lib/person-name';

interface Settlement {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  weekEnding: string;
  grossRevenue: number;
  driverSplitPercentage: number;
  driverGrossPay: number;
  fuelAdvances: number;
  netPayout: number;
  status: string;
}

interface FuelExpense {
  id: string;
  truckUnitNumber: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  gallons: number;
  totalCost: number;
  location: string;
  purchaseDate: string;
}

export default function AccountingDashboard() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const [activeTab, setActiveTab] = useState<'settlements' | 'fuel'>('settlements');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [fuelExpenses, setFuelExpenses] = useState<FuelExpense[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Settlement Form states
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [weekEnding, setWeekEnding] = useState('');
  const [grossRevenue, setGrossRevenue] = useState('');
  const [split, setSplit] = useState('70');
  const [fuelDeduction, setFuelDeduction] = useState('');
  const [status, setStatus] = useState('Draft');

  // Fuel Form states
  const [fuelTruck, setFuelTruck] = useState('');
  const [fuelFirstName, setFuelFirstName] = useState('');
  const [fuelMiddleName, setFuelMiddleName] = useState('');
  const [fuelLastName, setFuelLastName] = useState('');
  const [fuelGallons, setFuelGallons] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelLocation, setFuelLocation] = useState('');
  const [fuelDate, setFuelDate] = useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSettlements = settlements.filter((settlement) =>
    [
      settlement.firstName,
      settlement.middleName,
      settlement.lastName,
      settlement.weekEnding,
      settlement.status,
      settlement.grossRevenue,
      settlement.fuelAdvances,
      settlement.netPayout,
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery)),
  );
  const filteredFuelExpenses = fuelExpenses.filter((expense) =>
    [
      expense.truckUnitNumber,
      expense.firstName,
      expense.middleName,
      expense.lastName,
      expense.location,
      expense.gallons,
      expense.totalCost,
      expense.purchaseDate,
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery)),
  );

  const fetchData = useCallback(async () => {
    try {
      setFetchError(null);
      const resSet = await fetch(`${apiUrl}/accounting/settlements`);
      if (!resSet.ok) {
        throw new Error(`Failed to fetch settlements (${resSet.status})`);
      }
      setSettlements(await resSet.json());

      const resFuel = await fetch(`${apiUrl}/accounting/fuel`);
      if (!resFuel.ok) {
        throw new Error(`Failed to fetch fuel expenses (${resFuel.status})`);
      }
      setFuelExpenses(await resFuel.json());
    } catch (err) {
      console.error('Error fetching accounting data:', err);
      setFetchError(
        err instanceof Error
          ? `${err.message}. Check that the backend is running and NEXT_PUBLIC_API_URL points to it.`
          : 'Unable to fetch accounting data. Check the backend connection.',
      );
    }
  }, [apiUrl]);

  useEffect(() => {
    const loadAccountingData = async () => {
      await fetchData();
    };

    void loadAccountingData();
  }, [fetchData]);

  // Settlement Handlers
  const handleOpenCreate = () => {
    setEditingId(null);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setWeekEnding('');
    setGrossRevenue('');
    setSplit('70');
    setFuelDeduction('');
    setStatus('Draft');
    setIsSettlementModalOpen(true);
  };

  const handleOpenEdit = (settlement: Settlement) => {
    setEditingId(settlement.id);
    setFirstName(settlement.firstName);
    setMiddleName(settlement.middleName || '');
    setLastName(settlement.lastName);
    setWeekEnding(settlement.weekEnding);
    setGrossRevenue(settlement.grossRevenue.toString());
    setSplit(settlement.driverSplitPercentage.toString());
    setFuelDeduction(settlement.fuelAdvances.toString());
    setStatus(settlement.status);
    setIsSettlementModalOpen(true);
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      firstName,
      middleName,
      lastName,
      weekEnding,
      grossRevenue: parseFloat(grossRevenue),
      driverSplitPercentage: parseFloat(split),
      fuelAdvances: parseFloat(fuelDeduction || '0'),
      status,
    };

    try {
      const url = editingId
        ? `${apiUrl}/accounting/settlements/${editingId}`
        : `${apiUrl}/accounting/settlements`;

      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to save settlement (${response.status})`);
      }

      setIsSettlementModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Error saving settlement:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to save settlement');
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this settlement record?')) return;
    try {
      const response = await fetch(`${apiUrl}/accounting/settlements/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete settlement (${response.status})`);
      }
      await fetchData();
    } catch (err) {
      console.error('Error deleting settlement:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to delete settlement');
    }
  };

  // Fuel Expense Handler
  const handleSubmitFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/accounting/fuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckUnitNumber: fuelTruck,
          firstName: fuelFirstName || null,
          middleName: fuelMiddleName || null,
          lastName: fuelLastName || null,
          gallons: parseFloat(fuelGallons),
          totalCost: parseFloat(fuelCost),
          location: fuelLocation,
          purchaseDate: fuelDate ? new Date(fuelDate).toISOString() : new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save fuel expense (${response.status})`);
      }
      setIsFuelModalOpen(false);
      setFuelTruck('');
      setFuelFirstName('');
      setFuelMiddleName('');
      setFuelLastName('');
      setFuelGallons('');
      setFuelCost('');
      setFuelLocation('');
      setFuelDate('');
      await fetchData();
    } catch (err) {
      console.error('Error saving fuel expense:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to save fuel expense');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Accounting & Settlements</h1>
          <p className="text-gray-400 text-sm mt-1">Manage driver pay splits, track fuel card expenses, and review payouts.</p>
        </div>
        <div>
          {activeTab === 'settlements' ? (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              + Generate Settlement
            </button>
          ) : (
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20"
            >
              + Log Fuel Expense
            </button>
          )}
        </div>
      </div>

      {fetchError && (
        <div role="alert" className="rounded-lg border border-red-500 bg-red-900/50 p-4 text-red-200">
          {fetchError}
        </div>
      )}

      <section aria-label="Accounting search">
        <input
          type="text"
          placeholder={
            activeTab === 'settlements'
              ? 'Search by driver, week, status, or amount...'
              : 'Search by truck, driver, location, or expense...'
          }
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-white shadow-inner placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </section>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-800 pb-4">
        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'settlements' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Driver Settlements
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'fuel' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Fuel Card Expenses
        </button>
      </div>

      {/* Settlements Table */}
      {activeTab === 'settlements' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/50 text-xs font-semibold text-gray-400 uppercase">
                <th className="p-4">Driver Name</th>
                <th className="p-4">Week Ending</th>
                <th className="p-4">Gross Revenue</th>
                <th className="p-4">Split</th>
                <th className="p-4">Fuel Deducted</th>
                <th className="p-4">Net Payout</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {filteredSettlements.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/40 transition">
                  <td className="p-4 font-semibold">{formatPersonName(s)}</td>
                  <td className="p-4 text-gray-400">{s.weekEnding}</td>
                  <td className="p-4 text-emerald-400 font-medium">${Number(s.grossRevenue).toFixed(2)}</td>
                  <td className="p-4 text-gray-300">{s.driverSplitPercentage}%</td>
                  <td className="p-4 text-rose-400">-${Number(s.fuelAdvances).toFixed(2)}</td>
                  <td className="p-4 text-white font-bold">${Number(s.netPayout).toFixed(2)}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-xs font-medium rounded-lg text-gray-300 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSettlement(s.id)}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium rounded-lg text-rose-400 border border-rose-500/20 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSettlements.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    {settlements.length === 0
                      ? 'No settlements have been created yet.'
                      : 'No settlements match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Fuel Expenses Table */}
      {activeTab === 'fuel' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/50 text-xs font-semibold text-gray-400 uppercase">
                <th className="p-4">Truck Unit</th>
                <th className="p-4">Driver</th>
                <th className="p-4">Gallons</th>
                <th className="p-4">Total Cost</th>
                <th className="p-4">Location</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {filteredFuelExpenses.map((f) => (
                <tr key={f.id} className="hover:bg-gray-800/40 transition">
                  <td className="p-4 font-semibold">{f.truckUnitNumber}</td>
                  <td className="p-4 text-gray-300">{formatPersonName(f) || 'N/A'}</td>
                  <td className="p-4 text-gray-400">{f.gallons} gal</td>
                  <td className="p-4 text-rose-400 font-medium">${Number(f.totalCost).toFixed(2)}</td>
                  <td className="p-4 text-gray-300">{f.location || 'Pilot / Love\'s'}</td>
                  <td className="p-4 text-gray-400">{new Date(f.purchaseDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredFuelExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    {fuelExpenses.length === 0
                      ? 'No fuel expenses have been logged yet.'
                      : 'No fuel expenses match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settlement Modal */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Driver Settlement' : 'Generate Driver Settlement'}</h2>
              <button onClick={() => setIsSettlementModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitSettlement} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {([
                  ['First name', firstName, setFirstName, true],
                  ['Middle name', middleName, setMiddleName, false],
                  ['Last name', lastName, setLastName, true],
                ] as const).map(([label, value, setter, required]) => (
                  <div key={label}>
                    <label className="mb-1 block text-xs font-medium text-gray-300">
                      {label}{required ? ' *' : ''}
                    </label>
                    <input
                      type="text"
                      required={required}
                      value={value}
                      onChange={(event) => setter(event.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Week Ending Date</label>
                  <input
                    type="date"
                    required
                    value={weekEnding}
                    onChange={(e) => setWeekEnding(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Driver Split (%)</label>
                  <input
                    type="number"
                    value={split}
                    onChange={(e) => setSplit(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Gross Load Revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="4500.00"
                    value={grossRevenue}
                    onChange={(e) => setGrossRevenue(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Fuel Deductions ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="650.00"
                    value={fuelDeduction}
                    onChange={(e) => setFuelDeduction(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Settlement Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg"
                >
                  {editingId ? 'Save Changes' : 'Calculate & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Expense Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Log Fuel Card Expense</h2>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitFuel} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Truck Unit #</label>
                <input
                  type="text"
                  required
                  placeholder="TRK-104"
                  value={fuelTruck}
                  onChange={(e) => setFuelTruck(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {([
                  ['First name', fuelFirstName, setFuelFirstName],
                  ['Middle name', fuelMiddleName, setFuelMiddleName],
                  ['Last name', fuelLastName, setFuelLastName],
                ] as const).map(([label, value, setter]) => (
                  <div key={label}>
                    <label className="mb-1 block text-xs font-medium text-gray-300">{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(event) => setter(event.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Gallons Pumped</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="135.5"
                    value={fuelGallons}
                    onChange={(e) => setFuelGallons(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Total Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="580.40"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Truck Stop Location</label>
                <input
                  type="text"
                  placeholder="Pilot #291 - Atlanta, GA"
                  value={fuelLocation}
                  onChange={(e) => setFuelLocation(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Purchase Date</label>
                <input
                  type="date"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg"
                >
                  Save Fuel Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
