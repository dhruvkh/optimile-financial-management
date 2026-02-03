
import React, { useState, useEffect } from 'react';
import { useApp, formatINR } from '../App';

interface VendorPaymentModalProps {
  vendorIds: string[];
  bookingId?: string; // Optional shortcut from booking drawer
  onClose: () => void;
}

const VendorPaymentModal: React.FC<VendorPaymentModalProps> = ({ vendorIds, bookingId, onClose }) => {
  const { dispatch, state } = useApp();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Full payment');
  const [reference, setReference] = useState('');
  const [localBookingId, setLocalBookingId] = useState(bookingId || '');
  const [autoTds, setAutoTds] = useState(false);

  // If a single vendor and booking ID is provided, try to pre-fill the freight amount
  useEffect(() => {
    if (bookingId && vendorIds.length === 1) {
      const booking = state.bookings.find(b => b.id === bookingId);
      // Find outstanding balance for this booking (Debit - Credit)
      // This is complex because ledger is aggregated. Simple approach: pre-fill full expense amount
      if (booking) {
         setAmount(String(booking.expense));
      }
    }
  }, [bookingId, vendorIds, state.bookings]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reference) return;

    dispatch({
      type: 'RECORD_VENDOR_PAYMENT',
      payload: {
        vendorIds,
        date,
        amount: Number(amount),
        category,
        reference,
        autoTds,
        bookingId: localBookingId || undefined
      }
    });
    onClose();
  };

  // Preview TDS Calculation
  const numAmount = Number(amount) || 0;
  const tdsPreview = autoTds ? Math.round((numAmount / 0.98) * 0.02) : 0;
  const totalCredit = numAmount + tdsPreview;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Record Vendor Payment</h3>
            <p className="text-xs text-gray-500 mt-0.5">Processing for {vendorIds.length} selected vendor(s)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-icons">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
              <input 
                type="date" 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-primary focus:border-primary"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
              <select 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-primary focus:border-primary"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Full payment">Full payment</option>
                <option value="Partial payment">Partial payment</option>
                <option value="Advance payment">Advance payment</option>
                <option value="Shortage Deduction">Shortage Deduction</option>
                <option value="Damage Penalty">Damage Penalty</option>
                <option value="Diesel Advance">Diesel Advance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              {autoTds ? 'Bank Payment Amount (Net)' : 'Amount'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">₹</span>
              <input 
                type="number" 
                className="w-full border-gray-300 rounded-md shadow-sm p-2 pl-8 text-sm focus:ring-primary focus:border-primary"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            {autoTds && numAmount > 0 && (
              <p className="text-[10px] text-green-600 mt-1 font-medium bg-green-50 p-1 rounded border border-green-100">
                + TDS (2%): ₹{formatINR(tdsPreview)} = Total Credit: ₹{formatINR(totalCredit)}
              </p>
            )}
          </div>

          {/* Auto TDS Toggle - Only for payments */}
          {['Full payment', 'Partial payment', 'Advance payment'].includes(category) && (
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="autoTds"
                  type="checkbox"
                  checked={autoTds}
                  onChange={(e) => setAutoTds(e.target.checked)}
                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="autoTds" className="font-medium text-gray-700">Auto-deduct TDS (2%)</label>
                <p className="text-gray-500 text-xs">System will create two entries: Bank Payment & TDS Credit.</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reference / UTR</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-primary focus:border-primary" 
              placeholder="e.g. HDFC123456" 
              value={reference}
              onChange={e => setReference(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip / Booking ID (Optional)</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-primary focus:border-primary" 
              placeholder="e.g. BK-2024001" 
              value={localBookingId}
              onChange={e => setLocalBookingId(e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-1">Link this deduction or payment to a specific trip.</p>
          </div>

          <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
            <button type="submit" className="flex-1 bg-primary text-white py-2 rounded-md font-medium hover:bg-blue-700 shadow-sm text-sm">Confirm Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorPaymentModal;
