import { generateMockData } from '../mockData';
import { AppState } from '../types';

const MOCK_DELAY = 800; // ms

class MockService {
  private data: AppState;

  constructor() {
    const { customers, invoices, vehicles, expenses, transactions, shipments, vendors, bankAccounts, bankFeed, users, bookings } = generateMockData();
    this.data = {
      currentUser: users[0], // Default to Admin
      customers,
      invoices,
      vehicles,
      expenses,
      transactions,
      shipments,
      vendors,
      bankAccounts,
      bankFeed,
      users,
      bookings, // Added bookings
      userProfile: {
        companyName: 'Optimile Logistics',
        taxId: '27AABCU9603R1ZN',
        address: 'Unit 401, Business Bay, Pune, MH, India'
      },
      notifications: [],
      auditLogs: [
        {
          id: 'log_1',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          userId: 'u1',
          userName: 'John Smith',
          userRole: 'Admin',
          action: 'System Init',
          entityId: 'sys',
          entityType: 'System',
          details: 'System initialized with seed data'
        }
      ],
      isLoading: false,
      searchQuery: ''
    };
  }

  private delay() {
    return new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  }

  async fetchAllData() {
    await this.delay();
    return this.data;
  }
}

export const mockService = new MockService();