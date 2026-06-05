import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { House, Room, Tenant, Payment, ViewState } from '../types';
import { mockHouses, mockRooms, mockTenants, mockPayments } from '../lib/mockData';

interface AppContextType {
  houses: House[];
  rooms: Room[];
  tenants: Tenant[];
  payments: Payment[];
  activeHouseId: string | null;
  setActiveHouseId: (id: string | null) => void;
  
  // Global View and Actions
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  globalAction: 'onboard' | 'payment' | 'room' | 'meters' | null;
  setGlobalAction: (action: 'onboard' | 'payment' | 'room' | 'meters' | null) => void;
  
  // Storage operations
  addHouse: (house: Omit<House, 'id'>) => string;
  updateHouse: (id: string, house: Partial<House>) => void;
  deleteHouse: (id: string) => void;
  restoreHouse: (id: string) => void;
  hardDeleteHouse: (id: string) => void;
  
  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  
  addTenant: (tenant: Omit<Tenant, 'id'>) => void;
  updateTenant: (id: string, tenant: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;
  
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  
  // Helpers
  getTenantTotalRent: (tenant: Tenant) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 9);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [globalAction, setGlobalAction] = useState<'onboard' | 'payment' | 'room' | 'meters' | null>(null);

  const [houses, setHouses] = useState<House[]>(() => {
    const saved = localStorage.getItem('pm_houses');
    return saved ? JSON.parse(saved) : mockHouses;
  });
  
  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('pm_rooms');
    return saved ? JSON.parse(saved) : mockRooms;
  });
  
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('pm_tenants');
    return saved ? JSON.parse(saved) : mockTenants;
  });
  
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('pm_payments');
    return saved ? JSON.parse(saved) : mockPayments;
  });
  
  const [activeHouseId, setActiveHouseId] = useState<string | null>(houses[0]?.id || null);

  useEffect(() => {
    localStorage.setItem('pm_houses', JSON.stringify(houses));
    localStorage.setItem('pm_rooms', JSON.stringify(rooms));
    localStorage.setItem('pm_tenants', JSON.stringify(tenants));
    localStorage.setItem('pm_payments', JSON.stringify(payments));
  }, [houses, rooms, tenants, payments]);

  const addHouse = (house: Omit<House, 'id'>) => {
    const newHouse = { ...house, id: generateId() };
    setHouses(prev => [...prev, newHouse]);
    if (!activeHouseId) setActiveHouseId(newHouse.id);
    return newHouse.id;
  };
  
  const updateHouse = (id: string, data: Partial<House>) => {
    setHouses(prev => prev.map(h => h.id === id ? { ...h, ...data } : h));
  };
  
  const restoreHouse = (id: string) => updateHouse(id, { isDeleted: false });
  const hardDeleteHouse = (id: string) => {
    setHouses(prev => prev.filter(h => h.id !== id));
    setRooms(prev => prev.filter(r => r.houseId !== id));
    setTenants(prev => prev.filter(t => t.houseId !== id));
    setPayments(prev => prev.filter(p => p.houseId !== id));
  };
  const deleteHouse = (id: string) => {
    updateHouse(id, { isDeleted: true });
    
    // De-select if it was active
    const nextHouses = houses.filter(h => h.id !== id && !h.isDeleted);
    if (activeHouseId === id) {
      setActiveHouseId(nextHouses.length > 0 ? nextHouses[0].id : null);
    }
  };

  const addRoom = (room: Omit<Room, 'id'>) => setRooms(prev => [...prev, { ...room, id: generateId() }]);
  const updateRoom = (id: string, data: Partial<Room>) => setRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  const deleteRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    // Clean up room from any tenant
    setTenants(prev => prev.map(t => ({
      ...t,
      roomIds: t.roomIds.filter(rId => rId !== id)
    })));
  };

  const addTenant = (tenant: Omit<Tenant, 'id'>) => setTenants(prev => [...prev, { ...tenant, id: generateId() }]);
  const updateTenant = (id: string, data: Partial<Tenant>) => setTenants(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  const deleteTenant = (id: string) => {
    setTenants(prev => prev.filter(t => t.id !== id));
    setPayments(prev => prev.filter(p => p.tenantId !== id));
  };

  const addPayment = (payment: Omit<Payment, 'id'>) => setPayments(prev => [...prev, { ...payment, id: generateId() }]);
  const updatePayment = (id: string, data: Partial<Payment>) => setPayments(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));

  const getTenantTotalRent = (tenant: Tenant): number => {
    if (tenant.rentMode === 'manual') return tenant.customRentAmount || 0;
    return tenant.roomIds.reduce((sum, roomId) => {
      const room = rooms.find(r => r.id === roomId);
      return sum + (room?.rentAmount || 0);
    }, 0);
  };

  return (
    <AppContext.Provider value={{
      houses, rooms, tenants, payments, activeHouseId, setActiveHouseId,
      currentView, setCurrentView, globalAction, setGlobalAction,
      addHouse, updateHouse, deleteHouse, restoreHouse, hardDeleteHouse,
      addRoom, updateRoom, deleteRoom,
      addTenant, updateTenant, deleteTenant,
      addPayment, updatePayment,
      getTenantTotalRent
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
