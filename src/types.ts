export interface House {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  floors?: string[];
  electricityRate?: number; // per kWh
  waterRate?: number; // per unit/gallon
  trashCollectionRate?: number; // fixed monthly
  electricityBillingType?: 'unit' | 'fixed';
  waterBillingType?: 'unit' | 'fixed';
  trashBillingType?: 'unit' | 'fixed';
  isDeleted?: boolean;
}

export interface Room {
  id: string;
  houseId: string;
  roomNumber: string;
  rentAmount: number;
  floor?: string;
  previousElectricityReading?: number;
  currentElectricityReading?: number;
  previousWaterReading?: number;
  currentWaterReading?: number;
}

export type RentCycle = 'weekly' | 'monthly' | 'yearly';

export interface Tenant {
  id: string;
  houseId: string;
  name: string;
  phone: string;
  roomIds: string[];
  rentMode: 'auto' | 'manual';
  customRentAmount?: number;
  startDate: string;        // 'YYYY-MM-DD'
  rentCycle: RentCycle;
  rentCollectionType?: 'advance' | 'arrears';
}

export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface Payment {
  id: string;
  houseId: string;
  tenantId: string;
  month: string; // Format: 'YYYY-MM'
  amountDue: number;
  amountPaid: number;
  paymentDate: string | null;
  status: PaymentStatus;
  
  // Ledger Details
  baseRent?: number;
  electricityCharge?: number;
  waterCharge?: number;
  trashCharge?: number;
  otherCharges?: number;
}

export type ViewState = 'dashboard' | 'occupancy' | 'layout' | 'payments' | 'history';

export interface ArchivedItem {
  id: string;
  type: 'room' | 'floor';
  name: string;
  deletedAt: string;
  houseId: string;
  roomData?: Room;
  floorData?: {
    name: string;
    rooms: Room[];
  };
}

