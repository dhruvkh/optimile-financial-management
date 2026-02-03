import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useApp, formatINR } from '../App';

interface PaymentModalProps {
  invoiceId?: string | null;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ invoiceId, onClose }) => {
  const { state, dispatch } = useApp();
  
  // Filter only open invoices (not paid) to prevent accidental payments on closed invoices
  const openInvoices = state.invoices.filter(i => i.status !== 'paid');
  
  const preSelectedInvoice = invoiceId ? state.invoices.find(i => i.id === invoiceId) : undefined;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      entry: 'credit', // 'credit' | 'debit'
      invoiceId: preSelectedInvoice?.id || '',
      category: '',
      amount: '', // Use string to handle empty input
      reference: '',
      debitNoteNo: '',
      date: new Date().toISOString().split('T')[0],
      autoTds: false // New field for TDS
    },
    mode: 'onChange'
  });

  const selectedInvoiceId = watch('invoiceId');
  const entryType = watch('entry');
  const category = watch('category');
  const autoTds = watch('autoTds');
  const amountValue = watch('amount');

  // Find the selected invoice object to get balance details
  const currentInvoice = state.invoices.find(i => i.id === selectedInvoiceId);
  const paid = currentInvoice?.paidAmount || 0;
  const adjustments = currentInvoice?.adjustments || 0;
  const balance = currentInvoice ? currentInvoice.amount - (paid + adjustments) : 0;

  // Auto-fill amount logic when "Full payment" is selected
  useEffect(() => {
    if (category === 'Full payment' && currentInvoice) {
      // If AutoTDS is checked, default fill amount should be Net (98% of balance)
      // balance is Gross.
      // Net = Balance * 0.98.
      const suggestedAmount = autoTds 
        ? Math.floor(balance * 0.98) 
        : balance;
        
      setValue('amount', suggestedAmount > 0 ? String(suggestedAmount) : '0', { shouldValidate: true });
    }
  }, [category, currentInvoice, balance, setValue, autoTds]);

  const onSubmit = (data: any) => {
    if (!data.invoiceId) return;

    dispatch({ 
      type: 'RECORD_PAYMENT', 
      payload: { 
        invoiceId: data.invoiceId, 
        date: data.date, 
        reference: data.reference,
        amount: Number(data.amount),
        type: data.entry,
        category: data.category,
        debitNoteNo: data.debitNoteNo,
        autoTds: data.autoTds // Pass the flag
      } 
    });
    // Notification handled by reducer
    onClose();
  };

  // Preview Calculations
  const previewTds = autoTds && amountValue ? Math.round((Number(amountValue) / 0.98) * 0.02) : 0;
  const previewGross = autoTds && amountValue ? Number(amountValue) + previewTds : Number(amountValue);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Record Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          
          {/* Entry Type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Entry <span className="text-red-500">*</span></label>
            <select 
              {...register('entry', { required: true })} 
              className="w-full border-gray-300 rounded-md shadow-sm p-2.5 text-sm focus:ring-primary focus:border-primary bg-white"
            >
              <option value="credit">Credit (Payment Received)</option>
              <option value="debit">Debit (Reversal/Adjustment)</option>
            </select>
          </div>

          {/* Invoice Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Invoice ID <span className="text-red-500">*</span></label>
            <select 
              {...register('invoiceId', { required: "Please select an invoice" })} 
              className={`w-full border rounded-md shadow-sm p-2.5 text-sm bg-white focus:ring-primary focus:border-primary ${errors.invoiceId ? 'border-red-300' : 'border-gray-300'}`}
            >
              <option value="">Select Invoice</option>
              {openInvoices.map(inv => {
                 const invPaid = inv.paidAmount || 0;
                 const invAdj = inv.adjustments || 0;
                 const invBal = inv.amount - (invPaid + invAdj);
                 return (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerName} (Bal: {formatINR(invBal)})
                    </option>
                 );
              })}
            </select>
            {errors.invoiceId && <p className="text-red-500 text-xs mt-1 font-medium">{errors.invoiceId.message as string}</p>}
          </div>

          {/* Dynamic Invoice Details Info Box */}
          {currentInvoice && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between text-sm shadow-inner transition-all">
               <div>
                 <span className="text-blue-600 block text-xs font-semibold uppercase tracking-wider mb-1">Total (Gross)</span>
                 <span className="text-xl font-bold text-gray-900 font-sans">{formatINR(currentInvoice.amount)}</span>
               </div>
               <div className="text-right">
                 <span className="text-blue-600 block text-xs font-semibold uppercase tracking-wider mb-1">Balance Due</span>
                 <span className="text-xl font-bold text-primary font-sans">{formatINR(balance)}</span>
               </div>
            </div>
          )}

          {/* Category & Amount Row */}
          <div className="grid grid-cols-2 gap-5">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category <span className="text-red-500">*</span></label>
                <select 
                  {...register('category', { required: "Category is required" })}
                  className={`w-full border rounded-md shadow-sm p-2.5 text-sm bg-white focus:ring-primary focus:border-primary ${errors.category ? 'border-red-300' : 'border-gray-300'}`}
                >
                  <option value="">Select...</option>
                  <option value="Full payment">Full payment</option>
                  <option value="Partial payment">Partial payment</option>
                  <option value="Advance payment">Advance payment</option>
                  <option value="Credit note">Credit note</option>
                  <option value="Debit note">Debit note</option>
                  <option value="Discount">Discount</option>
                  <option value="TDS">TDS</option>
                  <option value="Adjustment">Adjustment</option>
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1 font-medium">{errors.category.message as string}</p>}
             </div>
             
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  {autoTds ? "Amount Received in Bank" : "Amount (GST Inclusive)"} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    step="0.01"
                    {...register('amount', { 
                      required: "Amount is required", 
                      min: { value: 0.01, message: "Amount must be positive" },
                      validate: (value) => {
                        const val = Number(value);
                        if (category === 'Advance payment') return true;
                        
                        // Check Net vs Balance if autoTds is on, or Gross vs Balance if off
                        // For validation, we check effective credit amount
                        const effectiveCredit = autoTds ? val / 0.98 : val;
                        
                        // Tolerance of 2 for rounding issues
                        if (entryType === 'credit' && effectiveCredit > balance + 2) { 
                           return `Exceeds balance (${formatINR(balance)})`;
                        }
                        return true;
                      }
                    })} 
                    className={`w-full pl-8 border rounded-md shadow-sm p-2.5 text-sm font-semibold text-gray-900 focus:ring-primary focus:border-primary ${errors.amount ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-xs mt-1 font-medium">{errors.amount.message as string}</p>}
                
                {autoTds ? (
                  <p className="text-[10px] text-primary mt-1 font-medium">
                    Auto-calc: Bank ₹{formatINR(Number(amountValue) || 0)} + TDS ₹{formatINR(previewTds)} = Total Credit ₹{formatINR(previewGross)}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-1">Enter gross credit value.</p>
                )}
             </div>
          </div>
          
          {/* Auto TDS Checkbox (Only for Payments) */}
          {(category === 'Full payment' || category === 'Partial payment') && entryType === 'credit' && (
             <div className={`flex items-start p-3 rounded border transition-colors ${autoTds ? 'bg-primary/5 border-primary/20' : 'bg-yellow-50 border-yellow-200'}`}>
               <div className="flex items-center h-5">
                 <input 
                   id="autoTds" 
                   type="checkbox" 
                   {...register('autoTds')}
                   className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                 />
               </div>
               <div className="ml-3 text-sm">
                 <label htmlFor="autoTds" className="font-medium text-gray-700">Apply TDS @ 2%</label>
                 <p className="text-gray-500 text-xs mt-0.5">
                   Enabling this will split the entry into <strong>Bank Receipt</strong> (Amount entered) and <strong>TDS Credit</strong> (Calculated).
                 </p>
               </div>
             </div>
          )}

          {/* Reference No */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Reference No / UTR <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              {...register('reference', { required: "Reference number is required" })}
              className={`w-full border rounded-md shadow-sm p-2.5 text-sm focus:ring-primary focus:border-primary ${errors.reference ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="e.g. HDFC12345678"
            />
            {errors.reference && <p className="text-red-500 text-xs mt-1 font-medium">{errors.reference.message as string}</p>}
          </div>

          {/* Debit Note (Conditional) */}
          {(entryType === 'debit' || category === 'Debit note') && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Debit Note No</label>
              <input 
                type="text" 
                {...register('debitNoteNo')}
                className="w-full border-gray-300 rounded-md shadow-sm p-2.5 text-sm focus:ring-primary focus:border-primary"
                placeholder="DN-2023-..."
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100 mt-6">
             <button 
               type="button" 
               onClick={onClose} 
               className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
             >
               Cancel
             </button>
             <button 
               type="submit" 
               className="px-5 py-2.5 bg-primary text-white rounded-md hover:bg-blue-700 font-medium shadow-sm flex items-center text-sm transition-colors"
             >
               <span className="material-icons text-sm mr-2">save</span> Update Payment
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PaymentModal;