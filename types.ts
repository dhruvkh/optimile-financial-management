
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'partial'; // added partial for better type safety
export type TransactionType = 'credit' | 'debit';
export type VehicleStatus = 'active' | 'maintenance' | 'retired';
export type UserRole = 'Admin' | 'Finance Manager' | 'Accountant' | 'Operations Manager' | 'Viewer';
export type ExpenseStatus = 'approved' | 'pending_approval';

export interface Customer {
  id: string;
  name: string;
  email: string;
  taxId: string;
  creditLimit: number;
  status: 'active' | 'inactive';
  joinedDate: string;
  address?: string;
  // Enhanced Profile Fields
  contactPerson?: string;
  phone?: string;
  paymentTerms?: number; // e.g., 30 days
  tdsRate?: number; // e.g., 2.0 (%)
  relationshipManager?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount?: number; // Tracks cash/bank payments
  adjustments?: number; // Tracks non-cash credits like TDS, Discounts
  taxAmount?: number;
  discount?: number;
  lineItems: LineItem[];
  lastReminderSent?: string; // ISO Date string
  notes?: string; // Internal notes
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  origin: string;
  destination: string;
  distance: number;
  vehicleId: string;
  driverName: string;
  driverPhone: string;
  bookedDate: string;
  completedDate: string;
  amount: number; // Revenue to bill
  expense: number; // Trip cost (Payable to Vendor)
  status: 'pending' | 'invoiced';
  podUrl?: string;
  podVerified: boolean;
  // Vendor Links
  vendorId?: string;
  vendorName?: string;
}

export interface Vehicle {
  id: string;
  regNumber: string;
  model: string;
  status: VehicleStatus;
  mileage: number;
  lastMaintenance?: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  category: 'Fuel' | 'Maintenance' | 'Insurance' | 'Toll' | 'Freight' | 'Driver' | 'EMI';
  amount: number;
  date: string;
  vendor: string;
  vendorId?: string; // Link to vendor
  bookingId?: string; // Link to booking for Freight expenses
  costPerKm?: number;
  receiptUrl?: string;
  status: ExpenseStatus;
  entryType?: 'Manual' | 'Auto';
  odometer?: number; // Added for Smart Entry
}

export interface Transaction {
  id: string;
  customerId?: string;
  vendorId?: string; // Link to Vendor
  vendorName?: string;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  referenceId?: string; // Links to Invoice ID or Booking ID
  matched: boolean;
  paymentMode?: string; // UPI, NEFT, RTGS
  referenceNo?: string; // UTR or Chq No
  category?: string; // Payment, Advance, Adjustment
}

export interface Shipment {
  id: string;
  route: string;
  currentRate: number;
  breakevenRate: number;
  status: 'active' | 'completed';
}

export interface Vendor {
  id: string;
  name: string;
  code?: string; // Internal Code e.g., V-2023
  taxId?: string; // GSTIN
  lastActivity?: string; // Timestamp
  rating: number; // 1-5
  category: string;
  balance: number;
  paymentTerms: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  lastSynced: string;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  amount: number; // Positive for deposit, negative for withdrawal
  type: 'credit' | 'debit';
  status: 'matched' | 'unmatched';
}

export interface UserProfile {
  companyName: string;
  taxId: string;
  address: string;
  logoUrl?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityId: string;
  entityType: 'Invoice' | 'Payment' | 'Expense' | 'System' | 'Booking';
  details: string;
  oldValue?: string;
  newValue?: string;
}

// State Management Types (Redux-like pattern)
export interface AppState {
  currentUser: SystemUser;
  customers: Customer[];
  invoices: Invoice[];
  bookings: Booking[];
  vehicles: Vehicle[];
  expenses: Expense[];
  transactions: Transaction[];
  shipments: Shipment[];
  vendors: Vendor[];
  bankAccounts: BankAccount[];
  bankFeed: BankTransaction[];
  users: SystemUser[];
  userProfile: UserProfile;
  notifications: Notification[];
  auditLogs: AuditLog[];
  isLoading: boolean;
  searchQuery: string;
}

export type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DATA'; payload: Partial<AppState> }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SWITCH_USER'; payload: UserRole }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'DELETE_INVOICE'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Omit<Expense, 'status'> }
  | { type: 'APPROVE_EXPENSE'; payload: string }
  | { type: 'MATCH_BANK_TRANSACTION'; payload: string }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'RECORD_PAYMENT'; payload: { invoiceId: string; date: string; reference: string; amount: number; type: 'credit' | 'debit'; category: string; debitNoteNo?: string; autoTds?: boolean } }
  | { type: 'RECORD_VENDOR_PAYMENT'; payload: { vendorIds: string[]; date: string; amount: number; category: string; reference: string; autoTds: boolean; bookingId?: string } }
  | { type: 'COMPLETE_TRIP'; payload: { bookingId: string } }
  | { type: 'UPDATE_INVOICE_STATUS'; payload: { id: string; status: InvoiceStatus } }
  | { type: 'SEND_REMINDERS'; payload: string[] }
  | { type: 'MARK_BOOKINGS_INVOICED'; payload: string[] } // IDs of bookings
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };
