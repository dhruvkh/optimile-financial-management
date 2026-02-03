
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, formatINR } from '../App';
import VendorPaymentModal from './VendorPaymentModal';

interface BookingDrawerProps {
  bookingId: string;
  onClose: () => void;
  onPostFreight: (id: string) => void;
  onRecordPayment: (id: string) => void;
  isPosted: boolean;
}

const BookingDrawer: React.FC<BookingDrawerProps> = ({ bookingId, onClose, onPostFreight, onRecordPayment, isPosted }) => {
  const { state } = useApp();
  const booking = state.bookings.find(b => b.id === bookingId);
  const vehicle = state.vehicles.find(v => v.id === booking?.vehicleId);

  if (!booking) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform animate-slide-in-right border-l border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Trip Details</h3>
          <p className="text-xs text-gray-500">{booking.id}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <span className="material-icons">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status Banner */}
        <div className={`p-4 rounded-lg border ${isPosted ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
           <div className="flex items-center justify-between">
             <span className={`text-sm font-bold ${isPosted ? 'text-green-700' : 'text-yellow-800'}`}>
               {isPosted ? 'Posted to Ledger' : 'Pending Posting'}
             </span>
             {isPosted ? (
               <span className="material-icons text-green-600">check_circle</span>
             ) : (
               <button 
                 onClick={() => onPostFreight(bookingId)}
                 className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-medium border border-yellow-300 transition-colors"
               >
                 Mark Completed & Post
               </button>
             )}
           </div>
           {!isPosted && (
             <p className="text-xs text-yellow-700 mt-2">
               Trip cost will be added to vendor liability once posted.
             </p>
           )}
        </div>

        {/* Details Grid */}
        <div className="space-y-4 text-sm">
           <div>
             <label className="text-xs font-bold text-gray-500 uppercase">Route</label>
             <div className="flex items-center mt-1">
               <span className="font-medium text-gray-900">{booking.origin}</span>
               <span className="material-icons text-xs text-gray-400 mx-2">arrow_forward</span>
               <span className="font-medium text-gray-900">{booking.destination}</span>
             </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Vehicle</label>
               <p className="font-medium text-gray-900 mt-1">{vehicle?.regNumber || booking.vehicleId}</p>
             </div>
             <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Distance</label>
               <p className="font-medium text-gray-900 mt-1">{booking.distance} km</p>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Completed</label>
               <p className="font-medium text-gray-900 mt-1">{new Date(booking.completedDate).toLocaleDateString()}</p>
             </div>
             <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Driver</label>
               <p className="font-medium text-gray-900 mt-1">{booking.driverName}</p>
             </div>
           </div>

           <div className="pt-4 border-t border-gray-100">
             <label className="text-xs font-bold text-gray-500 uppercase">Financials</label>
             <div className="mt-2 flex justify-between items-center bg-gray-50 p-3 rounded">
                <span className="text-gray-600">Freight Cost (Payable)</span>
                <span className="font-bold text-lg text-gray-900">{formatINR(booking.expense)}</span>
             </div>
             <div className="mt-2 flex justify-between items-center px-3">
                <span className="text-xs text-gray-500">Customer Billable</span>
                <span className="text-xs font-medium text-green-600">{formatINR(booking.amount)}</span>
             </div>
           </div>
        </div>
      </div>

      <div className="p-5 border-t border-gray-200 bg-white">
         <button 
           onClick={() => onRecordPayment(bookingId)}
           disabled={!isPosted}
           className="w-full py-3 bg-primary text-white rounded-lg shadow-sm hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
         >
           <span className="material-icons mr-2">payments</span>
           Record Payment
         </button>
         {!isPosted && <p className="text-xs text-center text-red-400 mt-2">Post to ledger first to enable payment.</p>}
      </div>
    </div>
  );
};

const VendorDetails: React.FC = () => {
  const { state, dispatch } = useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const vendor = state.vendors.find(v => v.id === id);

  // Derive Ledger Data
  const ledgerData = useMemo(() => {
    if (!vendor) return [];

    // Identify disputed bookings (Those with Deduction transactions)
    const disputedBookingIds = new Set(
      state.transactions
        .filter(t => t.vendorId === vendor.id && ['Shortage Deduction', 'Damage Penalty'].includes(t.category || ''))
        .map(t => t.referenceId)
        .filter(Boolean)
    );

    const debits = state.expenses
      .filter(e => e.vendorId === vendor.id)
      .map(e => ({
        id: e.id,
        date: e.date,
        bookingId: e.bookingId,
        entryType: e.entryType || 'Auto',
        category: e.category, // e.g., Freight, Fuel
        paymentMode: '-',
        referenceNo: '-',
        debit: e.amount,
        credit: 0,
        isDisputed: e.bookingId ? disputedBookingIds.has(e.bookingId) : false
      }));

    const credits = state.transactions
      .filter(t => t.vendorId === vendor.id && t.type === 'credit')
      .map(t => ({
        id: t.id,
        date: t.date,
        bookingId: t.referenceId, // Assuming payment reference links to booking
        entryType: 'Manual', // Payments are usually manual or imported
        category: t.category || 'Payment',
        paymentMode: t.paymentMode || 'NA',
        referenceNo: t.referenceNo || '-',
        debit: 0,
        credit: t.amount,
        isDisputed: false
      }));

    const allEntries = [...debits, ...credits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return allEntries.map(entry => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      return {
        ...entry,
        freightAmount: entry.debit,
        paidAmount: entry.credit,
        balance: runningBalance
      };
    }).reverse(); 
  }, [state.expenses, state.transactions, vendor]);

  const summary = useMemo(() => {
    return ledgerData.reduce((acc, curr) => ({
      totalFreight: acc.totalFreight + curr.freightAmount,
      totalPaid: acc.totalPaid + curr.paidAmount,
    }), { totalFreight: 0, totalPaid: 0 });
  }, [ledgerData]);

  const totalBalance = summary.totalFreight - summary.totalPaid;

  const handlePostFreight = (bookingId: string) => {
    dispatch({ type: 'COMPLETE_TRIP', payload: { bookingId } });
  };

  const isBookingPosted = (bookingId: string) => {
    return state.expenses.some(e => e.bookingId === bookingId && e.category === 'Freight');
  };

  if (!vendor) return <div className="p-8 text-center text-gray-500">Vendor not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Side Drawer */}
      {selectedBookingId && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => setSelectedBookingId(null)}></div>
          <BookingDrawer 
            bookingId={selectedBookingId} 
            onClose={() => setSelectedBookingId(null)} 
            onPostFreight={handlePostFreight}
            onRecordPayment={(bid) => {
              setSelectedBookingId(null); // Close drawer
              setShowPaymentModal(true); // Open payment modal with context
            }}
            isPosted={isBookingPosted(selectedBookingId)}
          />
        </>
      )}

      {/* Payment Shortcut Modal */}
      {showPaymentModal && selectedBookingId && (
        <VendorPaymentModal 
          vendorIds={[vendor.id]} 
          bookingId={selectedBookingId}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBookingId(null);
          }} 
        />
      )}

      {/* Header Navigation */}
      <div className="flex items-center space-x-4 mb-2">
        <button onClick={() => navigate('/vendors')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <span className="material-icons text-gray-600">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
          <div className="flex items-center text-sm text-gray-500 space-x-4">
             <span>{vendor.code || 'NO_CODE'}</span>
             <span>•</span>
             <span>{vendor.taxId || 'GST: N/A'}</span>
          </div>
        </div>
      </div>

      {/* Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
         <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Freight Amount</span>
            <span className="text-2xl font-bold text-gray-900 mt-1">{formatINR(summary.totalFreight)}</span>
         </div>
         <div className="flex flex-col border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-4 md:pt-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Paid</span>
            <span className="text-2xl font-bold text-green-600 mt-1">{formatINR(summary.totalPaid)}</span>
         </div>
         <div className="flex flex-col border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-4 md:pt-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Balance</span>
            <span className="text-2xl font-bold text-red-600 mt-1">{formatINR(totalBalance)}</span>
         </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
           <h3 className="font-semibold text-gray-800">Operational Ledger</h3>
           <div className="flex space-x-2">
              <button className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-200 bg-white">Download Statement</button>
           </div>
        </div>
        
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Booking ID</th>
                <th className="px-6 py-3">Entry Type</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Payment Mode</th>
                <th className="px-6 py-3">Ref No</th>
                <th className="px-6 py-3 text-right">Freight Amount</th>
                <th className="px-6 py-3 text-right">Paid</th>
                <th className="px-6 py-3 text-right">Balance</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledgerData.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-gray-500">No transactions found for this vendor.</td></tr>
              ) : (
                ledgerData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(row.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      {row.bookingId ? (
                        <div 
                          onClick={() => setSelectedBookingId(row.bookingId || null)}
                          className="flex items-center text-blue-600 hover:text-blue-800 cursor-pointer group"
                        >
                          <span className="font-medium mr-1">{row.bookingId}</span>
                          <span className="material-icons text-xs opacity-0 group-hover:opacity-100 transition-opacity">visibility</span>
                          {/* Dispute Icon for Short Paid trips */}
                          {row.isDisputed && (
                             <span className="ml-2 text-red-500" title="Shortage/Penalty Applied">
                               <span className="material-icons text-sm">warning</span>
                             </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${row.entryType === 'Auto' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-gray-100 text-gray-600'}`}>
                        {row.entryType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {row.category === 'Shortage Deduction' || row.category === 'Damage Penalty' ? (
                         <span className="text-red-600 font-medium flex items-center">
                           <span className="material-icons text-xs mr-1">remove_circle_outline</span>
                           {row.category}
                         </span>
                      ) : (
                         <span className="text-gray-700">{row.category}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">{row.paymentMode}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-mono">{row.referenceNo}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      {row.freightAmount > 0 ? (
                        <span className="text-red-600">{formatINR(row.freightAmount)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {row.paidAmount > 0 ? (
                        <span className="text-green-600">{formatINR(row.paidAmount)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">
                      {formatINR(row.balance)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-3">
                        <button 
                          onClick={() => row.bookingId && setSelectedBookingId(row.bookingId)}
                          className="text-gray-400 hover:text-blue-600" 
                          title="View Details"
                        >
                          <span className="material-icons text-lg">visibility</span>
                        </button>
                        <button className="text-gray-400 hover:text-gray-700" title="Edit">
                          <span className="material-icons text-lg">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;
