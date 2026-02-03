
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import CustomerLedger from './components/CustomerLedger';
import VendorLedger from './components/VendorLedger';
import VendorDetails from './components/VendorDetails';
import InvoiceList from './components/InvoiceList';
import CreateInvoice from './components/CreateInvoice';
import FleetLedger from './components/FleetLedger';
import Reconciliation from './components/Reconciliation';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ToastContainer from './components/Toast';
import CommandPalette from './components/CommandPalette';
import { mockService } from './services/mockService';
import { AppState, Action, Transaction, AuditLog, Expense, SystemUser, InvoiceStatus } from './types';
import Header from './components/Header'; 

// --- State Management (Redux-like Context) ---

const initialState: AppState = {
  currentUser: { id: 'guest', name: 'Guest', email: '', role: 'Viewer', status: 'Active' },
  customers: [],
  invoices: [],
  bookings: [], // Init bookings
  vehicles: [],
  expenses: [],
  transactions: [],
  shipments: [],
  vendors: [],
  bankAccounts: [],
  bankFeed: [],
  users: [],
  userProfile: { companyName: '', taxId: '', address: '' },
  notifications: [],
  auditLogs: [],
  isLoading: true,
  searchQuery: '',
};

// Helper to create audit logs
const createLog = (state: AppState, actionType: string, entityType: any, entityId: string, details: string, oldVal?: string, newVal?: string): AuditLog => ({
  id: `log_${Date.now()}_${Math.random()}`,
  timestamp: new Date().toISOString(),
  userId: state.currentUser.id,
  userName: state.currentUser.name,
  userRole: state.currentUser.role,
  action: actionType,
  entityType,
  entityId,
  details,
  oldValue: oldVal,
  newValue: newVal
});

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_DATA':
      return { ...state, ...action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SWITCH_USER': {
      // Mock user switching logic
      const targetRole = action.payload;
      let newUser: SystemUser;
      
      if (targetRole === 'Admin') newUser = { id: 'u1', name: 'John Smith', email: 'john@opt.com', role: 'Admin', status: 'Active' };
      else if (targetRole === 'Finance Manager') newUser = { id: 'u2', name: 'Sarah Connor', email: 'sarah@opt.com', role: 'Finance Manager', status: 'Active' };
      else if (targetRole === 'Accountant') newUser = { id: 'u4', name: 'Gary Green', email: 'gary@opt.com', role: 'Accountant', status: 'Active' };
      else newUser = { id: 'u5', name: 'Mike Ops', email: 'mike@opt.com', role: 'Operations Manager', status: 'Active' };

      return {
        ...state,
        currentUser: newUser,
        notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'info', message: `Switched role to ${targetRole}` }]
      };
    }
    
    case 'ADD_INVOICE': {
      const log = createLog(state, 'Create', 'Invoice', action.payload.invoiceNumber, `Created invoice for ${formatINR(action.payload.amount)}`);
      return { 
        ...state, 
        invoices: [action.payload, ...state.invoices],
        auditLogs: [log, ...state.auditLogs]
      };
    }

    case 'DELETE_INVOICE': {
      if (state.currentUser.role === 'Accountant') {
        return {
           ...state,
           notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'error', message: 'Access Denied: Accountants cannot delete records.' }]
        };
      }
      const invToDelete = state.invoices.find(i => i.id === action.payload);
      const log = createLog(state, 'Delete', 'Invoice', invToDelete?.invoiceNumber || action.payload, 'Deleted Invoice Record');
      return {
        ...state,
        invoices: state.invoices.filter(i => i.id !== action.payload),
        auditLogs: [log, ...state.auditLogs],
        notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'success', message: 'Invoice deleted.' }]
      };
    }
    
    case 'ADD_EXPENSE': {
      const threshold = 50000; // 50k INR
      const isHighValue = action.payload.amount > threshold;
      
      const newExpense: Expense = {
        ...action.payload,
        status: isHighValue ? 'pending_approval' : 'approved'
      };

      const log = createLog(state, 'Create', 'Expense', newExpense.id, `Recorded expense ₹${newExpense.amount} (${newExpense.category})`, undefined, isHighValue ? 'Pending' : 'Approved');
      
      let notifs = [...state.notifications];
      if (isHighValue) {
        notifs.push({ id: `n_${Date.now()}`, type: 'warning', message: `Expense > ₹50k requires approval.` });
      } else {
        notifs.push({ id: `n_${Date.now()}`, type: 'success', message: 'Expense recorded successfully.' });
      }

      return { 
        ...state, 
        expenses: [newExpense, ...state.expenses],
        auditLogs: [log, ...state.auditLogs],
        notifications: notifs
      };
    }

    case 'APPROVE_EXPENSE': {
      const expense = state.expenses.find(e => e.id === action.payload);
      if (!expense) return state;

      const log = createLog(state, 'Approve', 'Expense', expense.id, `Approved high-value expense`, 'pending_approval', 'approved');
      
      return {
        ...state,
        expenses: state.expenses.map(e => e.id === action.payload ? { ...e, status: 'approved' } : e),
        auditLogs: [log, ...state.auditLogs],
        notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'success', message: 'Expense Approved.' }]
      };
    }

    case 'MATCH_BANK_TRANSACTION':
      return {
        ...state,
        bankFeed: state.bankFeed.map(t => 
          t.id === action.payload ? { ...t, status: 'matched' } : t
        )
      };

    case 'UPDATE_PROFILE':
      return { ...state, userProfile: { ...state.userProfile, ...action.payload } };
    
    case 'UPDATE_INVOICE_STATUS': {
      const targetInv = state.invoices.find(i => i.id === action.payload.id);
      const log = createLog(state, 'Update', 'Invoice', targetInv?.invoiceNumber || '', 'Status Change', targetInv?.status, action.payload.status);
      
      return {
        ...state,
        invoices: state.invoices.map(i => i.id === action.payload.id ? { ...i, status: action.payload.status } : i),
        auditLogs: [log, ...state.auditLogs]
      };
    }
    
    case 'RECORD_PAYMENT': {
      const { invoiceId, date, reference, amount, type, category, debitNoteNo, autoTds } = action.payload;

      const invoice = state.invoices.find(i => i.id === invoiceId);
      if(!invoice) return state;

      const currentPaid = invoice.paidAmount || 0;
      const currentAdjustments = invoice.adjustments || 0;
      
      let newPaid = currentPaid;
      let newAdjustments = currentAdjustments;
      const newTransactions: Transaction[] = [];

      // 1. Handle Main Transaction
      const isNonCashAdjustment = ['TDS', 'Discount', 'Adjustment', 'Credit note'].includes(category);
      
      // If AutoTDS is enabled, we treat the main entry as "Bank Receipt" regardless of whether it's full or partial
      const mainDescription = autoTds && (category === 'Full payment' || category === 'Partial payment')
        ? `Bank Receipt - ${invoice.invoiceNumber}`
        : `${category} - ${invoice.invoiceNumber} ${debitNoteNo ? `(DN: ${debitNoteNo})` : ''}`;

      if (isNonCashAdjustment) {
         if (type === 'credit') {
             newAdjustments += amount; 
         } else {
             newAdjustments -= amount; 
         }
      } else {
         if (type === 'credit') {
           newPaid += amount;
         } else {
           newPaid -= amount;
         }
      }

      newTransactions.push({
        id: `tx_${Date.now()}`,
        customerId: invoice.customerId,
        date: date,
        amount: amount,
        type: type,
        description: mainDescription,
        referenceId: invoice.id,
        matched: true,
      });

      // 2. Handle Auto TDS (Only if it's a payment credit)
      if (autoTds && type === 'credit' && !isNonCashAdjustment) {
        // Assume Amount is Net Received (98%). Calculate TDS (2%).
        // Gross = Amount / 0.98. TDS = Gross * 0.02
        const tdsAmount = Math.round((amount / 0.98) * 0.02);
        
        newAdjustments += tdsAmount;
        
        // Add millisecond delay logic to id to ensure uniqueness/sorting order
        newTransactions.push({
          id: `tx_tds_${Date.now()}_2`,
          customerId: invoice.customerId,
          date: date,
          amount: tdsAmount,
          type: 'credit', // TDS is a credit to the customer ledger (reduces balance)
          description: `TDS Deduction (2%) - ${invoice.invoiceNumber}`,
          referenceId: invoice.id,
          matched: true,
        });
      }

      // 3. Recalculate Balance & Status
      const totalCredits = newPaid + newAdjustments;
      const balance = invoice.amount - totalCredits;

      let newStatus: InvoiceStatus = invoice.status;
      if (balance <= 5) { 
         newStatus = 'paid';
      } else if (balance < invoice.amount) {
         newStatus = 'sent'; // Partial
      } else {
         const isOverdue = new Date() > new Date(invoice.dueDate);
         newStatus = isOverdue ? 'overdue' : 'sent';
      }

      const log = createLog(state, 'Record', 'Payment', invoice.invoiceNumber, `Recorded ${type} of ${formatINR(amount)} via ${category} ${autoTds ? '(+TDS)' : ''}`, invoice.status, newStatus);

      // Prepend new transactions to list
      return {
        ...state,
        invoices: state.invoices.map(i => i.id === invoice.id ? { ...i, paidAmount: newPaid, adjustments: newAdjustments, status: newStatus } : i),
        transactions: [...newTransactions, ...state.transactions],
        notifications: [...state.notifications, { id: `notif_${Date.now()}`, type: 'success', message: 'Payment recorded successfully.' }],
        auditLogs: [log, ...state.auditLogs]
      };
    }

    case 'RECORD_VENDOR_PAYMENT': {
      const { vendorIds, date, amount, category, reference, autoTds, bookingId } = action.payload;
      const newTransactions: Transaction[] = [];
      const updatedVendors = [...state.vendors];

      vendorIds.forEach(vid => {
        const vendor = updatedVendors.find(v => v.id === vid);
        if (!vendor) return;

        // In Vendor Ledger: Payment/Credit reduces Balance (Liability).
        // If AutoTDS is ON:
        // Input Amount is "Bank Payment" (Net).
        // We calculate TDS on top (2% of Gross).
        // Gross = Amount / 0.98. TDS = Gross * 0.02.
        
        let tdsAmount = 0;
        let mainDesc = `${category} - ${reference}`;
        if (bookingId) mainDesc += ` (Trip: ${bookingId})`;

        if (autoTds) {
           tdsAmount = Math.round((amount / 0.98) * 0.02);
           mainDesc = `Bank Payment - ${reference} ${bookingId ? `(Trip: ${bookingId})` : ''}`;
        }

        // 1. Bank/Main Entry
        newTransactions.push({
          id: `vtx_${Date.now()}_${vid}`,
          vendorId: vid,
          vendorName: vendor.name,
          date: date,
          amount: amount,
          type: 'credit', // Credit reduces Vendor Balance
          category: category,
          description: mainDesc,
          referenceNo: reference,
          referenceId: bookingId,
          matched: true
        });

        // 2. TDS Entry
        if (autoTds && tdsAmount > 0) {
          newTransactions.push({
            id: `vtx_tds_${Date.now()}_${vid}`,
            vendorId: vid,
            vendorName: vendor.name,
            date: date,
            amount: tdsAmount,
            type: 'credit', // Also reduces balance
            category: 'TDS',
            description: `TDS (2%) on Payment ${reference}`,
            referenceId: bookingId,
            matched: true
          });
        }

        // Update Balance
        vendor.balance = Math.max(0, vendor.balance - (amount + tdsAmount));
        vendor.lastActivity = new Date().toISOString();
      });

      const log = createLog(state, 'Record', 'Payment', `${vendorIds.length} Vendor(s)`, `Recorded ${category} of ${formatINR(amount)} ${autoTds ? '(+TDS)' : ''}`);

      return {
        ...state,
        vendors: updatedVendors,
        transactions: [...newTransactions, ...state.transactions],
        notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'success', message: 'Vendor payment recorded.' }],
        auditLogs: [log, ...state.auditLogs]
      };
    }

    case 'COMPLETE_TRIP': {
      const { bookingId } = action.payload;
      const booking = state.bookings.find(b => b.id === bookingId);
      
      if (!booking) return state;
      if (!booking.vendorId) {
        return {
          ...state,
          notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'error', message: `Trip ${bookingId} has no vendor assigned.` }]
        };
      }

      // Check if expense already exists to prevent duplicate posting
      const existingExpense = state.expenses.find(e => e.bookingId === bookingId && e.category === 'Freight');
      if (existingExpense) {
        return {
          ...state,
          notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'warning', message: `Trip ${bookingId} already posted to ledger.` }]
        };
      }

      // Auto-create Freight Expense (Liability)
      const newExpense: Expense = {
        id: `exp_auto_${Date.now()}`,
        vehicleId: booking.vehicleId,
        category: 'Freight',
        amount: booking.expense,
        date: new Date().toISOString().split('T')[0],
        vendor: booking.vendorName || 'Unknown',
        vendorId: booking.vendorId,
        bookingId: booking.id,
        entryType: 'Auto', // Important for visibility logic
        status: 'approved'
      };

      // Update Vendor Balance (Debit increases balance we owe)
      const updatedVendors = state.vendors.map(v => 
        v.id === booking.vendorId 
          ? { ...v, balance: v.balance + booking.expense, lastActivity: new Date().toISOString() }
          : v
      );

      const log = createLog(state, 'Post', 'Expense', bookingId, `Auto-posted freight charge of ${formatINR(booking.expense)}`, 'Pending', 'Posted');

      return {
        ...state,
        vendors: updatedVendors,
        expenses: [...state.expenses, newExpense],
        auditLogs: [log, ...state.auditLogs],
        notifications: [...state.notifications, { id: `n_${Date.now()}`, type: 'success', message: `Trip ${bookingId} posted to Vendor Ledger.` }]
      };
    }
    
    case 'SEND_REMINDERS': {
      const ids = new Set(action.payload);
      const timestamp = new Date().toISOString();
      const count = ids.size;
      
      if (count === 0) return state;

      const log = createLog(state, 'Communicate', 'Invoice', `${count} items`, `Sent bulk reminders`, undefined, timestamp);

      return {
        ...state,
        invoices: state.invoices.map(i => {
          if (ids.has(i.id)) {
            const currentNotes = i.notes || '';
            const newNote = `Reminder Sent: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
            return {
              ...i,
              lastReminderSent: timestamp,
              notes: currentNotes ? `${currentNotes}\n${newNote}` : newNote
            };
          }
          return i;
        }),
        auditLogs: [log, ...state.auditLogs],
        notifications: [...state.notifications, { id: `notif_${Date.now()}`, type: 'success', message: `Reminders sent to ${count} customers.` }]
      };
    }

    case 'MARK_BOOKINGS_INVOICED': {
      const ids = new Set(action.payload);
      return {
        ...state,
        bookings: state.bookings.map(b => 
          ids.has(b.id) ? { ...b, status: 'invoiced' } : b
        )
      };
    }

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, { id: `notif_${Date.now()}`, ...action.payload }]
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => null });

export const useApp = () => useContext(AppContext);

// Helper for INR currency formatting
export const formatINR = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });
};

// --- Main App Logic ---

const AppContent: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const data = await mockService.fetchAllData();
        dispatch({ type: 'SET_DATA', payload: data });
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    initData();
  }, [dispatch]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <HashRouter>
      {/* Command Palette Overlay */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

      <div className="min-h-screen bg-neutral text-gray-800 font-sans">
           <MainLayout 
              searchQuery={state.searchQuery}
              onSearchChange={(q) => dispatch({ type: 'SET_SEARCH_QUERY', payload: q })}
              onOpenCommand={() => setCommandPaletteOpen(true)}
           >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<CustomerLedger />} />
                <Route path="/vendors" element={<VendorLedger />} />
                <Route path="/vendors/:id" element={<VendorDetails />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/create" element={<CreateInvoice />} />
                <Route path="/fleet" element={<FleetLedger />} />
                <Route path="/reconciliation" element={<Reconciliation />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <ToastContainer />
           </MainLayout>
      </div>
    </HashRouter>
  );
};

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppContent />
    </AppContext.Provider>
  );
}
