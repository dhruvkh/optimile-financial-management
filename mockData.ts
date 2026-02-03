
import { Customer, Invoice, Vehicle, Expense, Transaction, LineItem, InvoiceStatus, VehicleStatus, Shipment, Vendor, BankAccount, BankTransaction, SystemUser, Booking } from './types';

// Helpers
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const generateId = () => Math.random().toString(36).substr(2, 9);
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
const randomPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - getRandomInt(1, days));
    return d.toISOString().split('T')[0];
};

// Names & Data (Supply Chain Logistics Context)
const companies = [
  'Hindustan Unilever', 'ITC Limited', 'Reliance Retail', 'Amazon Transportation', 
  'Flipkart Ekart', 'Parle Agro', 'Amul Dairy', 'UltraTech Cement', 
  'Tata Steel', 'Asian Paints', 'Nestle India', 'Britannia Industries', 
  'Coca-Cola India', 'Blue Star Ltd', 'Godrej Consumer Products'
];

const cities = ['Mumbai', 'Pune', 'Delhi', 'Jaipur', 'Chennai', 'Bangalore', 'Kolkata', 'Ranchi', 'Hyderabad', 'Ahmedabad', 'Surat', 'Nagpur'];

const drivers = ['Ramesh Kumar', 'Suresh Singh', 'Rajesh Yadav', 'Mohan Lal', 'Vikram Singh', 'Abdul Khan', 'Peter Dsouza', 'Manpreet Singh'];

const contactNames = ['Amit Sharma', 'Priya Desai', 'Rahul Verma', 'Sneha Gupta', 'Vikram Malhotra', 'Anjali Singh'];
const relationshipManagers = ['Sarah Connor', 'John Smith', 'Mike Ops', 'Emily Blunt', 'Gary Green'];

const vendorNames = [
  'Indian Oil Corp', 'Bharat Petroleum', 'FastTag Tolls', 'Ashok Leyland Service', 
  'MRF Tyres Commercial', 'HP Petrol Pump', 'Apollo Tyres Service', 'Shell India Trucking',
  'Shree Logistics', 'VRL Logistics', 'Gati KWE', 'SafeExpress', 'TCI Freight'
];

// Commercial Vehicles (Goods Movement)
const commercialVehicles = [
  'Tata Ace Gold', 'Mahindra Bolero Pik-Up', 'Ashok Leyland Bada Dost', 'Tata 407 Gold', 
  'Eicher Pro 3015', 'BharatBenz 1917R', 'Mahindra Furio 7', 'Tata Prima 5530', 
  'Force Traveller Delivery', 'Mahindra Jeeto'
];

const generateGSTIN = () => {
  const stateCode = getRandomInt(1, 37).toString().padStart(2, '0');
  const pan = Math.random().toString(36).substring(2, 7).toUpperCase() + getRandomInt(1000, 9999) + Math.random().toString(36).substring(2, 3).toUpperCase();
  return `${stateCode}${pan}1Z${getRandomInt(1, 9)}`;
};

export const generateMockData = () => {
  // 1. Customers
  const customers: Customer[] = Array.from({ length: 50 }).map((_, i) => ({
    id: `cust_${i + 1}`,
    name: `${getRandomElement(companies)}`,
    email: `accounts@${getRandomElement(companies).toLowerCase().replace(/\s+/g, '')}.co.in`,
    taxId: generateGSTIN(), // GSTIN format
    creditLimit: getRandomInt(50000, 1500000), // Higher limits for B2B logistics
    status: Math.random() > 0.2 ? 'active' : 'inactive',
    joinedDate: randomDate(new Date(2021, 0, 1), new Date()),
    address: '123, Industrial Estate, Mumbai, MH - 400001',
    // New Fields
    contactPerson: getRandomElement(contactNames),
    phone: `+91 9${getRandomInt(100000000, 999999999)}`,
    paymentTerms: getRandomElement([15, 30, 45, 60]),
    tdsRate: 2.0, // Standard 194Q/C
    relationshipManager: getRandomElement(relationshipManagers)
  }));

  // 2. Invoices
  const invoices: Invoice[] = Array.from({ length: 200 }).map((_, i) => {
    const customer = getRandomElement(customers);
    const status = getRandomElement<InvoiceStatus>(['draft', 'sent', 'paid', 'paid', 'overdue']);
    const date = randomDate(new Date(2023, 0, 1), new Date());
    
    // Generate Line Items
    const lineItems: LineItem[] = Array.from({ length: getRandomInt(1, 5) }).map(() => {
      const qty = getRandomInt(1, 50); // Tons or Trips
      const price = getRandomInt(2000, 15000); // Price per Trip/Ton in INR
      return {
        id: generateId(),
        description: `Freight Charges - ${getRandomElement(['Mumbai to Pune', 'Delhi to Jaipur', 'Chennai to Bangalore', 'Kolkata to Ranchi'])}`,
        quantity: qty,
        unitPrice: price,
        total: qty * price
      };
    });

    const totalAmount = lineItems.reduce((acc, item) => acc + item.total, 0);

    return {
      id: `inv_${i + 1}`,
      customerId: customer.id,
      customerName: customer.name,
      invoiceNumber: `INV-${2023000 + i}`,
      status,
      date,
      dueDate: randomDate(new Date(date), new Date(new Date(date).getTime() + (customer.paymentTerms || 30) * 24 * 60 * 60 * 1000)),
      amount: totalAmount,
      lineItems
    };
  });

  // 3. Vehicles
  const vehicles: Vehicle[] = Array.from({ length: 20 }).map((_, i) => ({
    id: `veh_${i + 1}`,
    regNumber: `MH-${getRandomInt(10, 48)}-${getRandomElement(['CV', 'GT', 'XX', 'TR'])}-${getRandomInt(1000, 9999)}`,
    model: getRandomElement(commercialVehicles),
    status: getRandomElement<VehicleStatus>(['active', 'active', 'active', 'maintenance', 'retired']),
    mileage: getRandomInt(10000, 350000)
  }));

  // 7. Vendors (Generated before expenses to link them)
  const vendors: Vendor[] = vendorNames.map((name, i) => ({
    id: `vnd_${i}`,
    name: name,
    code: `${name.substring(0, 3).toUpperCase()}${getRandomInt(2020, 2025)}`,
    taxId: generateGSTIN(),
    lastActivity: new Date(Date.now() - getRandomInt(0, 10) * 86400000 - getRandomInt(0, 10000000)).toISOString(),
    category: getRandomElement(['Fuel', 'Maintenance', 'Services']),
    rating: getRandomInt(3, 5),
    balance: getRandomInt(50000, 1500000),
    paymentTerms: getRandomElement([30, 45, 60, 90])
  }));

  // 9. Bookings (Generated earlier to link expenses)
  const bookings: Booking[] = Array.from({ length: 60 }).map((_, i) => {
    const cust = getRandomElement(customers);
    const origin = getRandomElement(cities);
    let destination = getRandomElement(cities);
    while(destination === origin) destination = getRandomElement(cities);
    
    const distance = getRandomInt(150, 1500);
    const amount = distance * getRandomInt(35, 50); // Approx Rate per km
    const expense = amount * (Math.random() * 0.4 + 0.4); // 40-80% cost ratio
    const bDate = randomPastDate(20);
    const cDate = randomPastDate(5); // Completed recently
    
    // Assign a Vendor to this booking
    const vendor = getRandomElement(vendors);

    return {
      id: `BK-${2024000 + i}`,
      customerId: cust.id,
      customerName: cust.name,
      origin: origin,
      destination: destination,
      distance: distance,
      vehicleId: getRandomElement(vehicles).id,
      driverName: getRandomElement(drivers),
      driverPhone: `+91 9${getRandomInt(100000000, 999999999)}`,
      bookedDate: bDate,
      completedDate: cDate,
      amount: amount,
      expense: expense,
      status: i < 20 ? 'invoiced' : 'pending', // 40 pending items
      podUrl: Math.random() > 0.1 ? 'mock_pod.jpg' : undefined,
      podVerified: i > 30 ? true : false, // Mix of verified/unverified
      vendorId: vendor.id,
      vendorName: vendor.name
    };
  });

  // 4. Expenses (Linked to Vendors and Bookings)
  const expenses: Expense[] = [];
  
  // Vehicle Expenses
  vehicles.forEach(vehicle => {
    const expenseCount = getRandomInt(10, 20);
    for (let i = 0; i < expenseCount; i++) {
      const vendor = getRandomElement(vendors);
      expenses.push({
        id: generateId(),
        vehicleId: vehicle.id,
        category: getRandomElement(['Fuel', 'Maintenance', 'Insurance', 'Toll']),
        amount: getRandomInt(2000, 25000),
        date: randomDate(new Date(2023, 0, 1), new Date()),
        vendor: vendor.name,
        vendorId: vendor.id,
        entryType: 'Manual',
        status: Math.random() > 0.1 ? 'approved' : 'pending_approval'
      });
    }
  });

  // Booking Freight Expenses (Simulated as "bills" from vendors)
  bookings.forEach(booking => {
    if (booking.vendorId && booking.vendorName) {
      expenses.push({
        id: generateId(),
        vehicleId: booking.vehicleId,
        category: 'Freight',
        amount: booking.expense,
        date: booking.completedDate,
        vendor: booking.vendorName,
        vendorId: booking.vendorId,
        bookingId: booking.id,
        entryType: 'Auto',
        status: 'approved'
      });
    }
  });

  // 5. Transactions
  const transactions: Transaction[] = [];
  
  // Customer Receipts
  invoices.filter(inv => inv.status === 'paid').forEach(inv => {
    transactions.push({
      id: generateId(),
      customerId: inv.customerId,
      date: randomDate(new Date(inv.date), new Date()),
      amount: inv.amount,
      type: 'credit',
      description: `Payment for ${inv.invoiceNumber}`,
      referenceId: inv.id,
      matched: true,
      category: 'Full payment'
    });
  });

  // Vendor Payments (Credits to Vendor Ledger)
  // We simulate payments for some freight expenses
  expenses.filter(e => e.category === 'Freight').forEach(exp => {
    // 60% chance expense is paid
    if (Math.random() > 0.4) {
      transactions.push({
        id: generateId(),
        vendorId: exp.vendorId,
        vendorName: exp.vendor,
        date: randomDate(new Date(exp.date), new Date()),
        amount: exp.amount, // Full payment
        type: 'credit', // Credit reduces vendor balance
        description: `Payment for Trip ${exp.bookingId}`,
        referenceId: exp.bookingId,
        matched: true,
        paymentMode: getRandomElement(['NEFT', 'RTGS', 'UPI']),
        referenceNo: `UTR${getRandomInt(100000, 999999)}`,
        category: 'Full payment'
      });
    }
  });

  // 6. Shipments (for Breakeven)
  const routes = ['Mumbai-Pune', 'Delhi-Jaipur', 'Bangalore-Chennai', 'Kolkata-Ranchi', 'Hyderabad-Vijayawada'];
  const shipments: Shipment[] = Array.from({ length: 15 }).map((_, i) => ({
    id: `shp_${i}`,
    route: getRandomElement(routes),
    currentRate: getRandomInt(20000, 60000),
    breakevenRate: getRandomInt(15000, 45000),
    status: 'active'
  }));

  // 8. Bank Accounts & Feed
  const bankAccounts: BankAccount[] = [
    { id: 'ba_1', bankName: 'HDFC Bank', accountNumber: '**** 4589', balance: 4500000, lastSynced: new Date().toISOString() },
    { id: 'ba_2', bankName: 'ICICI Bank', accountNumber: '**** 1234', balance: 1200000, lastSynced: new Date(Date.now() - 3600000).toISOString() },
  ];
  const bankFeed: BankTransaction[] = [];
  invoices.slice(0, 15).forEach(inv => {
    bankFeed.push({
      id: `bt_in_${inv.id}`,
      bankAccountId: 'ba_1',
      date: inv.date, 
      description: `NEFT Transfer from ${inv.customerName}`,
      amount: inv.amount,
      type: 'credit',
      status: Math.random() > 0.7 ? 'matched' : 'unmatched'
    });
  });
  expenses.slice(0, 15).forEach(exp => {
    bankFeed.push({
      id: `bt_ex_${exp.id}`,
      bankAccountId: 'ba_1',
      date: exp.date,
      description: `POS PURCHASE ${exp.vendor}`,
      amount: exp.amount,
      type: 'debit',
      status: Math.random() > 0.7 ? 'matched' : 'unmatched'
    });
  });

  // 10. Users
  const users: SystemUser[] = [
    { id: 'u1', name: 'John Smith', email: 'john@optimile.com', role: 'Admin', status: 'Active' },
    { id: 'u2', name: 'Sarah Connor', email: 'sarah@optimile.com', role: 'Finance Manager', status: 'Active' },
    { id: 'u3', name: 'Kyle Reese', email: 'kyle@optimile.com', role: 'Viewer', status: 'Inactive' },
  ];

  return { customers, invoices, vehicles, expenses, transactions, shipments, vendors, bankAccounts, bankFeed, users, bookings };
};
