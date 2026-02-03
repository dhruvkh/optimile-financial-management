import React from 'react';
import { formatINR } from '../App';

export const InvoiceTemplate: React.FC<{ data: any, total?: number, tax?: number, id?: string }> = ({ data, total, tax, id }) => {
  // Fallback calculations if not provided
  const calcSubTotal = data.lineItems.reduce((acc: number, item: any) => acc + (item.total || 0), 0);
  const calcTax = tax !== undefined ? tax : calcSubTotal * 0.18;
  const calcTotal = total !== undefined ? total : calcSubTotal + calcTax - (data.discount || 0);

  return (
    <div id={id} className="bg-white p-8 max-w-2xl mx-auto border border-gray-200 text-sm font-sans min-h-[800px] flex flex-col relative">
      <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-6">
        <div>
           <h1 className="text-2xl font-bold text-primary">INVOICE</h1>
           <p className="text-gray-500 mt-1">#{data.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-800">Optimile Financial</div>
          <p className="text-gray-500">123 Business Park, Mumbai, MH</p>
        </div>
      </div>
  
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Bill To</h3>
          <p className="font-bold text-gray-800 text-lg">{data.customerName}</p>
          <p className="text-gray-600">GSTIN: {data.customerTaxId || 'N/A'}</p>
          <p className="text-gray-600">{data.customerAddress || 'Address not available'}</p>
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="text-gray-500 mr-4">Date:</span>
            <span className="font-medium">{data.date}</span>
          </div>
          <div>
            <span className="text-gray-500 mr-4">Due Date:</span>
            <span className="font-medium">{data.dueDate}</span>
          </div>
        </div>
      </div>
  
      <table className="w-full mb-8">
        <thead className="bg-gray-100 text-gray-600 font-bold">
          <tr>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-right">Rate</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.lineItems.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">{item.unitPrice}</td>
              <td className="p-2 text-right font-medium">{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
  
      <div className="flex justify-end mt-auto pt-4 border-t border-gray-200">
        <div className="w-64 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal:</span>
            <span className="font-medium">{formatINR(calcSubTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax (18%):</span>
            <span className="font-medium">{formatINR(calcTax)}</span>
          </div>
          {data.discount > 0 && (
             <div className="flex justify-between text-green-600">
               <span>Discount:</span>
               <span>-{formatINR(data.discount)}</span>
             </div>
          )}
          <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t border-gray-200">
            <span>Total:</span>
            <span>{formatINR(calcTotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
         <p>Thank you for your business. Please make payments via NEFT/IMPS to HDFC Bank A/c ****4589.</p>
      </div>
    </div>
  );
};
