import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, formatINR } from '../App';
import { InvoiceStatus, Invoice } from '../types';
import PaymentModal from './PaymentModal';
import { InvoiceTemplate } from './InvoiceTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const colors = {
    paid: 'bg-green-100 text-green-800',
    sent: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-600',
    overdue: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${colors[status]}`}>
      {status}
    </span>
  );
};

const InvoiceList: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [paymentModalOpen, setPaymentModalOpen] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);
  
  const canDelete = state.currentUser.role !== 'Accountant';

  const filtered = state.invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
    i.customerName.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  const handleSend = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("Are you sure you want to email this invoice to the customer?")) {
        dispatch({ type: 'UPDATE_INVOICE_STATUS', payload: { id, status: 'sent' } });
        dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Invoice emailed successfully!' } });
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'error', message: 'Accountants cannot delete invoices.' } });
      return;
    }
    if(window.confirm("Are you sure you want to delete this invoice?")) {
      dispatch({ type: 'DELETE_INVOICE', payload: id });
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(i => i.id)));
  };

  const handleExportCSV = () => {
    const headers = ['Invoice #', 'Customer', 'Date', 'Due Date', 'Amount', 'Status'];
    const rows = filtered.map(i => [
      i.invoiceNumber, i.customerName, i.date, i.dueDate, i.amount, i.status
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "invoices.csv";
    link.click();
  };

  const handleDownloadPDF = async (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingInvoice(inv);
    // Logic continues in useEffect to wait for render
  };

  // Effect to capture PDF once the template is rendered
  useEffect(() => {
    if (downloadingInvoice) {
      const element = document.getElementById('pdf-target');
      if (element) {
        html2canvas(element, { scale: 2 }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${downloadingInvoice.invoiceNumber}.pdf`);
          setDownloadingInvoice(null);
          dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'PDF Downloaded' } });
        });
      }
    }
  }, [downloadingInvoice, dispatch]);

  const handleBulkDownload = () => {
     if (selectedRows.size === 0) return;
     dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'info', message: `Preparing ${selectedRows.size} PDFs for download... (Mock)` } });
  };

  return (
    <div className="space-y-6 relative">
      {paymentModalOpen && (
        <PaymentModal 
          invoiceId={paymentModalOpen} 
          onClose={() => setPaymentModalOpen(null)} 
        />
      )}

      {/* Hidden Container for PDF Generation */}
      {downloadingInvoice && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[800px]">
          <InvoiceTemplate id="pdf-target" data={downloadingInvoice} />
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">Manage customer billing and payments.</p>
        </div>
        <button 
          onClick={() => navigate('/invoices/create')}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 flex items-center font-medium"
        >
          <span className="material-icons text-sm mr-2">add</span>
          <span className="hidden sm:inline">Create Invoice</span>
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hidden md:block">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-500 font-medium">{filtered.length} Total Invoices</span>
          <div className="flex space-x-2">
             {selectedRows.size > 0 && (
                <button onClick={handleBulkDownload} className="text-blue-600 hover:text-blue-800 font-medium text-sm mr-4">
                  Download Selected ({selectedRows.size})
                </button>
             )}
             <button onClick={handleExportCSV} className="text-gray-400 hover:text-gray-600" title="Export CSV"><span className="material-icons">download</span></button>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 w-12">
                   <input type="checkbox" onChange={toggleAll} checked={selectedRows.size === filtered.length && filtered.length > 0} />
                </th>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={selectedRows.has(inv.id)} onChange={() => toggleSelection(inv.id)} />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4">{inv.customerName}</td>
                  <td className="px-6 py-4 text-gray-500">{inv.date}</td>
                  <td className="px-6 py-4 text-gray-500">{inv.dueDate}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium">{formatINR(inv.amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleDownloadPDF(inv, e)}
                        className="text-gray-500 hover:bg-gray-100 p-1 rounded" 
                        title="Download PDF"
                      >
                        <span className="material-icons text-lg">picture_as_pdf</span>
                      </button>
                      <button 
                        onClick={(e) => handleDelete(inv.id, e)}
                        className={`p-1 rounded ${canDelete ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                        title={canDelete ? "Delete" : "Restricted"}
                      >
                        <span className="material-icons text-lg">delete</span>
                      </button>
                      {inv.status === 'draft' && (
                        <button 
                          onClick={(e) => handleSend(inv.id, e)}
                          className="text-blue-600 hover:bg-blue-50 p-1 rounded" 
                          title="Send Invoice"
                        >
                          <span className="material-icons text-lg">send</span>
                        </button>
                      )}
                      {inv.status !== 'paid' && inv.status !== 'draft' && (
                         <button 
                           onClick={() => setPaymentModalOpen(inv.id)}
                           className="text-green-600 hover:bg-green-50 p-1 rounded" 
                           title="Record Payment"
                         >
                           <span className="material-icons text-lg">payments</span>
                         </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filtered.map(inv => (
          <div key={inv.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-gray-900">{inv.invoiceNumber}</p>
                <p className="text-sm text-gray-600">{inv.customerName}</p>
              </div>
              <StatusBadge status={inv.status} />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-4">
              <div>
                <span className="block text-xs uppercase text-gray-400">Date</span>
                {inv.date}
              </div>
              <div className="text-right">
                <span className="block text-xs uppercase text-gray-400">Amount</span>
                <span className="font-bold text-gray-900">{formatINR(inv.amount)}</span>
              </div>
            </div>

            {/* Mobile Actions Toolbar */}
            <div className="flex border-t border-gray-100 pt-3 mt-2">
               {inv.status !== 'paid' && (
                 <button 
                   onClick={() => setPaymentModalOpen(inv.id)}
                   className="flex-1 flex items-center justify-center text-green-600 font-medium text-sm py-2 hover:bg-green-50 rounded"
                 >
                   <span className="material-icons text-sm mr-1">payments</span> Pay
                 </button>
               )}
               <button 
                 onClick={(e) => handleDownloadPDF(inv, e)}
                 className="flex-1 flex items-center justify-center text-gray-600 font-medium text-sm py-2 hover:bg-gray-50 rounded"
               >
                 <span className="material-icons text-sm mr-1">download</span> PDF
               </button>
               {inv.status === 'draft' && (
                  <button 
                    onClick={(e) => handleSend(inv.id, e)}
                    className="flex-1 flex items-center justify-center text-blue-600 font-medium text-sm py-2 hover:bg-blue-50 rounded"
                  >
                    <span className="material-icons text-sm mr-1">send</span> Send
                  </button>
               )}
               {canDelete && (
                  <button 
                    onClick={(e) => handleDelete(inv.id, e)}
                    className="flex-none px-4 flex items-center justify-center text-red-500 hover:bg-red-50 rounded"
                  >
                    <span className="material-icons text-sm">delete</span>
                  </button>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceList;
