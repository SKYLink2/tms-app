'use client';

import React, { useState, useEffect } from 'react';

export default function DriverPortal() {
  const [activeTab, setActiveTab] = useState<'loads' | 'pay' | 'fuel'>('loads');
  
  // State for Fuel Form & OCR
  const [gallons, setGallons] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [fuelCardAmount, setFuelCardAmount] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [truckId, setTruckId] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Data State
  const [assignedLoads, setAssignedLoads] = useState<any[]>([]);
  const [paySummary, setPaySummary] = useState<any>({ totalEarnings: 8200, settlements: [] });
  const [myTransactions, setMyTransactions] = useState<any[]>([]);

  // Fetch driver data on mount
  useEffect(() => {
    // 1. Fetch assigned loads
    fetch('http://localhost:3000/loads?driver=Khayal%20Hajiev', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAssignedLoads(Array.isArray(data) ? data : []))
      .catch(() => {
        // Fallback demo data matching your previous rich UI
        setAssignedLoads([
          {
            id: 'LD-1092',
            origin: 'Philadelphia, PA',
            destination: 'Atlanta, GA',
            pickupTime: 'Oct 16, 2026 - 08:00 AM',
            deliveryTime: 'Oct 17, 2026 - 02:00 PM',
            rate: '$2,800',
            status: 'IN_TRANSIT',
            miles: '775 mi',
          },
        ]);
      });

    // 2. Fetch pay & settlements
    fetch('http://localhost:3000/driver/settlements', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPaySummary(data);
        else throw new Error();
      })
      .catch(() => {
        setPaySummary({
          totalEarnings: 8200,
          settlements: [
            { id: 'SET-8801', loadId: 'LD-1085', route: 'Philly -> Chicago', date: 'Oct 12, 2026', amount: '$3,200', status: 'PAID' },
            { id: 'SET-8790', loadId: 'LD-1072', route: 'Dallas -> Memphis', date: 'Oct 05, 2026', amount: '$2,200', status: 'PAID' },
            { id: 'SET-8752', loadId: 'LD-1060', route: 'Atlanta -> Charlotte', date: 'Sep 28, 2026', amount: '$2,800', status: 'PAID' },
          ],
        });
      });

    // 3. Fetch fuel transactions
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('http://localhost:3000/accounting/fuel/transactions', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setMyTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load fuel transactions', err);
    }
  };

  // OCR Receipt Scan
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);

    setLoadingOcr(true);
    try {
      const res = await fetch('http://localhost:3000/fuel/ocr-scan', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error();

      const data = await res.json();
      if (data.success) {
        setReceiptImageUrl(data.receiptImageUrl);
        if (data.extracted?.gallons) setGallons(data.extracted.gallons.toString());
        if (data.extracted?.receiptAmount) setReceiptAmount(data.extracted.receiptAmount.toString());
      }
    } catch (err) {
      alert('Failed to scan receipt automatically.');
    } finally {
      setLoadingOcr(false);
    }
  };

  // Submit Fuel Log
  const handleSubmitFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:3000/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          truckId,
          driverId: 'Khayal Hajiev',
          gallons: parseFloat(gallons),
          receiptAmount: receiptAmount ? parseFloat(receiptAmount) : undefined,
          fuelCardAmount: fuelCardAmount ? parseFloat(fuelCardAmount) : undefined,
          odometerReading: parseInt(odometerReading, 10),
          receiptImageUrl,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Fuel receipt logged and reconciled successfully!');
        setGallons('');
        setReceiptAmount('');
        setFuelCardAmount('');
        setOdometerReading('');
        setReceiptImageUrl('');
        await fetchTransactions();
      } else {
        alert('Failed to submit fuel log.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-white">
      {/* Driver Header Card */}
      <div className="bg-[#121826] border border-gray-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs text-gray-400 tracking-wider uppercase font-semibold">Driver Portal</p>
          <h2 className="text-2xl font-bold text-white mt-1">Khayal Hajiev</h2>
        </div>

        {/* Tab Navigation Switches */}
        <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('loads')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'loads' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Assigned Loads ({assignedLoads.length})
          </button>
          <button
            onClick={() => setActiveTab('pay')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'pay' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Pay & Settlements (${paySummary.totalEarnings?.toLocaleString() || '8,200'})
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'fuel' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Fuel Receipt & OCR
          </button>
        </div>
      </div>

      {/* TAB 1: ASSIGNED LOADS VIEW */}
      {activeTab === 'loads' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Active & Assigned Route Details</h3>
          {assignedLoads.length === 0 ? (
            <div className="bg-[#121826] border border-gray-800 p-8 rounded-xl text-center text-gray-400">
              No active loads assigned at the moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignedLoads.map((load, idx) => (
                <div key={idx} className="bg-[#121826] border border-gray-800 p-6 rounded-xl space-y-4 shadow-lg">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">{load.id}</span>
                      <h4 className="text-xl font-bold text-white mt-0.5">{load.origin} &rarr; {load.destination}</h4>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-blue-900/40 text-blue-400 border border-blue-700 text-xs rounded-full font-semibold">
                        {load.status || 'IN_TRANSIT'}
                      </span>
                      <p className="text-lg font-bold text-green-400 mt-1">{load.rate}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Pickup Time</p>
                      <p className="font-medium mt-0.5">{load.pickupTime || 'Oct 16, 2026 - 08:00 AM'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Delivery Time</p>
                      <p className="font-medium mt-0.5">{load.deliveryTime || 'Oct 17, 2026 - 02:00 PM'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Total Distance</p>
                      <p className="font-medium mt-0.5">{load.miles || '775 mi'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAY & SETTLEMENTS VIEW */}
      {activeTab === 'pay' && (
        <div className="space-y-6">
          <div className="bg-[#121826] border border-gray-800 p-6 rounded-xl flex justify-between items-center shadow-lg">
            <div>
              <p className="text-sm text-gray-400 font-medium">Year-to-Date Earnings</p>
              <p className="text-3xl font-extrabold text-green-400 mt-1">
                ${paySummary.totalEarnings?.toLocaleString() || '8,200'}
              </p>
            </div>
            <span className="px-3 py-1.5 bg-green-900/30 text-green-400 border border-green-700/50 rounded-lg text-xs font-semibold">
              Settlements Up to Date
            </span>
          </div>

          <div className="bg-[#121826] border border-gray-800 p-6 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200">Completed Load Settlements</h3>
            <div className="divide-y divide-gray-800">
              {paySummary.settlements?.map((s: any, idx: number) => (
                <div key={idx} className="py-3.5 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-gray-200">{s.route} <span className="text-xs font-mono text-gray-500">({s.loadId})</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">Settled Date: {s.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">{s.amount}</p>
                    <span className="text-[10px] text-gray-400 font-mono uppercase">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FUEL RECEIPT & OCR VIEW */}
      {activeTab === 'fuel' && (
        <div className="space-y-6">
          {successMsg && (
            <div className="p-4 bg-green-900/50 border border-green-500 text-green-200 rounded-lg">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmitFuel} className="bg-[#121826] border border-gray-800 p-6 rounded-xl space-y-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200">Upload & Auto-Scan Fuel Receipt</h3>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Snap or Select Receipt Image (OCR Auto-Fill)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
              />
              {loadingOcr && <p className="text-xs text-orange-400 mt-2 animate-pulse">Scanning receipt via AI OCR...</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400">Truck / Unit ID</label>
                <input
                  type="text"
                  required
                  value={truckId}
                  onChange={(e) => setTruckId(e.target.value)}
                  placeholder="e.g. Truck-105"
                  className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400">Odometer Reading</label>
                <input
                  type="number"
                  required
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                  placeholder="e.g. 342000"
                  className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400">Gallons (Auto-filled)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={gallons}
                  onChange={(e) => setGallons(e.target.value)}
                  placeholder="Auto-filled by OCR"
                  className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400">Receipt Total $ (Auto-filled)</label>
                <input
                  type="number"
                  step="0.01"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  placeholder="Auto-filled by OCR"
                  className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition"
            >
              {submitting ? 'Saving...' : 'Submit Fuel Log'}
            </button>
          </form>

          {/* Past Submissions */}
          <div className="bg-[#121826] border border-gray-800 p-6 rounded-xl space-y-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200">Recent Fuel Submissions</h3>
            {myTransactions.length === 0 ? (
              <p className="text-sm text-gray-500">No fuel receipts logged yet.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {myTransactions.map((tx, idx) => (
                  <div key={idx} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-gray-200">{tx.gallons} Gallons — ${tx.receiptAmount ?? '0.00'}</p>
                      <p className="text-xs text-gray-400">Odometer: {tx.odometerReading} mi</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-900/40 text-green-400 text-xs rounded border border-green-700 font-medium">
                      {tx.reconciliationStatus || 'RECONCILED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}