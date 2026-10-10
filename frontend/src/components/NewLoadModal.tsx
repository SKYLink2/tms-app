'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';

interface NewLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCreated: () => void;
}

export default function NewLoadModal({ isOpen, onClose, onLoadCreated }: NewLoadModalProps) {
  const [formData, setFormData] = useState({
    load_number: '',
    broker: '',
    customer: '',
    pickup_location: '',
    delivery_location: '',
    pickup_date: '',
    delivery_date: '',
    rate: '',
    miles: '',
    weight: '',
    commodity: '',
    status: 'Available',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      // Format numeric fields properly before sending
      const payload = {
        ...formData,
        rate: Number(formData.rate),
        miles: formData.miles ? Number(formData.miles) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        // Format local date inputs to ISO strings if provided
        pickup_date: formData.pickup_date ? new Date(formData.pickup_date).toISOString() : new Date().toISOString(),
        delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : new Date().toISOString(),
      };

      const res = await fetch(`${apiUrl}/loads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(Array.isArray(errData.message) ? errData.message.join(', ') : errData.message || 'Failed to create load');
      }

      // Success! Reset form and close modal
      setFormData({
        load_number: '',
        broker: '',
        customer: '',
        pickup_location: '',
        delivery_location: '',
        pickup_date: '',
        delivery_date: '',
        rate: '',
        miles: '',
        weight: '',
        commodity: '',
        status: 'Available',
        notes: '',
      });
      onLoadCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create load');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        <div className="flex justify-between items-center bg-gray-750 px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create New Load</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Load Number *</label>
              <input
                type="text"
                name="load_number"
                required
                value={formData.load_number}
                onChange={handleChange}
                placeholder="e.g. LD-1004"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Broker *</label>
              <input
                type="text"
                name="broker"
                required
                value={formData.broker}
                onChange={handleChange}
                placeholder="e.g. TQL, Coyote"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Customer</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                placeholder="Shipper / Receiver Name"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Rate ($) *</label>
              <input
                type="number"
                step="0.01"
                name="rate"
                required
                value={formData.rate}
                onChange={handleChange}
                placeholder="2500.00"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Pickup Location *</label>
              <input
                type="text"
                name="pickup_location"
                required
                value={formData.pickup_location}
                onChange={handleChange}
                placeholder="Chicago, IL"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Delivery Location *</label>
              <input
                type="text"
                name="delivery_location"
                required
                value={formData.delivery_location}
                onChange={handleChange}
                placeholder="Atlanta, GA"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Pickup Date *</label>
              <input
                type="datetime-local"
                name="pickup_date"
                required
                value={formData.pickup_date}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Delivery Date *</label>
              <input
                type="datetime-local"
                name="delivery_date"
                required
                value={formData.delivery_date}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Miles</label>
              <input
                type="number"
                name="miles"
                value={formData.miles}
                onChange={handleChange}
                placeholder="750"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Weight (lbs)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="42000"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Commodity</label>
              <input
                type="text"
                name="commodity"
                value={formData.commodity}
                onChange={handleChange}
                placeholder="General Freight"
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Available">Available</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Notes</label>
            <textarea
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Special instructions, gate codes, etc."
              className="w-full bg-gray-900 border border-gray-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}