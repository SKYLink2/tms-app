'use client';

import React, { useState, useEffect } from 'react';

export default function DriverFuelPage() {
  const [gallons, setGallons] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [fuelCardAmount, setFuelCardAmount] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [truckId, setTruckId] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [myTransactions, setMyTransactions] = useState<any[]>([]);

  // Fetch driver's fuel history on mount
  useEffect(() => {
    fetch('http://localhost:3000/accounting/fuel/transactions')
      .then((res) => res.json())
      .then((data) => setMyTransactions(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load transactions', err));
  }, []);

  // Handle Image Upload & AI OCR Auto-Fill
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
      });
      const data = await res.json();

      if (data.success) {
        setReceiptImageUrl(data.receiptImageUrl);
        if (data.extracted?.gallons) setGallons(data.extracted.gallons.toString());
        if (data.extracted?.receiptAmount) setReceiptAmount(data.extracted.receiptAmount.toString());
      }
    } catch (err) {
      console.error('OCR scan failed', err);
      alert('Failed to scan receipt automatically.');
    } finally {
      setLoadingOcr(false);
    }
  };

  // Submit Fuel Log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:3000/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        
        // Refresh transaction list
        const updated = await fetch('http://localhost:3000/accounting/fuel/transactions').then(r => r.json());
        setMyTransactions(Array.isArray(updated) ? updated : []);
      } else {
        alert('Failed to submit fuel log.');
      }
    } catch (err) {
      console.error('Submission error', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-white">
      <div className="bg-[#121826] border border-gray-800 p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-white">Fuel Receipt Scanner & Logger</h1>
        <p className="text-sm text-gray-400 mt-1">Snap a photo of your receipt to auto-fill details via OCR.</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-900/50 border border-green-500 text-green-200 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="bg-[#121826] border border-gray-800 p-6 rounded-xl space-y-5 shadow-lg">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Snap or Select Receipt (Auto-OCR Fill)
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment" // Opens mobile camera directly
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
          />
          {loadingOcr && <p className="text-xs text-orange-400 mt-2 animate-pulse">Scanning receipt with AI OCR...</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Truck / Unit ID</label>
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
            <label className="block text-sm font-medium text-gray-300">Odometer Reading</label>
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
            <label className="block text-sm font-medium text-gray-300">Gallons (Auto-filled)</label>
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
            <label className="block text-sm font-medium text-gray-300">Receipt Total $ (Auto-filled)</label>
            <input
              type="number"
              step="0.01"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(e.target.value)}
              placeholder="Auto-filled by OCR"
              className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300">Fuel Card Amount $ (Optional)</label>
            <input
              type="number"
              step="0.01"
              value={fuelCardAmount}
              onChange={(e) => setFuelCardAmount(e.target.value)}
              placeholder="Enter if paid via fuel card"
              className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition"
        >
          {submitting ? 'Submitting...' : 'Submit Fuel Log & Reconcile'}
        </button>
      </form>

      {/* History Section */}
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
                  {tx.reconciliationStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}