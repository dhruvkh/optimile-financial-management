import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp, formatINR } from '../App';
import { Invoice, InvoiceStatus, Transaction, Booking, Customer } from '../types';
import { InvoiceTemplate } from './InvoiceTemplate';
import PaymentModal from './PaymentModal';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// --- Types ---
type Tab = 'pending' | 'invoice' | 'ledger';
type SortKey = 'date' | 'dueDate' | 'amount' | 'invoiceNumber';
type DisplayStatus = 'Paid' | 'Overdue' | 'Partially paid' | 'Unpaid';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface DerivedInvoice extends Invoice {
  paidAmount: number;
  balanceAmount: number;
  overdueDays: number;
  displayStatus: DisplayStatus;
}

interface LedgerEntry {
  id: string;
  date: string;
  invoiceId?: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  entryType: 'Manual' | 'Auto' | 'Adjustment';
  category: string;
  credit: number;
  debit: number;
  balance: number;
  shortPayment?: number;
  showShortPayment?: boolean; // Controls visibility (only on latest row)
  isLinkedToPrevious?: boolean; // New Flag for UI grouping
}

// --- Helpers ---
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).replace(/\//g, '-');
};

const calculateDaysDiff = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
};

const calculateDSO = (invoices: Invoice[], currentBalance: number) => {
  // Simple DSO Calculation: (Total Receivables / Total Credit Sales) * Number of Days
  // Using a 90-day lookback period for "Current DSO"
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const salesLast90Days = invoices
    .filter(i => new Date(i.date) >= ninetyDaysAgo)
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (salesLast90Days === 0) return 0;
  
  // DSO = (Receivables / Sales) * Period
  return Math.round((currentBalance / salesLast90Days) * 90);
};

// --- Sub-Components ---

const StatusBadge: React.FC<{ status: DisplayStatus }> = ({ status }) => {
  const styles: Record<DisplayStatus, string> = {
    'Paid': 'bg-green-100 text-green-800 border border-green-200',
    'Partially paid': 'bg-blue-100 text-blue-800 border border-blue-200',
    'Unpaid': 'bg-amber-100 text-amber-800 border border-amber-200',
    'Overdue': 'bg-red-100 text-red-800 border border-red-200',
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status] || styles['Unpaid']}`}>
      {status}
    </span>
  );
};

const CustomerProfileCard: React.FC<{ customer: Customer; invoices: Invoice[]; currentExposure: number }> = ({ customer, invoices, currentExposure }) => {
  // Strategic Fields from Data Model
  const assignedRM = customer.relationshipManager || 'Unassigned';
  
  const paymentTerms = customer.paymentTerms ? `Net ${customer.paymentTerms} Days` : 'Net 30 Days';
  const tdsRate = customer.tdsRate ? `${customer.tdsRate.toFixed(1)}%` : "2.0%"; 
  
  const contactName = customer.contactPerson || `Mr. ${customer.name.split(' ')[0]} Admin`;
  const mobile = customer.phone || '+91 9800000000';

  const remainingLimit = customer.creditLimit - currentExposure;
  const utilization = customer.creditLimit > 0 ? (currentExposure / customer.creditLimit) * 100 : 0;
  const isCritical = remainingLimit < 0;
  
  // Credit Health Logic
  let healthColor = 'bg-green-500';
  let healthTextColor = 'text-green-600';
  if (utilization > 90) {
    healthColor = 'bg-red-600';
    healthTextColor = 'text-red-600';
  } else if (utilization > 70) {
    healthColor = 'bg-amber-500';
    healthTextColor = 'text-amber-600';
  }

  // DSO Logic
  const dso = calculateDSO(invoices, currentExposure);
  const termDays = customer.paymentTerms || 30;
  const isDSOPoor = dso > termDays + 5; // 5 days grace logic

  return (
    <div className={`rounded-lg shadow-sm border mb-6 relative overflow-hidden transition-all animate-fade-in ${isCritical ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 border-l-4 border-l-blue-500'}`}>
      
      {/* Critical Exposure Guardrail Banner */}
      {isCritical && (
        <div className="bg-red-600 text-white px-6 py-2 text-sm font-bold flex items-center justify-between animate-pulse">
          <div className="flex items-center">
            <span className="material-icons mr-2">gpp_bad</span>
            CRITICAL: Capital Exposure Limit Exceeded for {customer.name}
          </div>
          <span>Over by {formatINR(Math.abs(remainingLimit))}</span>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Column 1: Identity */}
        <div className="border-r border-gray-200/50 pr-4">
          <h2 className="text-xl font-bold text-gray-900 truncate" title={customer.name}>{customer.name}</h2>
          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded mt-1 font-mono tracking-wider">{customer.id.toUpperCase()}</span>
          <div className="mt-3">
             <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Relationship Manager</p>
             <div className="flex items-center mt-1">
               <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold mr-2">
                 {assignedRM.charAt(0)}
               </div>
               <span className="text-sm text-gray-700 font-medium">{assignedRM}</span>
             </div>
          </div>
        </div>

        {/* Column 2: Contact & Address */}
        <div className="border-r border-gray-200/50 pr-4">
           <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Contact Information</h3>
           <div className="space-y-2 text-sm">
             <div className="flex items-start text-gray-700">
               <span className="material-icons text-gray-400 text-sm mr-2 mt-0.5">person</span>
               <span className="font-medium">{contactName}</span>
             </div>
             <div className="flex items-center text-gray-700">
               <span className="material-icons text-gray-400 text-sm mr-2">phone</span>
               {mobile}
             </div>
             <div className="flex items-center text-gray-700">
               <span className="material-icons text-gray-400 text-sm mr-2">email</span>
               <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline truncate max-w-[180px]">{customer.email}</a>
             </div>
             <div className="flex items-start text-gray-700 mt-2">
               <span className="material-icons text-gray-400 text-sm mr-2 mt-0.5">place</span>
               <span className="text-xs text-gray-600 leading-tight">{customer.address || "123, Industrial Estate, Mumbai, MH - 400001"}</span>
             </div>
           </div>
        </div>

        {/* Column 3: Contractual & Operations */}
        <div className="border-r border-gray-200/50 pr-4">
           <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Contractual Terms</h3>
           <div className="space-y-2 text-sm">
             <div className="flex justify-between">
               <span className="text-gray-500 text-xs">GSTIN:</span>
               <span className="font-mono font-medium text-gray-800">{customer.taxId}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-gray-500 text-xs">Payment Terms:</span>
               <span className="font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">{paymentTerms}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-gray-500 text-xs">TDS Rate:</span>
               <span className="font-medium text-gray-800">{tdsRate}</span>
             </div>
             <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
               <span className="text-gray-500 text-xs" title="Days Sales Outstanding">Avg DSO:</span>
               <span className={`font-bold ${isDSOPoor ? 'text-red-600' : 'text-green-600'}`}>
                 {dso} Days
               </span>
             </div>
           </div>
        </div>

        {/* Column 4: Financial Guardrails */}
        <div>
           <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Capital Exposure</h3>
           <div className={`p-3 rounded-md border ${isCritical ? 'bg-white border-red-200 shadow-inner' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Credit Limit:</span>
                <span className="font-bold text-gray-900">{formatINR(customer.creditLimit)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500 font-medium">Current Exposure:</span>
                <span className={`font-bold ${healthTextColor}`}>
                  {formatINR(currentExposure)}
                </span>
              </div>
              <div className="flex justify-between text-xs mb-2 pt-2 border-t border-gray-200/50">
                <span className="text-gray-500">Remaining Limit:</span>
                <span className={`font-bold ${remainingLimit < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {formatINR(remainingLimit)}
                </span>
              </div>
              
              {/* Credit Health Bar */}
              <div className="relative pt-1">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden relative">
                  <div 
                    className={`h-2 rounded-full transition-all duration-700 ease-out ${healthColor}`} 
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  ></div>
                </div>
                {/* Visual Ticks */}
                <div className="absolute top-1 left-[70%] h-2 w-px bg-white opacity-70" title="70% Warning"></div>
                <div className="absolute top-1 left-[90%] h-2 w-px bg-white opacity-70" title="90% Critical"></div>
              </div>
              <div className="text-[10px] text-gray-400 mt-1 text-right">{utilization.toFixed(1)}% Used</div>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Modals ---

const CustomerDetailModal: React.FC<{ invoice: Invoice; onClose: () => void; onDownload: () => void }> = ({ invoice, onClose, onDownload }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
       <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h3 className="font-bold text-gray-800">Invoice Preview: {invoice.invoiceNumber}</h3>
          <div className="flex space-x-2">
            <button onClick={onDownload} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-medium flex items-center">
              <span className="material-icons text-sm mr-1">download</span> Download PDF
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <span className="material-icons">close</span>
            </button>
          </div>
       </div>
       <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <InvoiceTemplate data={invoice} />
       </div>
    </div>
  </div>
);

const EmailModal: React.FC<{ invoice: Invoice; onClose: () => void; onSend: () => void }> = ({ invoice, onClose, onSend }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
       <h3 className="text-lg font-bold text-gray-900 mb-4">Send Invoice via Email</h3>
       <div className="space-y-4">
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
           <input type="email" readOnly value={`billing@${invoice.customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`} className="w-full bg-gray-100 border-gray-300 rounded-md p-2 text-gray-600" />
         </div>
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
           <input type="text" defaultValue={`Invoice ${invoice.invoiceNumber} from Optimile`} className="w-full border-gray-300 rounded-md p-2" />
         </div>
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
           <textarea className="w-full border-gray-300 rounded-md p-2 h-24 text-sm" defaultValue={`Dear Customer,\n\nPlease find attached invoice ${invoice.invoiceNumber} for ${formatINR(invoice.amount)}.\n\nRegards,\nOptimile Team`}></textarea>
         </div>
         <div className="flex justify-end space-x-3 pt-4">
           <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-50 border rounded">Cancel</button>
           <button onClick={onSend} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center">
             <span className="material-icons text-sm mr-2">send</span> Send
           </button>
         </div>
       </div>
    </div>
  </div>
);

const ReminderConfirmationModal: React.FC<{ selectedInvoices: any[]; onClose: () => void; onConfirm: () => void }> = ({ selectedInvoices, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center mb-4 text-orange-600">
         <span className="material-icons mr-2">campaign</span>
         <h3 className="text-lg font-bold">Send Payment Reminders?</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">
        You are about to send automated payment reminders for <strong>{selectedInvoices.length} invoices</strong>.
      </p>
      <div className="bg-gray-50 p-3 rounded text-xs text-gray-500 mb-6 max-h-32 overflow-y-auto">
        {selectedInvoices.map(i => (
          <div key={i.id} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
             <span>{i.invoiceNumber}</span>
             <span className="font-medium">{formatINR(i.balanceAmount)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end space-x-3">
         <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-50 border rounded">Cancel</button>
         <button onClick={onConfirm} className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded font-medium">
           Confirm & Send
         </button>
      </div>
    </div>
  </div>
);

const CustomerLedger: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'desc' });
  
  // --- Core State: Global Customer Selection ---
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all'); 
  // Sync local input for the datalist
  const [customerInputValue, setCustomerInputValue] = useState(''); 

  // Advanced Filters State (Secondary)
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DisplayStatus[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [minOverdue, setMinOverdue] = useState<number | ''>('');

  // Handle nav state params
  useEffect(() => {
    if (location.state) {
      const s = location.state as any;
      if (s.minOverdueDays) {
         setMinOverdue(s.minOverdueDays);
         setShowFilters(true);
      }
      if (s.statusFilter === 'overdue') {
         setFilterStatus(['Overdue']);
         setShowFilters(true);
      }
      if (s.searchQuery) { // If coming from global search
         const found = state.customers.find(c => c.name.toLowerCase().includes(s.searchQuery.toLowerCase()));
         if (found) {
            setSelectedCustomerId(found.id);
            setCustomerInputValue(found.name);
         }
      }
    }
  }, [location.state, state.customers]);

  // Derived Values
  const selectedCustomer = useMemo(() => 
    state.customers.find(c => c.id === selectedCustomerId), 
  [selectedCustomerId, state.customers]);

  // Modal & Action States
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [emailModalInvoice, setEmailModalInvoice] = useState<Invoice | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);
  const [paymentModalInvoiceId, setPaymentModalInvoiceId] = useState<string | null>(null);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);

  // --- Logic: Invoice Processing ---
  const deriveInvoiceData = (inv: Invoice): DerivedInvoice => {
    let paid = inv.paidAmount !== undefined ? inv.paidAmount : 0;
    const adjustments = inv.adjustments || 0;
    
    // Mock simulation for missing data
    if (inv.paidAmount === undefined) {
      if (inv.status === 'paid') paid = inv.amount;
      else if (inv.status === 'sent') {
         const sum = inv.id.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
         if (sum % 3 === 0) paid = Math.floor(inv.amount * 0.4); 
      }
    }

    let balance = inv.amount - (paid + adjustments);
    if (balance < 0) balance = 0; 

    const due = new Date(inv.dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const overdueDays = balance > 0 && diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    let displayStatus: DisplayStatus = 'Unpaid';
    if (balance <= 5) displayStatus = 'Paid';
    else if (balance > 0 && overdueDays > 0) displayStatus = 'Overdue';
    else if ((paid > 0 || adjustments > 0) && balance > 0) displayStatus = 'Partially paid';
    else displayStatus = 'Unpaid';

    return { ...inv, paidAmount: paid, balanceAmount: balance, overdueDays, displayStatus };
  };

  const filteredInvoiceData = useMemo(() => {
    let data = state.invoices.map(deriveInvoiceData);

    // 1. Primary Global Filter (Customer)
    if (selectedCustomerId !== 'all') {
      data = data.filter(i => i.customerId === selectedCustomerId);
    }

    // 2. Secondary Advanced Filters (Only active on Invoice Tab)
    if (activeTab === 'invoice') {
       if (filterStatus.length > 0) {
         data = data.filter(i => filterStatus.includes(i.displayStatus));
       }
       if (dateRange.start) {
         data = data.filter(i => i.date >= dateRange.start);
       }
       if (dateRange.end) {
         data = data.filter(i => i.date <= dateRange.end);
       }
       if (minOverdue !== '') {
         data = data.filter(i => i.overdueDays >= Number(minOverdue));
       }
    }

    // 3. Search
    if (localSearch) {
      const q = localSearch.toLowerCase();
      data = data.filter(i => 
        i.invoiceNumber.toLowerCase().includes(q) || 
        (selectedCustomerId === 'all' && i.customerName.toLowerCase().includes(q)) ||
        i.date.includes(q)
      );
    }

    // 4. Sorting
    if (sortConfig && activeTab !== 'pending') {
      data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [state.invoices, activeTab, localSearch, sortConfig, selectedCustomerId, filterStatus, dateRange, minOverdue]);

  const invoiceSummary = useMemo(() => {
    return filteredInvoiceData.reduce((acc, curr) => ({
      total: acc.total + curr.amount,
      paid: acc.paid + curr.paidAmount + (curr.adjustments || 0), 
      balance: acc.balance + curr.balanceAmount,
      overdue: acc.overdue + (curr.overdueDays > 0 ? curr.balanceAmount : 0)
    }), { total: 0, paid: 0, balance: 0, overdue: 0 });
  }, [filteredInvoiceData]);

  // NEW: Get all invoices for this customer to calculate true global exposure for the Profile Card
  // This ensures profile stats are accurate even when user filters the table view
  const customerAllInvoices = useMemo(() => {
    if (selectedCustomerId === 'all') return [];
    return state.invoices.filter(i => i.customerId === selectedCustomerId);
  }, [state.invoices, selectedCustomerId]);

  const customerExposure = useMemo(() => {
    return customerAllInvoices.reduce((acc, inv) => {
      const paid = inv.paidAmount || 0;
      const adj = inv.adjustments || 0;
      const bal = Math.max(0, inv.amount - paid - adj);
      return acc + bal;
    }, 0);
  }, [customerAllInvoices]);

  // --- Logic: Pending Bookings ---
  const pendingBookings = useMemo(() => {
    let data = state.bookings.filter(b => b.status === 'pending');
    
    if (selectedCustomerId !== 'all') {
      data = data.filter(b => b.customerId === selectedCustomerId);
    }

    if (localSearch) {
      const q = localSearch.toLowerCase();
      data = data.filter(b => 
        b.id.toLowerCase().includes(q) ||
        b.vehicleId.toLowerCase().includes(q) ||
        b.origin.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q)
      );
    }
    data.sort((a,b) => new Date(a.completedDate).getTime() - new Date(b.completedDate).getTime());
    return data;
  }, [state.bookings, localSearch, selectedCustomerId]);

  // --- Logic: Ledger Data ---
  const ledgerData = useMemo(() => {
    const relevantInvoices = selectedCustomerId === 'all' 
      ? state.invoices 
      : state.invoices.filter(i => i.customerId === selectedCustomerId);

    const invoiceEntries: LedgerEntry[] = relevantInvoices.map(inv => {
      // Note: Document-Level Short Payment is irrelevant here due to visibility logic update
      // We will calculate it dynamically in transactions or hide it for invoices
      
      return {
        id: `led_inv_${inv.id}`,
        date: inv.date, 
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customerName,
        entryType: 'Auto',
        category: 'Invoice',
        credit: 0,
        debit: inv.amount, // Gross Invoice Value (Verified)
        balance: 0,
        shortPayment: 0 // Will be hidden by logic
      };
    });

    const relevantTransactions = selectedCustomerId === 'all'
      ? state.transactions
      : state.transactions.filter(t => t.customerId === selectedCustomerId);

    const transactionEntries: LedgerEntry[] = relevantTransactions
      .filter(t => t.customerId) 
      .map(t => {
        const linkedInv = state.invoices.find(i => i.id === t.referenceId);
        const categoryName = t.description.split(' - ')[0];
        const isAdjustment = ['TDS', 'Discount', 'Adjustment', 'Credit note'].includes(categoryName);
        const isTDS = categoryName.includes('TDS');
        
        // Calculate Short Payment State relative to the linked invoice
        // This effectively represents the "Resulting Short Payment" after this transaction is considered
        // because we use the *current* state of the invoice which includes this payment.
        let shortPayment = 0;
        if (linkedInv && (t.type === 'credit' || isAdjustment)) {
           const invPaid = linkedInv.paidAmount || 0;
           const invAdj = linkedInv.adjustments || 0;
           const totalCredits = invPaid + invAdj;
           const currentBalance = linkedInv.amount - totalCredits;
           // Zero Balance Rule: Apply tolerance for float issues
           shortPayment = currentBalance > 1 ? currentBalance : 0;
        }

        return {
          id: `led_tx_${t.id}`,
          date: t.date,
          invoiceId: linkedInv?.id,
          invoiceNumber: linkedInv?.invoiceNumber || '-',
          customerId: t.customerId!,
          customerName: linkedInv?.customerName || 'Unknown',
          entryType: isAdjustment ? 'Adjustment' : 'Manual',
          category: t.description, // Use full description for detail
          credit: t.type === 'credit' ? t.amount : 0,
          debit: t.type === 'debit' ? t.amount : 0,
          balance: 0,
          shortPayment: shortPayment,
          isLinkedToPrevious: isTDS // Flag TDS entries as linked
        };
      });

    let allEntries = [...invoiceEntries, ...transactionEntries];
    
    // Sort by Date, then by Creation Time
    allEntries.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      // If dates are same, Invoice first, then Transactions
      if (a.category === 'Invoice' && b.category !== 'Invoice') return -1;
      if (a.category !== 'Invoice' && b.category === 'Invoice') return 1;
      return 0; // Maintain stable sort
    });

    let runningBalance = 0;
    allEntries = allEntries.map(entry => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });

    if (localSearch) {
      const q = localSearch.toLowerCase();
      allEntries = allEntries.filter(e => 
        e.invoiceNumber.toLowerCase().includes(q) || 
        e.category.toLowerCase().includes(q) ||
        (selectedCustomerId === 'all' && e.customerName.toLowerCase().includes(q))
      );
    }

    // Reverse for display (Newest First)
    const reversed = allEntries.reverse();

    // Post-Process: Strict Short Payment Visibility Logic
    // 1. "Any New debits or invoices generated are not part of Short amount received column." -> handled by `shortPayment` calculation using linkedInv.
    // 2. "mention the short amount only in the Short amount received column" when payment is made.
    const seenInvoices = new Set<string>();
    const finalEntries = reversed.map(entry => {
      let showShortPayment = false;
      if (entry.invoiceId) {
        // Only consider the *latest* entry for a specific invoice
        if (!seenInvoices.has(entry.invoiceId)) {
           // Rule: Only show Short Payment on Transaction rows (Payments), NOT on the Invoice row itself.
           // This implies "Short Payment" is a status derived *after* an attempt to pay.
           if (entry.category !== 'Invoice') {
             showShortPayment = true;
           }
           seenInvoices.add(entry.invoiceId);
        }
      }
      return { ...entry, showShortPayment };
    });

    return finalEntries;
  }, [state.invoices, state.transactions, localSearch, selectedCustomerId]);

  const ledgerSummary = useMemo(() => {
    return ledgerData.reduce((acc, curr) => ({
      credit: acc.credit + curr.credit,
      debit: acc.debit + curr.debit,
      balance: (acc.debit + curr.debit) - (acc.credit + curr.credit) 
    }), { credit: 0, debit: 0, balance: 0 });
  }, [ledgerData]);

  // Handlers
  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleSelection = (id: string, isDisabled: boolean = false) => {
    if (isDisabled) return;
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const toggleAll = () => {
    const dataToCheck = activeTab === 'pending' ? pendingBookings.filter(b => b.podVerified) : filteredInvoiceData;
    const allIds = dataToCheck.map(i => i.id);
    const allSelected = allIds.every(id => selectedRows.has(id)) && allIds.length > 0;
    
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(allIds));
  };

  const toggleStatusFilter = (status: DisplayStatus) => {
    if (filterStatus.includes(status)) {
       setFilterStatus(filterStatus.filter(s => s !== status));
    } else {
       setFilterStatus([...filterStatus, status]);
    }
  };

  const handleBulkReminder = () => {
    dispatch({ type: 'SEND_REMINDERS', payload: Array.from(selectedRows) });
    setShowReminderConfirm(false);
    setSelectedRows(new Set());
  };

  const handleGenerateInvoice = () => {
    const selectedBookings = state.bookings.filter(b => selectedRows.has(b.id));
    if (selectedBookings.length === 0) return;
    const uniqueCustomers = new Set(selectedBookings.map(b => b.customerId));
    if (uniqueCustomers.size > 1) {
      alert("Please select trips for the same customer to generate a single invoice.");
      return;
    }
    navigate('/invoices/create', { state: { selectedBookings } });
  };

  const handleExportExcel = () => {
    const isLedger = activeTab === 'ledger';
    const isPending = activeTab === 'pending';
    const filename = `Report_${selectedCustomerId === 'all' ? 'Global' : selectedCustomer?.name.replace(/\s/g,'_')}_${activeTab}.xlsx`;
    
    let worksheet;
    if (isLedger) {
      const exportData = ledgerData.map(e => ({
        Date: e.date,
        'Invoice ID': e.invoiceNumber,
        'Customer': e.customerName,
        'Type': e.entryType,
        'Category': e.category,
        'Debit (Gross)': e.debit,
        'Credit': e.credit,
        'Balance': e.balance,
        'Short Payment': e.shortPayment || 0
      }));
      worksheet = XLSX.utils.json_to_sheet(exportData);
    } else if (isPending) {
      const exportData = pendingBookings.map(b => ({
         'Booking ID': b.id,
         'Customer': b.customerName,
         'Route': `${b.origin} - ${b.destination}`,
         'Vehicle': b.vehicleId,
         'Completed': b.completedDate,
         'Revenue': b.amount,
         'Expense': b.expense,
         'POD Verified': b.podVerified ? 'Yes' : 'No'
      }));
      worksheet = XLSX.utils.json_to_sheet(exportData);
    } else {
      const exportData = filteredInvoiceData.map(i => ({
        'Invoice Number': i.invoiceNumber,
        'Customer': i.customerName,
        'Date': i.date,
        'Due Date': i.dueDate,
        'Status': i.displayStatus,
        'Amount': i.amount,
        'Paid': i.paidAmount,
        'Balance': i.balanceAmount,
      }));
      worksheet = XLSX.utils.json_to_sheet(exportData);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab.toUpperCase());
    XLSX.writeFile(workbook, filename);
  };

  const triggerDownload = (inv: Invoice) => {
    setDownloadingInvoice(inv);
  };

  useEffect(() => {
    if (downloadingInvoice) {
      const element = document.getElementById('ledger-pdf-target');
      if (element) {
        html2canvas(element, { scale: 2, logging: false }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${downloadingInvoice.invoiceNumber}.pdf`);
          setDownloadingInvoice(null);
          dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: 'Download started' } });
        });
      }
    }
  }, [downloadingInvoice, dispatch]);

  useEffect(() => { setSelectedRows(new Set()); }, [activeTab, selectedCustomerId]);

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerInputValue(val);
    const matched = state.customers.find(c => c.name === val);
    if (matched) {
      setSelectedCustomerId(matched.id);
    } else if (val === '') {
      setSelectedCustomerId('all');
    }
  };

  const clearCustomerSelection = () => {
    setSelectedCustomerId('all');
    setCustomerInputValue('');
  };

  return (
    <div className="space-y-6 relative">
      {/* Hidden PDF Target */}
      {downloadingInvoice && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[800px]">
          <InvoiceTemplate id="ledger-pdf-target" data={downloadingInvoice} />
        </div>
      )}

      {/* Modals */}
      {paymentModalInvoiceId && (
        <PaymentModal 
          invoiceId={paymentModalInvoiceId !== 'general' ? paymentModalInvoiceId : null}
          onClose={() => setPaymentModalInvoiceId(null)} 
        />
      )}
      
      {previewInvoice && (
        <CustomerDetailModal 
          invoice={previewInvoice} 
          onClose={() => setPreviewInvoice(null)} 
          onDownload={() => triggerDownload(previewInvoice)}
        />
      )}
      
      {emailModalInvoice && (
        <EmailModal 
          invoice={emailModalInvoice} 
          onClose={() => setEmailModalInvoice(null)}
          onSend={() => {
            dispatch({ type: 'ADD_NOTIFICATION', payload: { type: 'success', message: `Email sent to ${emailModalInvoice.customerName}` } });
            setEmailModalInvoice(null);
          }}
        />
      )}

      {showReminderConfirm && (
        <ReminderConfirmationModal 
           selectedInvoices={filteredInvoiceData.filter(i => selectedRows.has(i.id))}
           onClose={() => setShowReminderConfirm(false)}
           onConfirm={handleBulkReminder}
        />
      )}

      <div className="flex flex-col space-y-4">
        {/* Top-Level Global Navigation & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
             <h1 className="text-2xl font-bold text-gray-900">Customer Ledger</h1>
             <p className="text-sm text-gray-500">Track invoices, payments, and account history.</p>
           </div>
           
           {/* Universal Customer Search */}
           <div className="relative w-full md:w-96">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Customer Portfolio</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons text-gray-400">search</span>
                </span>
                <input 
                  list="global-customer-list"
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm font-medium"
                  placeholder="Type to search all customers..."
                  value={customerInputValue}
                  onChange={handleCustomerSelect}
                />
                {selectedCustomerId !== 'all' && (
                  <button 
                    onClick={clearCustomerSelection}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                )}
                <datalist id="global-customer-list">
                  {state.customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
           </div>
        </div>
        
        {/* Tabbed Sub-Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('pending')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Pending invoice</button>
            <button onClick={() => setActiveTab('invoice')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'invoice' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Invoice</button>
            <button onClick={() => setActiveTab('ledger')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Ledger</button>
          </nav>
        </div>
      </div>

      {/* Dynamic Customer Profile Header - Only when specific customer selected */}
      {selectedCustomerId !== 'all' && selectedCustomer && (
         <CustomerProfileCard 
            customer={selectedCustomer} 
            currentExposure={customerExposure}
            invoices={customerAllInvoices}
         />
      )}

      {/* Secondary Filter Panel (Expandable) - Visible only on Invoice Tab */}
      {activeTab === 'invoice' && showFilters && (
         <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Status Toggles */}
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
               <div className="flex flex-wrap gap-2">
                 {(['Unpaid', 'Overdue', 'Partially paid', 'Paid'] as DisplayStatus[]).map(s => (
                   <button
                     key={s}
                     onClick={() => toggleStatusFilter(s)}
                     className={`px-2 py-1 text-xs rounded border transition-colors ${
                       filterStatus.includes(s) 
                         ? 'bg-blue-100 border-blue-300 text-blue-800' 
                         : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                     }`}
                   >
                     {s}
                   </button>
                 ))}
               </div>
            </div>

            {/* Date Range */}
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice Date Range</label>
               <div className="flex space-x-2">
                 <input 
                   type="date" 
                   className="w-full border-gray-300 rounded-md shadow-sm p-1 text-xs"
                   value={dateRange.start}
                   onChange={e => setDateRange({...dateRange, start: e.target.value})}
                 />
                 <span className="text-gray-400 self-center">-</span>
                 <input 
                   type="date" 
                   className="w-full border-gray-300 rounded-md shadow-sm p-1 text-xs"
                   value={dateRange.end}
                   onChange={e => setDateRange({...dateRange, end: e.target.value})}
                 />
               </div>
            </div>

            {/* Overdue Filter */}
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Overdue Days</label>
               <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">&gt;</span>
                  <input 
                    type="number" 
                    placeholder="e.g. 30"
                    className="w-20 border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={minOverdue}
                    onChange={e => setMinOverdue(e.target.value ? Number(e.target.value) : '')}
                  />
                  <span className="text-sm text-gray-500 ml-2">days</span>
               </div>
            </div>
         </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons text-gray-400 text-lg">search</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            placeholder={activeTab === 'ledger' ? "Filter transactions..." : activeTab === 'pending' ? "Search trips..." : "Search invoice #..."}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto pb-1">
          {activeTab === 'pending' && selectedRows.size > 0 && (
             <button 
               onClick={handleGenerateInvoice}
               className="flex items-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700 animate-fade-in whitespace-nowrap"
             >
               <span className="material-icons text-lg mr-2">receipt_long</span>
               Generate Invoice ({selectedRows.size})
             </button>
          )}

          {activeTab === 'invoice' && selectedRows.size > 0 && (
                <button 
                  onClick={() => setShowReminderConfirm(true)}
                  className="flex items-center px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-md text-sm font-medium hover:bg-orange-100 transition-colors animate-fade-in whitespace-nowrap"
                >
                  <span className="material-icons text-lg mr-2">campaign</span>
                  Send Reminders ({selectedRows.size})
                </button>
          )}

          {activeTab === 'invoice' && (
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                 showFilters ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="material-icons text-lg mr-2">filter_list</span>
              Filters
              {(filterStatus.length > 0 || minOverdue !== '' || dateRange.start) && (
                 <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>
          )}

          {activeTab === 'invoice' && (
              <button 
                onClick={() => setPaymentModalInvoiceId('general')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-green-700 whitespace-nowrap"
              >
                <span className="material-icons text-lg mr-2">payments</span>
                Record Payment
              </button>
          )}

          <button 
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 group whitespace-nowrap"
            title="Export Excel"
          >
             <span className="material-icons text-lg mr-2 text-green-600">table_view</span>
             Export
          </button>
        </div>
      </div>

      {/* VIEW 1: PENDING INVOICES (UNBILLED TRIPS) */}
      {activeTab === 'pending' && (
        <>
           <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm mb-4">
             <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-2 text-blue-600 mr-3"><span className="material-icons">local_shipping</span></div>
                <div>
                   <p className="text-xs font-bold text-gray-500 uppercase">Pending Bookings</p>
                   <p className="text-xl font-bold text-gray-900">{pendingBookings.length}</p>
                </div>
             </div>
             <div className="flex items-center border-l border-gray-200 pl-4">
                <div className="bg-green-100 rounded-full p-2 text-green-600 mr-3"><span className="material-icons">attach_money</span></div>
                <div>
                   <p className="text-xs font-bold text-gray-500 uppercase">Unbilled Revenue</p>
                   <p className="text-xl font-bold text-gray-900">{formatINR(pendingBookings.reduce((a,b)=>a+b.amount,0))}</p>
                </div>
             </div>
             <div className="flex items-center border-l border-gray-200 pl-4">
                <div className="bg-red-100 rounded-full p-2 text-red-600 mr-3"><span className="material-icons">history</span></div>
                <div>
                   <p className="text-xs font-bold text-gray-500 uppercase">Oldest Pending</p>
                   <p className="text-xl font-bold text-gray-900">
                     {pendingBookings.length > 0 ? calculateDaysDiff(pendingBookings[0].completedDate) : 0} days
                   </p>
                </div>
             </div>
           </div>

           <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
             <div className="overflow-x-auto min-h-[400px]">
               <table className="w-full text-sm text-left whitespace-nowrap">
                 <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                   <tr>
                     <th className="px-6 py-4 w-10">
                       <input 
                         type="checkbox" 
                         className="rounded border-gray-300 text-primary focus:ring-primary"
                         onChange={toggleAll}
                         checked={selectedRows.size > 0 && pendingBookings.filter(b => b.podVerified).every(b => selectedRows.has(b.id))}
                       />
                     </th>
                     <th className="px-6 py-4 sticky left-0 bg-gray-50 z-10 shadow-sm">Booking ID</th>
                     {/* Conditionally Show Customer Name if Global View */}
                     {selectedCustomerId === 'all' && <th className="px-6 py-4">Customer</th>}
                     <th className="px-6 py-4">Origin - Destination</th>
                     <th className="px-6 py-4">Distance</th>
                     <th className="px-6 py-4">Vehicle</th>
                     <th className="px-6 py-4">Driver</th>
                     <th className="px-6 py-4">Completed On</th>
                     <th className="px-6 py-4 text-right">Revenue</th>
                     <th className="px-6 py-4 text-right">Expense</th>
                     <th className="px-6 py-4 text-right">Profit</th>
                     <th className="px-6 py-4 text-center">POD</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {pendingBookings.length === 0 ? (
                     <tr><td colSpan={12} className="px-6 py-12 text-center text-gray-500">No pending bookings found.</td></tr>
                   ) : (
                     pendingBookings.map(b => {
                        const profit = b.amount - b.expense;
                        const profitMargin = (profit / b.amount) * 100;
                        const vehicle = state.vehicles.find(v => v.id === b.vehicleId);
                        
                        return (
                          <tr key={b.id} className={`hover:bg-blue-50 transition-colors ${selectedRows.has(b.id) ? 'bg-blue-50' : ''}`}>
                             <td className="px-6 py-4">
                               <input 
                                 type="checkbox" 
                                 className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                                 checked={selectedRows.has(b.id)}
                                 onChange={() => toggleSelection(b.id, !b.podVerified)}
                                 disabled={!b.podVerified}
                               />
                             </td>
                             <td className="px-6 py-4 font-medium text-primary sticky left-0 bg-white z-10 group-hover:bg-blue-50">{b.id}</td>
                             {selectedCustomerId === 'all' && (
                               <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={b.customerName}>{b.customerName}</td>
                             )}
                             <td className="px-6 py-4 text-gray-700">
                                <div className="flex flex-col">
                                   <span className="font-medium">{b.origin}</span>
                                   <span className="text-gray-400 text-xs">to</span>
                                   <span className="font-medium">{b.destination}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-gray-600">{b.distance} km</td>
                             <td className="px-6 py-4 text-gray-800 font-medium">{vehicle?.regNumber || b.vehicleId}</td>
                             <td className="px-6 py-4">
                                <div className="flex flex-col">
                                   <span>{b.driverName}</span>
                                   <span className="text-xs text-gray-500">{b.driverPhone}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-gray-600">
                                {formatDateTime(b.completedDate)}
                             </td>
                             <td className="px-6 py-4 text-right font-bold text-gray-900">{formatINR(b.amount)}</td>
                             <td className="px-6 py-4 text-right text-gray-600">{formatINR(b.expense)}</td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end">
                                   <span className={`text-xs font-bold px-2 py-0.5 rounded ${profit > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {profitMargin.toFixed(1)}%
                                   </span>
                                   <span className="material-icons text-sm ml-1 text-gray-400">
                                      {profitMargin > 15 ? 'trending_up' : profitMargin < 0 ? 'trending_down' : 'remove'}
                                   </span>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-center">
                                {b.podVerified ? (
                                   <button className="text-green-600 hover:text-green-800" title="Verified POD">
                                      <span className="material-icons">verified</span>
                                   </button>
                                ) : (
                                   <div className="flex items-center justify-center space-x-1" title="POD Pending/Unverified">
                                      <span className="material-icons text-gray-300">description</span>
                                      <span className="text-xs text-red-500 font-bold">!</span>
                                   </div>
                                )}
                             </td>
                          </tr>
                        );
                     })
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </>
      )}

      {/* VIEW 2: INVOICE LIST */}
      {activeTab === 'invoice' && (
        <>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 shadow-sm mb-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total invoice amount</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatINR(invoiceSummary.total)}</p>
            </div>
            <div className="border-l border-gray-200 pl-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total paid amount</p>
              <p className="text-lg font-bold text-green-600 mt-1">{formatINR(invoiceSummary.paid)}</p>
            </div>
            <div className="border-l border-gray-200 pl-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total balance amount</p>
              <p className="text-lg font-bold text-blue-600 mt-1">{formatINR(invoiceSummary.balance)}</p>
            </div>
            <div className="border-l border-gray-200 pl-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total overdue amount</p>
              <p className="text-lg font-bold text-red-600 mt-1">{formatINR(invoiceSummary.overdue)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        onChange={toggleAll} 
                        checked={selectedRows.size === filteredInvoiceData.length && filteredInvoiceData.length > 0} 
                      />
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 group"
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      <div className="flex items-center">
                        Invoice ID
                        {sortConfig?.key === 'invoiceNumber' && <span className="material-icons text-xs ml-1">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                      </div>
                    </th>
                    {/* Conditionally Show Customer Name if Global View */}
                    {selectedCustomerId === 'all' && (
                       <th className="px-6 py-4">Customer</th>
                    )}
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 group"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Invoiced on
                        {sortConfig?.key === 'date' && <span className="material-icons text-xs ml-1">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-gray-100 group"
                      onClick={() => handleSort('dueDate')}
                    >
                      <div className="flex items-center">
                        Due on
                        {sortConfig?.key === 'dueDate' && <span className="material-icons text-xs ml-1">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center">Overdue days</th>
                    <th 
                      className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 group"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-end">
                        Invoice amount
                        {sortConfig?.key === 'amount' && <span className="material-icons text-xs ml-1">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">Paid amount</th>
                    <th className="px-6 py-4 text-right">Balance amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoiceData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                        No invoices found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoiceData.map((inv) => (
                      <tr key={inv.id} className={`hover:bg-blue-50 transition-colors ${selectedRows.has(inv.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            checked={selectedRows.has(inv.id)} 
                            onChange={() => toggleSelection(inv.id)} 
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-primary cursor-pointer hover:underline" onClick={() => setPreviewInvoice(inv)}>
                          {inv.invoiceNumber}
                        </td>
                        {selectedCustomerId === 'all' && (
                           <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={inv.customerName}>
                              {inv.customerName}
                           </td>
                        )}
                        <td className="px-6 py-4 text-gray-500">
                          {formatDate(inv.date)}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {inv.overdueDays > 0 ? (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">{inv.overdueDays}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {formatINR(inv.amount)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {formatINR(inv.paidAmount)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-800">
                          {formatINR(inv.balanceAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={inv.displayStatus} />
                            {inv.lastReminderSent && (
                              <span className="text-[10px] text-orange-600 flex items-center" title={`Reminder sent: ${new Date(inv.lastReminderSent).toLocaleString()}`}>
                                <span className="material-icons text-[10px] mr-1">history</span> Reminder Sent
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2 text-gray-400">
                            {inv.displayStatus !== 'Paid' && (
                               <button 
                                 title="Record Payment" 
                                 className="hover:text-green-600 hover:bg-green-50 p-1 rounded transition-colors"
                                 onClick={() => setPaymentModalInvoiceId(inv.id)}
                               >
                                 <span className="material-icons text-lg">payments</span>
                               </button>
                            )}
                            <button 
                              title="Send Email" 
                              className="hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                              onClick={() => setEmailModalInvoice(inv)}
                            >
                              <span className="material-icons text-lg">email</span>
                            </button>
                            <button 
                              title="Download PDF" 
                              className="hover:text-gray-700 hover:bg-gray-100 p-1 rounded transition-colors"
                              onClick={() => triggerDownload(inv)}
                            >
                              <span className="material-icons text-lg">download</span>
                            </button>
                            <button 
                              title="Preview Invoice" 
                              className="hover:text-primary hover:bg-blue-50 p-1 rounded transition-colors"
                              onClick={() => setPreviewInvoice(inv)}
                            >
                              <span className="material-icons text-lg">visibility</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
               <span>Showing {filteredInvoiceData.length} records</span>
               <div className="flex space-x-1">
                 <button className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50" disabled>Prev</button>
                 <button className="px-2 py-1 border rounded bg-white hover:bg-gray-100">Next</button>
               </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 3: LEDGER HISTORY */}
      {activeTab === 'ledger' && (
        <div className="animate-fade-in">
          {/* Ledger Summary Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
             <div className="flex items-center">
               <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
                 <span className="material-icons">arrow_downward</span>
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-500">Total Credit</p>
                 <p className="text-2xl font-bold text-green-600">{formatINR(ledgerSummary.credit)}</p>
               </div>
             </div>
             <div className="flex items-center border-l border-gray-100 pl-6">
               <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-4">
                 <span className="material-icons">arrow_upward</span>
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-500">Total Debit</p>
                 <p className="text-2xl font-bold text-red-600">{formatINR(ledgerSummary.debit)}</p>
               </div>
             </div>
             <div className="flex items-center border-l border-gray-100 pl-6">
               <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                 <span className="material-icons">account_balance_wallet</span>
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-500">Net Balance</p>
                 <p className="text-2xl font-bold text-gray-900">{formatINR(ledgerData.length > 0 ? ledgerData[0].balance : 0)}</p>
               </div>
             </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                 <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                   <tr>
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Invoice ID</th>
                     {/* Conditionally Show Customer Name if Global View */}
                     {selectedCustomerId === 'all' && <th className="px-6 py-4">Customer Name</th>}
                     <th className="px-6 py-4">Entry Type</th>
                     <th className="px-6 py-4">Category</th>
                     <th className="px-6 py-4 text-right">Credit</th>
                     <th className="px-6 py-4 text-right">Debit (Gross)</th>
                     <th className="px-6 py-4 text-right">Balance</th>
                     <th className="px-6 py-4 text-right">Short Payment</th>
                     <th className="px-6 py-4 text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {ledgerData.length === 0 ? (
                     <tr><td colSpan={10} className="p-8 text-center text-gray-500">No transaction history found.</td></tr>
                   ) : (
                     ledgerData.map(entry => (
                       <tr key={entry.id} className={`hover:bg-gray-50 ${entry.isLinkedToPrevious ? 'bg-blue-50/50' : ''}`}>
                         <td className="px-6 py-4 text-gray-500 font-medium relative">
                           {/* Visual Connector for linked transactions */}
                           {entry.isLinkedToPrevious && (
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-300 rounded-r-md"></div>
                           )}
                           {formatDateTime(entry.date)}
                         </td>
                         <td className="px-6 py-4">
                           {entry.invoiceId ? (
                             <button 
                               onClick={() => {
                                 const inv = state.invoices.find(i => i.id === entry.invoiceId);
                                 if (inv) setPreviewInvoice(inv);
                               }}
                               className="text-primary hover:underline flex items-center"
                             >
                               {entry.invoiceNumber}
                               <span className="material-icons text-xs ml-1">visibility</span>
                             </button>
                           ) : (
                             <span className="text-gray-400">-</span>
                           )}
                         </td>
                         {selectedCustomerId === 'all' && (
                           <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={entry.customerName}>
                             {entry.customerName}
                           </td>
                         )}
                         <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-semibold ${
                             entry.entryType === 'Adjustment' ? 'bg-orange-100 text-orange-800' :
                             entry.entryType === 'Auto' ? 'bg-purple-100 text-purple-700' : 
                             'bg-gray-100 text-gray-700'
                           }`}>
                             {entry.entryType}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={entry.category}>
                           {entry.isLinkedToPrevious && <span className="material-icons text-xs text-blue-400 mr-1 rotate-90" style={{ transform: 'rotate(180deg) translateY(2px)' }}>subdirectory_arrow_right</span>}
                           {entry.category}
                         </td>
                         <td className="px-6 py-4 text-right font-medium text-green-600">
                           {entry.credit > 0 ? formatINR(entry.credit) : '-'}
                         </td>
                         <td className="px-6 py-4 text-right font-medium text-red-600">
                           {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                         </td>
                         <td className="px-6 py-4 text-right font-bold text-gray-900">
                           {formatINR(entry.balance)}
                         </td>
                         <td className="px-6 py-4 text-right">
                           {entry.showShortPayment ? (
                             entry.shortPayment && entry.shortPayment > 0 ? (
                               <span className={`font-medium ${entry.shortPayment > 500 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                 {formatINR(entry.shortPayment)}
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                 <span className="material-icons text-[10px] mr-1">check</span> Settled
                               </span>
                             )
                           ) : (
                             <span className="text-gray-300">-</span>
                           )}
                         </td>
                         <td className="px-6 py-4 text-center">
                           <div className="flex justify-center space-x-2">
                             <button className="text-gray-400 hover:text-primary">
                               <span className="material-icons text-lg">edit</span>
                             </button>
                             {entry.invoiceId && (
                               <button 
                                 onClick={() => {
                                   const inv = state.invoices.find(i => i.id === entry.invoiceId);
                                   if (inv) setPreviewInvoice(inv);
                                 }}
                                 className="text-gray-400 hover:text-primary"
                               >
                                 <span className="material-icons text-lg">visibility</span>
                               </button>
                             )}
                           </div>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
               <span>Showing {ledgerData.length} entries</span>
               <div className="flex space-x-1">
                 <button className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50" disabled>Prev</button>
                 <button className="px-2 py-1 border rounded bg-white hover:bg-gray-100">Next</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLedger;