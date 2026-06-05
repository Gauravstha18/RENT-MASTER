import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { House, Room, Tenant, Payment, ViewState, ArchivedItem } from '../types';
import { mockHouses, mockRooms, mockTenants, mockPayments } from '../lib/mockData';
import { supabase, credentials } from '../lib/supabase';

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
}

interface AppContextType {
  houses: House[];
  rooms: Room[];
  tenants: Tenant[];
  payments: Payment[];
  activeHouseId: string | null;
  setActiveHouseId: (id: string | null) => void;
  
  // Archived items
  archivedItems: ArchivedItem[];
  deleteFloor: (houseId: string, floorName: string) => void;
  restoreArchivedItem: (id: string) => void;
  deleteArchivedItemPermanently: (id: string) => void;
  
  // Real-time Auth info
  user: AuthUser | null;
  loadingUser: boolean;
  logout: () => void;
  loginAsSandbox: () => void;
  isSandboxMode: boolean; // True if supabase tables are missing or not setup yet
  
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
  deleteRoom: (id: string, preventArchive?: boolean) => void;
  
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

// Mapping utilities between standard app camelCase models & Database snake_case records
const mapHouseFromDb = (dbHouse: any): House => ({
  id: dbHouse.id,
  name: dbHouse.name,
  address: dbHouse.address,
  imageUrl: dbHouse.image_url,
  floors: Array.isArray(dbHouse.floors) ? dbHouse.floors : [],
  electricityRate: dbHouse.electricity_rate ? Number(dbHouse.electricity_rate) : undefined,
  waterRate: dbHouse.water_rate ? Number(dbHouse.water_rate) : undefined,
  trashCollectionRate: dbHouse.trash_collection_rate ? Number(dbHouse.trash_collection_rate) : undefined,
  electricityBillingType: dbHouse.electricity_billing_type || 'fixed',
  waterBillingType: dbHouse.water_billing_type || 'fixed',
  trashBillingType: dbHouse.trash_billing_type || 'fixed',
  isDeleted: dbHouse.is_deleted,
  sharedWithEmails: Array.isArray(dbHouse.shared_with_emails) ? dbHouse.shared_with_emails : []
});

const mapHouseToDb = (house: Partial<House>, ownerId: string) => ({
  id: house.id,
  name: house.name,
  address: house.address,
  image_url: house.imageUrl,
  floors: house.floors,
  electricity_rate: house.electricityRate,
  water_rate: house.waterRate,
  trash_collection_rate: house.trashCollectionRate,
  electricity_billing_type: house.electricityBillingType,
  water_billing_type: house.waterBillingType,
  trash_billing_type: house.trashBillingType,
  is_deleted: house.isDeleted,
  shared_with_emails: house.sharedWithEmails,
  owner_id: ownerId
});

const mapRoomFromDb = (dbRoom: any): Room => ({
  id: dbRoom.id,
  houseId: dbRoom.house_id,
  roomNumber: dbRoom.room_number,
  rentAmount: Number(dbRoom.rent_amount || 0),
  floor: dbRoom.floor,
  previousElectricityReading: dbRoom.previous_electricity_reading ? Number(dbRoom.previous_electricity_reading) : undefined,
  currentElectricityReading: dbRoom.current_electricity_reading ? Number(dbRoom.current_electricity_reading) : undefined,
  previousWaterReading: dbRoom.previous_water_reading ? Number(dbRoom.previous_water_reading) : undefined,
  currentWaterReading: dbRoom.current_water_reading ? Number(dbRoom.current_water_reading) : undefined
});

const mapRoomToDb = (room: Partial<Room>, ownerId: string) => ({
  id: room.id,
  house_id: room.houseId,
  room_number: room.roomNumber,
  rent_amount: room.rentAmount,
  floor: room.floor,
  previous_electricity_reading: room.previousElectricityReading,
  current_electricity_reading: room.currentElectricityReading,
  previous_water_reading: room.previousWaterReading,
  current_water_reading: room.currentWaterReading,
  owner_id: ownerId
});

const mapTenantFromDb = (dbTenant: any): Tenant => ({
  id: dbTenant.id,
  houseId: dbTenant.house_id,
  name: dbTenant.name,
  phone: dbTenant.phone || '',
  roomIds: Array.isArray(dbTenant.room_ids) ? dbTenant.room_ids : [],
  rentMode: dbTenant.rent_mode || 'auto',
  customRentAmount: dbTenant.custom_rent_amount ? Number(dbTenant.custom_rent_amount) : undefined,
  startDate: dbTenant.start_date || '',
  rentCycle: dbTenant.rent_cycle || 'monthly'
});

const mapTenantToDb = (tenant: Partial<Tenant>, ownerId: string) => ({
  id: tenant.id,
  house_id: tenant.houseId,
  name: tenant.name,
  phone: tenant.phone,
  room_ids: tenant.roomIds,
  rent_mode: tenant.rentMode,
  custom_rent_amount: tenant.customRentAmount,
  start_date: tenant.startDate,
  rent_cycle: tenant.rentCycle,
  owner_id: ownerId
});

const mapPaymentFromDb = (p: any): Payment => ({
  id: p.id,
  houseId: p.house_id,
  tenantId: p.tenant_id,
  month: p.month,
  amountDue: Number(p.amount_due || 0),
  amountPaid: Number(p.amount_paid || 0),
  paymentDate: p.payment_date,
  status: p.status,
  baseRent: p.base_rent ? Number(p.base_rent) : undefined,
  electricityCharge: p.electricity_charge ? Number(p.electricity_charge) : undefined,
  waterCharge: p.water_charge ? Number(p.water_charge) : undefined,
  trashCharge: p.trash_charge ? Number(p.trash_charge) : undefined,
  otherCharges: p.other_charges ? Number(p.other_charges) : undefined
});

const mapPaymentToDb = (p: Partial<Payment>, ownerId: string) => ({
  id: p.id,
  house_id: p.houseId,
  tenant_id: p.tenantId,
  month: p.month,
  amount_due: p.amountDue,
  amount_paid: p.amountPaid,
  payment_date: p.paymentDate,
  status: p.status,
  base_rent: p.baseRent,
  electricity_charge: p.electricityCharge,
  water_charge: p.waterCharge,
  trash_charge: p.trashCharge,
  other_charges: p.otherCharges,
  owner_id: ownerId
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [globalAction, setGlobalAction] = useState<'onboard' | 'payment' | 'room' | 'meters' | null>(null);

  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const [activeHouseId, setActiveHouseId] = useState<string | null>(null);

  // Archived Items state
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>(() => {
    try {
      const saved = localStorage.getItem('PM_ARCHIVED_ROOMS_FLOORS');
      if (saved) {
        const parsed = JSON.parse(saved) as ArchivedItem[];
        const fifteenDaysAgo = new Date().getTime() - 15 * 24 * 60 * 60 * 1000;
        return parsed.filter(item => new Date(item.deletedAt).getTime() > fifteenDaysAgo);
      }
    } catch (e) {
      console.error('Failed to load archived rooms/floors', e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('PM_ARCHIVED_ROOMS_FLOORS', JSON.stringify(archivedItems));
  }, [archivedItems]);

  // Authenticated state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // To solve async state update lag when creating a property and room simultaneously
  const recentlyCreatedHouseIds = React.useRef<Set<string>>(new Set());

  // Safe seed fallback local state for offline sandbox or initial accounts
  const seedLocalMockData = () => {
    const demoHouse = {
      id: 'h-demo',
      name: 'demo',
      address: 'Kathmandu, Nepal',
      floors: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4']
    };

    const demoRooms = [
      { id: 'r-demo-1', houseId: 'h-demo', roomNumber: '101', rentAmount: 12000, floor: 'Floor 1' },
      { id: 'r-demo-2', houseId: 'h-demo', roomNumber: '201', rentAmount: 14500, floor: 'Floor 2' },
      { id: 'r-demo-3', houseId: 'h-demo', roomNumber: '301', rentAmount: 11000, floor: 'Floor 3' },
      { id: 'r-demo-4', houseId: 'h-demo', roomNumber: '401', rentAmount: 15000, floor: 'Floor 4' }
    ];

    const demoTenants = [
      {
        id: 't-demo-1',
        houseId: 'h-demo',
        name: 'Ram Bahadur',
        phone: '9841234567',
        roomIds: ['r-demo-1'],
        rentMode: 'auto' as const,
        startDate: '2026-05-10',
        rentCycle: 'monthly' as const,
        rentCollectionType: 'arrears' as const
      },
      {
        id: 't-demo-2',
        houseId: 'h-demo',
        name: 'Sita Kumari',
        phone: '9807654321',
        roomIds: ['r-demo-2'],
        rentMode: 'auto' as const,
        startDate: '2026-04-15',
        rentCycle: 'monthly' as const,
        rentCollectionType: 'arrears' as const
      },
      {
        id: 't-demo-3',
        houseId: 'h-demo',
        name: 'Hari Prasad',
        phone: '9812345678',
        roomIds: ['r-demo-3'],
        rentMode: 'auto' as const,
        startDate: '2026-06-03',
        rentCycle: 'monthly' as const,
        rentCollectionType: 'arrears' as const
      }
    ];

    const demoPayments = [
      {
        id: 'p-demo-1',
        houseId: 'h-demo',
        tenantId: 't-demo-2',
        month: '2026-04',
        amountDue: 14500,
        amountPaid: 14500,
        paymentDate: '2026-04-15',
        status: 'paid' as const
      }
    ];

    setHouses([demoHouse]);
    setRooms(demoRooms);
    setTenants(demoTenants);
    setPayments(demoPayments);
    setActiveHouseId('h-demo');
  };

  // Auth monitoring listener
  useEffect(() => {
    const savedSandbox = localStorage.getItem('PM_VIRTUAL_SANDBOX_USER');
    if (savedSandbox) {
      try {
        const sandboxUser = JSON.parse(savedSandbox);
        setUser(sandboxUser);
        setIsSandboxMode(true);
        setLoadingUser(false);
        return;
      } catch (e) {
        localStorage.removeItem('PM_VIRTUAL_SANDBOX_USER');
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (localStorage.getItem('PM_VIRTUAL_SANDBOX_USER')) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || ''
        });
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    }).catch(() => {
      // Handle fail-to-fetch elegantly during session load
      if (!localStorage.getItem('PM_VIRTUAL_SANDBOX_USER')) {
        setUser(null);
      }
      setLoadingUser(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem('PM_VIRTUAL_SANDBOX_USER')) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || ''
        });
      } else {
        setUser(null);
        setHouses([]);
        setRooms([]);
        setTenants([]);
        setPayments([]);
        setActiveHouseId(null);
      }
      setLoadingUser(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch from database reactively or seed if empty
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;

    const fetchDatabaseState = async () => {
      if (user.id === 'sandbox-user-id') {
        setIsSandboxMode(true);
        seedLocalMockData();
        return;
      }
      try {
        setIsSandboxMode(false);

        // Fetch houses first (owned OR shared with email)
        const { data: housesData, error: housesError } = await supabase
          .from('houses')
          .select('*')
          .or(`owner_id.eq.${user.id},shared_with_emails.cs.{${user.email}}`);

        if (housesError) {
          // If query returns a code indicating schema is missing, fallback to sandbox
          if (housesError.code === 'PGRST116' || housesError.message.includes('relation "public.houses" does not exist')) {
            console.warn('Houses table not found in Supabase. Running in connection-fallback Sandbox mode.');
            setIsSandboxMode(true);
            seedLocalMockData();
            return;
          }
          throw housesError;
        }

        if (!isSubscribed) return;

        // If user is brand new and has no online houses, start with clean slate
        if (!housesData || housesData.length === 0) {
          if (!isSubscribed) return;
          setHouses([]);
          setRooms([]);
          setTenants([]);
          setPayments([]);
          setActiveHouseId(null);
          return;
        }

        const validHouseIds = housesData.map(h => h.id);

        // Fetch remaining tables using house_ids
        const { data: roomsData } = await supabase.from('rooms').select('*').in('house_id', validHouseIds);
        const { data: tenantsData } = await supabase.from('tenants').select('*').in('house_id', validHouseIds);
        const { data: paymentsData } = await supabase.from('payments').select('*').in('house_id', validHouseIds);

        if (!isSubscribed) return;

        const cleanHouses = (housesData || []).map(mapHouseFromDb);
        const cleanRooms = (roomsData || []).map(mapRoomFromDb);
        const cleanTenants = (tenantsData || []).map(mapTenantFromDb);
        const cleanPayments = (paymentsData || []).map(mapPaymentFromDb);

        setHouses(cleanHouses);
        setRooms(cleanRooms);
        setTenants(cleanTenants);
        setPayments(cleanPayments);

        if (cleanHouses.length > 0) {
          setActiveHouseId(prev => {
            const exists = cleanHouses.some(h => h.id === prev);
            return exists ? prev : cleanHouses[0].id;
          });
        } else {
          setActiveHouseId(null);
        }

      } catch (err) {
        console.error('Error fetching from Supabase database:', err);
        setIsSandboxMode(true);
        seedLocalMockData();
      }
    };

    fetchDatabaseState();

    if (user.id === 'sandbox-user-id') {
      return () => {
        isSubscribed = false;
      };
    }

    // Listen to realtime updates if supported on databases
    const housesChannel = supabase.channel('realtime-rentals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'houses', filter: `owner_id=eq.${user.id}` }, () => fetchDatabaseState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `owner_id=eq.${user.id}` }, () => fetchDatabaseState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: `owner_id=eq.${user.id}` }, () => fetchDatabaseState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `owner_id=eq.${user.id}` }, () => fetchDatabaseState())
      .subscribe();

    return () => {
      isSubscribed = false;
      housesChannel.unsubscribe();
    };
  }, [user]);

  const loginAsSandbox = () => {
    const sandboxUser = {
      id: 'sandbox-user-id',
      displayName: 'Demo Landlord',
      email: 'sandbox@propertymanager.local'
    };
    localStorage.setItem('PM_VIRTUAL_SANDBOX_USER', JSON.stringify(sandboxUser));
    setUser(sandboxUser);
    setIsSandboxMode(true);
    seedLocalMockData();
  };

  const logout = () => {
    localStorage.removeItem('PM_VIRTUAL_SANDBOX_USER');
    supabase.auth.signOut().then(() => {
      setUser(null);
    }).catch(() => {
      setUser(null);
    });
  };

  const addHouse = (house: Omit<House, 'id'>) => {
    const id = generateId();
    const newHouse = { ...house, id };

    // Register this house ID as recently created to bypass active state update delay for instant room setup
    recentlyCreatedHouseIds.current.add(id);

    if (user && !isSandboxMode) {
      supabase.from('houses').insert(mapHouseToDb(newHouse, user.id)).then(({ error }) => {
        if (error) console.error('insert house error:', error);
      });
    }

    setHouses(prev => [...prev, newHouse]);
    if (!activeHouseId) setActiveHouseId(id);
    return id;
  };
  
  const updateHouse = (id: string, data: Partial<House>) => {
    // Strict ownership validation check: only allow operations on houses owned by this user
    const exists = houses.some(h => h.id === id);
    if (!exists) return;

    if (user && !isSandboxMode) {
      const dbData = mapHouseToDb({ ...houses.find(h => h.id === id), ...data, id }, user.id);
      supabase.from('houses').update(dbData).eq('id', id).then(({ error }) => {
        if (error) console.error('update house error:', error);
      });
    }

    setHouses(prev => prev.map(h => h.id === id ? { ...h, ...data } : h));
  };
  
  const restoreHouse = (id: string) => updateHouse(id, { isDeleted: false });

  const hardDeleteHouse = (id: string) => {
    // Strict ownership validation check: only allow operations on houses owned by this user
    const exists = houses.some(h => h.id === id);
    if (!exists) return;

    if (user && !isSandboxMode) {
      supabase.from('houses').delete().eq('id', id).then(() => {});
      supabase.from('rooms').delete().eq('house_id', id).then(() => {});
      supabase.from('tenants').delete().eq('house_id', id).then(() => {});
      supabase.from('payments').delete().eq('house_id', id).then(() => {});
    }

    setHouses(prev => prev.filter(h => h.id !== id));
    setRooms(prev => prev.filter(r => r.houseId !== id));
    setTenants(prev => prev.filter(t => t.houseId !== id));
    setPayments(prev => prev.filter(p => p.houseId !== id));
  };

  const deleteHouse = (id: string) => {
    // Strict ownership validation check: only allow operations on houses owned by this user
    const exists = houses.some(h => h.id === id);
    if (!exists) return;

    updateHouse(id, { isDeleted: true });
    
    const nextHouses = houses.filter(h => h.id !== id && !h.isDeleted);
    if (activeHouseId === id) {
      setActiveHouseId(nextHouses.length > 0 ? nextHouses[0].id : null);
    }
  };

  const addRoom = (room: Omit<Room, 'id'>) => {
    // Strict ownership validation check: only allow adding a room to a user's own property or a newly created one in this click event
    const ownsHouse = houses.some(h => h.id === room.houseId) || recentlyCreatedHouseIds.current.has(room.houseId);
    if (!ownsHouse) return;

    const id = generateId();
    const newRoom = { ...room, id };

    if (user && !isSandboxMode) {
      supabase.from('rooms').insert(mapRoomToDb(newRoom, user.id)).then(({ error }) => {
        if (error) console.error('insert room error:', error);
      });
    }

    setRooms(prev => [...prev, newRoom]);
  };

  const updateRoom = (id: string, data: Partial<Room>) => {
    // Strict ownership validation check: only allow operations on rooms owned by this user
    const targetRoom = rooms.find(r => r.id === id);
    if (!targetRoom || !houses.some(h => h.id === targetRoom.houseId)) return;

    if (user && !isSandboxMode) {
      const dbData = mapRoomToDb({ ...rooms.find(r => r.id === id), ...data, id }, user.id);
      supabase.from('rooms').update(dbData).eq('id', id).then(({ error }) => {
        if (error) console.error('update room error:', error);
      });
    }

    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deleteRoom = (id: string, preventArchive?: boolean) => {
    // Strict ownership validation check: only allow operations on rooms owned by this user
    const targetRoom = rooms.find(r => r.id === id);
    if (!targetRoom || !houses.some(h => h.id === targetRoom.houseId)) return;

    if (!preventArchive) {
      const newArchiveItem: ArchivedItem = {
        id: generateId(),
        type: 'room',
        name: `Room ${targetRoom.roomNumber} (${targetRoom.floor || 'No Floor'})`,
        deletedAt: new Date().toISOString(),
        houseId: targetRoom.houseId,
        roomData: targetRoom
      };
      setArchivedItems(prev => [newArchiveItem, ...prev]);
    }

    if (user && !isSandboxMode) {
      supabase.from('rooms').delete().eq('id', id).then(() => {});
      // Remove room id references inside tenant documents
      tenants.forEach(t => {
        if (t.roomIds.includes(id)) {
          const nextRoomIds = t.roomIds.filter(r => r !== id);
          supabase.from('tenants').update({ room_ids: nextRoomIds }).eq('id', t.id).then(() => {});
        }
      });
    }

    setRooms(prev => prev.filter(r => r.id !== id));
    setTenants(prev => prev.map(t => ({
      ...t,
      roomIds: t.roomIds.filter(rId => rId !== id)
    })));
  };

  const deleteFloor = (houseId: string, floorName: string) => {
    const exists = houses.some(h => h.id === houseId);
    if (!exists) return;

    const roomsInFloor = rooms.filter(r => r.houseId === houseId && (r.floor || 'Floor 1') === floorName);

    const newArchiveItem: ArchivedItem = {
      id: generateId(),
      type: 'floor',
      name: `${floorName}`,
      deletedAt: new Date().toISOString(),
      houseId,
      floorData: {
        name: floorName,
        rooms: roomsInFloor
      }
    };
    setArchivedItems(prev => [newArchiveItem, ...prev]);

    roomsInFloor.forEach(r => {
      deleteRoom(r.id, true);
    });

    const house = houses.find(h => h.id === houseId);
    if (house) {
      const currentFloors = house.floors || [];
      updateHouse(houseId, {
        floors: currentFloors.filter(f => f !== floorName)
      });
    }
  };

  const restoreArchivedItem = (itemId: string) => {
    const item = archivedItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'room' && item.roomData) {
      const room = item.roomData;
      if (user && !isSandboxMode) {
        supabase.from('rooms').insert(mapRoomToDb(room, user.id)).then(({ error }) => {
          if (error) console.error('insert room error during restore:', error);
        });
      }
      setRooms(prev => [...prev, room]);

      const house = houses.find(h => h.id === room.houseId);
      if (house) {
        const floorName = room.floor || 'Floor 1';
        const currentFloors = house.floors || [];
        if (!currentFloors.includes(floorName)) {
          updateHouse(room.houseId, {
            floors: [...currentFloors, floorName]
          });
        }
      }
    } else if (item.type === 'floor' && item.floorData) {
      const { name: floorName, rooms: restoredRooms } = item.floorData;

      const house = houses.find(h => h.id === item.houseId);
      if (house) {
        const currentFloors = house.floors || [];
        if (!currentFloors.includes(floorName)) {
          updateHouse(item.houseId, {
            floors: [...currentFloors, floorName]
          });
        }
      }

      restoredRooms.forEach(room => {
        if (user && !isSandboxMode) {
          supabase.from('rooms').insert(mapRoomToDb(room, user.id)).then(({ error }) => {
            if (error) console.error('insert restored room error:', error);
          });
        }
      });
      setRooms(prev => [...prev, ...restoredRooms]);
    }

    setArchivedItems(prev => prev.filter(i => i.id !== itemId));
  };

  const deleteArchivedItemPermanently = (itemId: string) => {
    setArchivedItems(prev => prev.filter(i => i.id !== itemId));
  };

  const addTenant = (tenant: Omit<Tenant, 'id'>) => {
    // Strict ownership validation check: only allow adding a tenant to a user's own property
    const ownsHouse = houses.some(h => h.id === tenant.houseId);
    if (!ownsHouse) return;

    const id = generateId();
    const newTenant = { ...tenant, id };

    if (user && !isSandboxMode) {
      supabase.from('tenants').insert(mapTenantToDb(newTenant, user.id)).then(({ error }) => {
        if (error) console.error('insert tenant error:', error);
      });
    }

    setTenants(prev => [...prev, newTenant]);
  };

  const updateTenant = (id: string, data: Partial<Tenant>) => {
    // Strict ownership validation check: only allow operations on tenants owned by this user
    const targetTenant = tenants.find(t => t.id === id);
    if (!targetTenant || !houses.some(h => h.id === targetTenant.houseId)) return;

    if (user && !isSandboxMode) {
      const dbData = mapTenantToDb({ ...tenants.find(t => t.id === id), ...data, id }, user.id);
      supabase.from('tenants').update(dbData).eq('id', id).then(({ error }) => {
        if (error) console.error('update tenant error:', error);
      });
    }

    setTenants(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  };

  const deleteTenant = (id: string) => {
    // Strict ownership validation check: only allow operations on tenants owned by this user
    const targetTenant = tenants.find(t => t.id === id);
    if (!targetTenant || !houses.some(h => h.id === targetTenant.houseId)) return;

    if (user && !isSandboxMode) {
      supabase.from('tenants').delete().eq('id', id).then(() => {});
      supabase.from('payments').delete().eq('tenant_id', id).then(() => {});
    }

    setTenants(prev => prev.filter(t => t.id !== id));
    setPayments(prev => prev.filter(p => p.tenantId !== id));
  };

  const addPayment = (payment: Omit<Payment, 'id'>) => {
    // Strict ownership validation check: only allow adding payments to a user's own property
    const ownsHouse = houses.some(h => h.id === payment.houseId);
    if (!ownsHouse) return;

    const id = generateId();
    const newPayment = { ...payment, id };

    if (user && !isSandboxMode) {
      supabase.from('payments').insert(mapPaymentToDb(newPayment, user.id)).then(({ error }) => {
        if (error) console.error('insert payment error:', error);
      });
    }

    setPayments(prev => [...prev, newPayment]);
  };

  const updatePayment = (id: string, data: Partial<Payment>) => {
    // Strict ownership validation check: only allow operations on payments owned by this user
    const targetPayment = payments.find(p => p.id === id);
    if (!targetPayment || !houses.some(h => h.id === targetPayment.houseId)) return;

    if (user && !isSandboxMode) {
      const dbData = mapPaymentToDb({ ...payments.find(p => p.id === id), ...data, id }, user.id);
      supabase.from('payments').update(dbData).eq('id', id).then(({ error }) => {
        if (error) console.error('update payment error:', error);
      });
    }

    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

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
      archivedItems, deleteFloor, restoreArchivedItem, deleteArchivedItemPermanently,
      user, loadingUser, logout, loginAsSandbox, isSandboxMode,
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
