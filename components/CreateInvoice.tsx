import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { useApp, formatINR } from '../App';
import { Invoice, Booking } from '../types';
import { InvoiceTemplate } from './InvoiceTemplate';

// --- Types & Steps ---
const STEPS = ['Details', 'Line Items', 'Summary', 'Preview'];

// --- Main Create Wizard ---

const CreateInvoice: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);

  // Check for bookings passed from Pending Invoice Tab
  const preSelectedBookings: Booking[] = (location.state as any)?.selectedBookings || [];

  // Determine initial line items
  const initialLineItems = preSelectedBookings.length > 0 
    ? preSelectedBookings.map(b => ({
        description: `Trip #${b.id}: ${b.origin} to ${b.destination} (${state.vehicles.find(v => v.id === b.vehicleId)?.regNumber || b.vehicleId})`,
        quantity: 1,
        unitPrice: b.amount,
        total: b.amount
      }))
    : [{ description: 'Logistics Services', quantity: 1, unitPrice: 0, total: 0 }];

  // Pre-fill customer details if bookings exist
  const initialCustomerId = preSelectedBookings.length > 0 ? preSelectedBookings[0].customerId : '';
  const initialCustomer = state.customers.find(c => c.id === initialCustomerId);

  // Form Setup
  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      invoiceNumber: `INV-${Math.floor(Math.random() * 100000)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerId: initialCustomerId,
      customerName: initialCustomer?.name || '',
      customerTaxId: initialCustomer?.taxId || '',
      customerAddress: initialCustomer?.address || '',
      discount: 0,
      lineItems: initialLineItems
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems"
  });

  // Calculations
  const lineItems = watch("lineItems");
  const discount = watch("discount");
  const selectedCustomerId = watch("customerId");
  
  // Real-time Credit Logic
  const selectedCustomer = state.customers.find(c => c.id === selectedCustomerId);
  const currentOutstanding = state.invoices
    .filter(i => i.customerId === selectedCustomerId && i.status !== 'paid')
    .reduce((acc, i) => acc + i.amount, 0);

  useEffect(() => {
    lineItems.forEach((item, index) => {
      const newTotal = (item.quantity || 0) * (item.unitPrice || 0);
      if (item.total !== newTotal) {
        setValue(`lineItems.${index}.total`, newTotal);
      }
    });
  }, [JSON.stringify(lineItems), setValue]);

  const subTotal = lineItems.reduce((acc, item) => acc + (item.total || 0), 0);
  const taxAmount = subTotal * 0.18; // 18% Flat GST
  const grandTotal = subTotal + taxAmount - (discount || 0);
  
  const isCreditExceeded = selectedCustomer && (currentOutstanding + grandTotal > selectedCustomer.creditLimit);

  // Handlers
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cust = state.customers.find(c => c.id === e.target.value);
    if (cust) {
      setValue("customerId", cust.id);
      setValue("customerName", cust.name);
      setValue("customerTaxId", cust.taxId);
      setValue("customerAddress", cust.address || 'Mumbai, India'); // Mock Address
    }
  };

  const onSubmit = (data: any) => {
    const newInvoice: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: data.customerId,
      customerName: data.customerName,
      invoiceNumber: data.invoiceNumber,
      status: 'sent', // Auto-send logic if from bookings
      date: data.date,
      dueDate: data.dueDate,
      amount: grandTotal,
      taxAmount: taxAmount,
      discount: data.discount,
      lineItems: data.lineItems
    };
    
    dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
    
    // If created from pending bookings, mark them as invoiced
    if (preSelectedBookings.length > 0) {
      dispatch({ type: 'MARK_BOOKINGS_INVOICED', payload: preSelectedBookings.map(b => b.id) });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Invoice Generated & Bookings Closed' } });
    } else {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Invoice Draft Created' } });
    }

    navigate('/invoices');
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
        <div className="flex items-center mt-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center ${i <= step ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${i <= step ? 'border-primary bg-blue-50' : 'border-gray-300'}`}>
                  {i + 1}
                </div>
                <span className="ml-2 font-medium">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-12 h-0.5 bg-gray-200 mx-4" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
        {/* Context info for booking conversion */}
        {preSelectedBookings.length > 0 && (
           <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 flex items-center justify-between">
              <div className="flex items-center">
                 <span className="material-icons text-green-500 mr-3">receipt_long</span>
                 <div>
                   <h4 className="font-bold text-green-800">Generating Invoice from Bookings</h4>
                   <p className="text-sm text-green-700 mt-1">
                     {preSelectedBookings.length} pending trips included. Customer details pre-filled.
                   </p>
                 </div>
              </div>
              <span className="text-sm font-bold text-green-900 bg-green-200 px-3 py-1 rounded-full">
                Total Value: {formatINR(subTotal)}
              </span>
           </div>
        )}

        {/* Credit Limit Warning */}
        {isCreditExceeded && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-start">
             <span className="material-icons text-red-500 mr-3">warning</span>
             <div>
               <h4 className="font-bold text-red-800">Credit Limit Exceeded</h4>
               <p className="text-sm text-red-700 mt-1">
                 This invoice will push {selectedCustomer?.name} over their credit limit of {formatINR(selectedCustomer?.creditLimit || 0)}.
                 <br/>Current Outstanding: {formatINR(currentOutstanding)} + New Invoice: {formatINR(grandTotal)}
               </p>
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          
          {/* Step 1: Details */}
          <div className={step === 0 ? 'block' : 'hidden'}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input {...register("invoiceNumber")} readOnly className="w-full bg-gray-50 border-gray-300 rounded-md p-2 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input type="date" {...register("date")} className="w-full border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
                <select 
                  onChange={handleCustomerChange} 
                  className={`w-full border-gray-300 rounded-md shadow-sm p-2 ${preSelectedBookings.length > 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={preSelectedBookings.length > 0}
                  {...register("customerId")}
                >
                  <option value="">-- Choose Customer --</option>
                  {state.customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {preSelectedBookings.length > 0 && <p className="text-xs text-gray-500 mt-1">Customer locked for booking conversion.</p>}
              </div>
              {watch("customerName") && (
                <div className="col-span-2 bg-blue-50 p-4 rounded-md border border-blue-100">
                  <p className="font-bold text-blue-900">{watch("customerName")}</p>
                  <p className="text-sm text-blue-700">{watch("customerTaxId")}</p>
                  <p className="text-sm text-blue-700">{watch("customerAddress")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Line Items */}
          <div className={step === 1 ? 'block' : 'hidden'}>
             <div className="space-y-4">
               {fields.map((field, index) => (
                 <div key={field.id} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg">
                   <div className="flex-1">
                     <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                     <input {...register(`lineItems.${index}.description`)} className="w-full border-gray-300 rounded-md p-2" />
                   </div>
                   <div className="w-24">
                     <label className="block text-xs font-bold text-gray-500 mb-1">Qty</label>
                     <input type="number" {...register(`lineItems.${index}.quantity`)} className="w-full border-gray-300 rounded-md p-2" />
                   </div>
                   <div className="w-32">
                     <label className="block text-xs font-bold text-gray-500 mb-1">Rate</label>
                     <input type="number" {...register(`lineItems.${index}.unitPrice`)} className="w-full border-gray-300 rounded-md p-2" />
                   </div>
                   <div className="w-32">
                     <label className="block text-xs font-bold text-gray-500 mb-1">Total</label>
                     <input disabled value={watch(`lineItems.${index}.total`)} className="w-full bg-gray-100 border-gray-300 rounded-md p-2 text-right" />
                   </div>
                   <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                     <span className="material-icons">delete</span>
                   </button>
                 </div>
               ))}
               <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, total: 0 })} className="text-primary font-medium flex items-center">
                 <span className="material-icons mr-1">add</span> Add Item
               </button>
             </div>
          </div>

          {/* Step 3: Summary */}
          <div className={step === 2 ? 'block' : 'hidden'}>
             <div className="max-w-sm ml-auto space-y-4 text-right">
               <div className="flex justify-between items-center">
                 <span className="text-gray-600">Subtotal</span>
                 <span className="font-bold text-lg">{formatINR(subTotal)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-gray-600">Tax (18%)</span>
                 <span className="font-bold text-lg text-red-600">{formatINR(taxAmount)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-gray-600">Discount</span>
                 <input type="number" {...register("discount")} className="w-32 border-gray-300 rounded-md p-1 text-right" />
               </div>
               <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                 <span className="text-xl font-bold text-gray-900">Grand Total</span>
                 <span className="text-2xl font-bold text-primary">{formatINR(grandTotal)}</span>
               </div>
             </div>
          </div>

          {/* Step 4: Preview */}
          <div className={step === 3 ? 'block' : 'hidden'}>
            <div className="shadow-lg">
              <InvoiceTemplate data={watch()} total={grandTotal + (discount || 0)} tax={taxAmount} />
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between">
             <button 
               type="button" 
               onClick={() => setStep(s => Math.max(0, s - 1))}
               disabled={step === 0}
               className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50"
             >
               Back
             </button>
             {step < 3 ? (
               <button 
                 type="button" 
                 onClick={() => setStep(s => Math.min(3, s + 1))}
                 className="px-6 py-2 bg-primary text-white rounded-md shadow-sm hover:bg-blue-700"
               >
                 Next
               </button>
             ) : (
               <div className="space-x-4">
                 <button type="button" className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                   Save Draft
                 </button>
                 <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700">
                   {isCreditExceeded ? 'Save & Request Approval' : 'Send Invoice'}
                 </button>
               </div>
             )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateInvoice;