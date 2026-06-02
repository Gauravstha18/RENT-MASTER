import { House, Room, Tenant, Payment } from '../types';

export const mockHouses: House[] = [
  { id: 'h1', name: 'Sunrise Villa', address: '123 Main St, Springfield' },
  { id: 'h2', name: 'Oakwood Apartments', address: '456 Oak Ave, Shelbyville' }
];

export const mockRooms: Room[] = [
  { id: 'r1', houseId: 'h1', roomNumber: '101', rentAmount: 1000, floor: 'Floor 1' },
  { id: 'r2', houseId: 'h1', roomNumber: '102', rentAmount: 1200, floor: 'Floor 1' },
  { id: 'r3', houseId: 'h1', roomNumber: '103', rentAmount: 900, floor: 'Floor 2' },
  { id: 'r4', houseId: 'h1', roomNumber: '104', rentAmount: 1100, floor: 'Floor 2' },
  { id: 'r5', houseId: 'h2', roomNumber: 'A1', rentAmount: 1500, floor: 'Floor 1' },
  { id: 'r6', houseId: 'h2', roomNumber: 'A2', rentAmount: 1500, floor: 'Floor 1' },
  { id: 'r7', houseId: 'h2', roomNumber: 'B1', rentAmount: 1600, floor: 'Floor 2' }
];

export const mockTenants: Tenant[] = [
  { 
    id: 't1', houseId: 'h1', name: 'John Doe', phone: '555-0101', 
    roomIds: ['r1'], rentMode: 'auto', startDate: '2026-05-15', rentCycle: 'monthly'
  },
  { 
    id: 't2', houseId: 'h1', name: 'Jane Smith', phone: '555-0102', 
    roomIds: ['r2', 'r3'], rentMode: 'manual', customRentAmount: 2000, startDate: '2026-06-01', rentCycle: 'monthly'
  },
  { 
    id: 't3', houseId: 'h2', name: 'Alice Johnson', phone: '555-0201', 
    roomIds: ['r5'], rentMode: 'auto', startDate: '2026-01-10', rentCycle: 'yearly'
  }
];

export const mockPayments: Payment[] = [
  {
    id: 'p1', houseId: 'h1', tenantId: 't1', month: '2026-06',
    amountDue: 1000, amountPaid: 1000, paymentDate: '2026-06-01', status: 'paid'
  },
  {
    id: 'p2', houseId: 'h1', tenantId: 't2', month: '2026-06',
    amountDue: 2000, amountPaid: 1000, paymentDate: '2026-06-05', status: 'partial'
  }
];
