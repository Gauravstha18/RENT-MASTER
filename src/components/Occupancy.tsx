import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Home, UserPlus, DoorOpen, MoreVertical, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { Room, Tenant, RentCycle, TenantDocument } from '../types';
import { formatWithNepaliDate, getTodayDateStr, calculateProRatedAmount, getRentDueInfo } from '../lib/dateUtils';

export function Occupancy() {
  const { houses, rooms, tenants, payments, activeHouseId, updateRoom, addTenant, updateTenant, deleteTenant, getTenantTotalRent, globalAction, setGlobalAction, searchTargetRoomId, setSearchTargetRoomId } = useAppContext();
  
  const currentHouse = houses.find(h => h.id === activeHouseId);

  // Expanded Room Breakdowns state
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});

  const [confirmDeleteTenantId, setConfirmDeleteTenantId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'vacant' | 'overdue'>('all');
  const [rentCycleFilter, setRentCycleFilter] = useState<'all' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [sortBy, setSortBy] = useState<'floor' | 'status' | 'price_asc' | 'price_desc'>('floor');
  const [showFilters, setShowFilters] = useState(false);

  // State for editing room rent
  const [editingRoomRentId, setEditingRoomRentId] = useState<string | null>(null);
  const [newRentValue, setNewRentValue] = useState('');

  // Tenant Modal State
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedHouseId, setSelectedHouseId] = useState(activeHouseId);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [rentMode, setRentMode] = useState<'auto' | 'manual'>('auto');
  const [customRent, setCustomRent] = useState('');
  const [startDate, setStartDate] = useState(() => getTodayDateStr());
  const [rentCycle, setRentCycle] = useState<RentCycle>('monthly');
  const [rentCollectionType, setRentCollectionType] = useState<'advance' | 'arrears'>('arrears');
  const [dateOption, setDateOption] = useState<'current' | 'custom'>('current');

  // Meter Modal State
  const [meterModalRoom, setMeterModalRoom] = useState<Room | null>(null);
  const [meterElecPrev, setMeterElecPrev] = useState('');
  const [meterElecCurr, setMeterElecCurr] = useState('');
  const [meterWaterPrev, setMeterWaterPrev] = useState('');
  const [meterWaterCurr, setMeterWaterCurr] = useState('');

  // Tenant Ledger Modal State
  const [ledgerTenant, setLedgerTenant] = useState<Tenant | null>(null);

  const openMeterModal = (room: Room) => {
    setMeterModalRoom(room);
    setMeterElecPrev(room.previousElectricityReading?.toString() || '');
    setMeterElecCurr(room.currentElectricityReading?.toString() || '');
    setMeterWaterPrev(room.previousWaterReading?.toString() || '');
    setMeterWaterCurr(room.currentWaterReading?.toString() || '');
  };

  const handleSaveMeters = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterModalRoom) return;
    updateRoom(meterModalRoom.id, {
      previousElectricityReading: meterElecPrev ? Number(meterElecPrev) : undefined,
      currentElectricityReading: meterElecCurr ? Number(meterElecCurr) : undefined,
      previousWaterReading: meterWaterPrev ? Number(meterWaterPrev) : undefined,
      currentWaterReading: meterWaterCurr ? Number(meterWaterCurr) : undefined,
    });
    setMeterModalRoom(null);
  };

  const houseRooms = rooms.filter(r => r.houseId === activeHouseId);
  const houseTenants = tenants.filter(t => t.houseId === activeHouseId);

  useEffect(() => {
    if (globalAction === 'onboard') {
      openTenantModal();
      setGlobalAction(null);
    } else if (globalAction === 'meters') {
      if (houseRooms.length > 0) {
        openMeterModal(houseRooms[0]);
      }
      setGlobalAction(null);
    }
  }, [globalAction, houseRooms, setGlobalAction]);

  // Scroll and highlight room/tenant card when search target is set
  useEffect(() => {
    if (searchTargetRoomId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`room-card-${searchTargetRoomId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add highlight animation classes
          element.classList.add('ring-4', 'ring-teal-500/80', 'scale-[1.02]', 'shadow-xl');
          
          // Remove them after a delay
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-teal-500/80', 'scale-[1.02]', 'shadow-xl');
            setSearchTargetRoomId(null);
          }, 3000);
        } else {
          // Reset filters to reveal the hidden room card
          setStatusFilter('all');
          setFloorFilter('all');
          setRentCycleFilter('all');
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchTargetRoomId, setSearchTargetRoomId]);

  // Cross-reference data
  const occupiedRoomIds = new Set<string>();
  const roomToTenantMap = new Map<string, Tenant>();
  
  houseTenants.forEach(t => {
    t.roomIds.forEach(id => {
      occupiedRoomIds.add(id);
      roomToTenantMap.set(id, t);
    });
  });

  // Calculate disabled rooms for Tenant Modal
  const occupiedRoomsForModal = new Set(
    houseTenants
      .filter(t => t.id !== editingTenant?.id) 
      .flatMap(t => t.roomIds)
  );

  // --- Tenant Handlers ---
  const openTenantModal = (tenant?: Tenant, preSelectRoomId?: string) => {
    if (tenant) {
      setEditingTenant(tenant);
      setName(tenant.name);
      setPhone(tenant.phone);
      setImageUrl(tenant.imageUrl || '');
      setDocuments(tenant.documents || []);
      setNotes(tenant.notes || '');
      setSelectedHouseId(tenant.houseId);
      setSelectedRooms(tenant.roomIds);
      setRentMode(tenant.rentMode);
      setCustomRent(tenant.customRentAmount?.toString() || '');
      setStartDate(tenant.startDate || getTodayDateStr());
      setRentCycle(tenant.rentCycle || 'monthly');
      setRentCollectionType(tenant.rentCollectionType || 'arrears');
      setDateOption('custom');
    } else {
      setEditingTenant(null);
      setName('');
      setPhone('');
      setImageUrl('');
      setDocuments([]);
      setNotes('');
      setSelectedHouseId(activeHouseId);
      setSelectedRooms(preSelectRoomId ? [preSelectRoomId] : []);
      setRentMode('auto');
      setCustomRent('');
      setStartDate(getTodayDateStr());
      setRentCycle('monthly');
      setRentCollectionType('arrears');
      setDateOption('current');
    }
    setIsTenantModalOpen(true);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newDoc: TenantDocument = {
          id: Date.now().toString(),
          name: file.name,
          url: reader.result as string,
          addedAt: new Date().toISOString()
        };
        setDocuments(prev => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const handleTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHouseId || !name.trim() || selectedRooms.length === 0) {
      alert("Please provide a name and select at least one room.");
      return;
    }

    const finalStartDate = dateOption === 'current' ? getTodayDateStr() : (startDate || getTodayDateStr());

    const payload = {
      houseId: selectedHouseId,
      name,
      phone,
      imageUrl,
      documents,
      notes,
      roomIds: selectedRooms,
      rentMode,
      customRentAmount: rentMode === 'manual' ? Number(customRent) : undefined,
      startDate: finalStartDate,
      rentCycle,
      rentCollectionType
    };

    if (editingTenant) {
      updateTenant(editingTenant.id, payload);
    } else {
      addTenant(payload);
    }
    setIsTenantModalOpen(false);
  };

  const handleTenantDelete = (tenantId: string) => {
    setConfirmDeleteTenantId(tenantId);
  };

  const executeDeleteTenant = () => {
    if (!confirmDeleteTenantId) return;
    deleteTenant(confirmDeleteTenantId);
    setConfirmDeleteTenantId(null);
  };

  if (!activeHouseId) return null;

  const [floorFilter, setFloorFilter] = useState<string>('all');
  
  // Group rooms by floor
  const floorsMap = new Map<string, Room[]>();
  houseRooms.forEach(room => {
    const f = room.floor && room.floor.trim() !== '' ? room.floor : 'Floor 1';
    if (!floorsMap.has(f)) {
      floorsMap.set(f, []);
    }
    floorsMap.get(f)!.push(room);
  });
  
  const uniqueFloors = Array.from(floorsMap.keys()).sort();

  // Prepare sorting groups
  let renderGroups: { id: string; title: string; rooms: Room[] }[] = [];
  
  if (sortBy === 'floor') {
    renderGroups = uniqueFloors.map(f => ({ id: f, title: f, rooms: floorsMap.get(f)! }));
  } else {
    let sortedRooms = [...houseRooms];
    if (sortBy === 'price_asc') {
      sortedRooms.sort((a, b) => a.rentAmount - b.rentAmount);
    } else if (sortBy === 'price_desc') {
      sortedRooms.sort((a, b) => b.rentAmount - a.rentAmount);
    } else if (sortBy === 'status') {
      sortedRooms.sort((a, b) => {
        const aOccupied = occupiedRoomIds.has(a.id) ? 1 : 0;
        const bOccupied = occupiedRoomIds.has(b.id) ? 1 : 0;
        return bOccupied - aOccupied;
      });
    }
    renderGroups = [{ id: 'all', title: 'All Rooms', rooms: sortedRooms }];
  }

  // Analytics Calculations
  const totalRoomsCount = houseRooms.length;
  const occupiedRoomsCount = occupiedRoomIds.size;
  const occupancyRate = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;

  const currentMonthStr = getTodayDateStr().substring(0, 7);
  
  let totalRentCollectedMonth = 0;
  let totalPendingMonth = 0;

  houseTenants.forEach(t => {
    const pmt = payments.find(p => p.tenantId === t.id && p.month === currentMonthStr);
    if (pmt) {
      totalRentCollectedMonth += pmt.amountPaid;
      totalPendingMonth += Math.max(0, pmt.amountDue - pmt.amountPaid);
    } else {
      const expected = getTenantTotalRent(t);
      totalPendingMonth += expected;
    }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      
      {/* Advanced Filters */}
      <div className="flex flex-col gap-3 w-full">
        <div className="flex justify-end w-full">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${showFilters ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 shadow-sm'}`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4 opacity-50 ml-1 hidden sm:block" /> : <ChevronDown className="w-4 h-4 opacity-50 ml-1 hidden sm:block" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 bg-zinc-50/80 p-4 rounded-xl border border-zinc-100 animate-in fade-in slide-in-from-top-2 duration-200 mb-2">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Filter by Floor</label>
              <select
                value={floorFilter}
                onChange={e => setFloorFilter(e.target.value)}
                className="w-full bg-white border border-zinc-200 text-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="all">All Floors</option>
                {uniqueFloors.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Occupancy Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'occupied' | 'vacant' | 'overdue')}
                className="w-full bg-white border border-zinc-200 text-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="occupied">Occupied Only</option>
                <option value="vacant">Vacant Only</option>
                <option value="overdue">Overdue Only</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Sort Options</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="w-full bg-white border border-zinc-200 text-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="floor">Default (Floor then Room)</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Aggregated Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Occupancy Rate</span>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-zinc-800">{occupancyRate}%</span>
            <span className="text-sm font-medium text-zinc-500 mb-1">({occupiedRoomsCount}/{totalRoomsCount} rooms)</span>
          </div>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Collected (This Month)</span>
          <span className="text-2xl font-bold text-emerald-700">NPR {totalRentCollectedMonth.toLocaleString()}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Pending Defaults</span>
          <span className="text-2xl font-bold text-amber-700">NPR {totalPendingMonth.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-col bg-white p-3 sm:p-4 rounded-xl border border-zinc-200 shadow-sm gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-zinc-800 ml-1 sm:ml-2">Rooms & Tenants Overview</h3>
            <p className="text-[10px] sm:text-xs text-zinc-500 ml-1 sm:ml-2 mt-1">Manage occupancy and assign tenants. For room management, see the Property Layout tab.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap md:flex-nowrap w-full md:w-auto">
            <button 
              onClick={() => openTenantModal()}
              className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-teal-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-teal-700 transition-colors shadow-sm text-sm font-semibold cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" /> Add Tenant
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {houseRooms.length === 0 && (
          <div className="p-8 sm:p-12 text-center bg-white rounded-xl border border-zinc-200 border-dashed">
            <p className="text-zinc-500 font-medium text-sm sm:text-base">No rooms added to this property yet.</p>
          </div>
        )}
        
        {renderGroups.filter(g => sortBy !== 'floor' || floorFilter === 'all' || floorFilter === g.id).map(group => (
          <div key={group.id} className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-4 sticky top-0 z-20 py-2 backdrop-blur-md bg-zinc-50/90 -mx-4 px-4 sm:mx-0 sm:px-0 mt-4 md:mt-0">
              <h4 className="text-sm sm:text-base font-bold text-zinc-700 uppercase tracking-widest shrink-0">{group.title}</h4>
              <div className="h-px bg-zinc-200 flex-1"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {(() => {
                const filteredRooms = group.rooms.filter(room => {
                  const isOccupied = occupiedRoomIds.has(room.id);
                  const tenant = roomToTenantMap.get(room.id);
                  const todayStr = getTodayDateStr();
                  const dueInfo = tenant ? getRentDueInfo(tenant, payments, todayStr) : null;
                  
                  // Filter by Status
                  if (statusFilter === 'occupied' && !isOccupied) return false;
                  if (statusFilter === 'vacant' && isOccupied) return false;
                  if (statusFilter === 'overdue' && !dueInfo?.isOverdue) return false;

                  // Filter by Rent Cycle
                  if (rentCycleFilter !== 'all' && tenant?.rentCycle !== rentCycleFilter) return false;

                  return true;
                });

                if (filteredRooms.length === 0) {
                  return (
                    <div className="col-span-full py-8 text-center text-zinc-500 text-xs font-medium">
                      No matching rooms or tenants found in this section.
                    </div>
                  );
                }

                return filteredRooms.map(room => {
                  const isOccupied = occupiedRoomIds.has(room.id);
                  const tenant = roomToTenantMap.get(room.id);
                  const expectedRent = tenant ? getTenantTotalRent(tenant) : 0;
                  const todayStr = getTodayDateStr();
                  const calcArgs = tenant && tenant.startDate ? calculateProRatedAmount(tenant.startDate, todayStr, expectedRent, tenant.rentCycle) : null;
                  const dueInfo = tenant ? getRentDueInfo(tenant, payments, todayStr) : null;
                  
                  return (
                    <div key={room.id} id={`room-card-${room.id}`} className={`bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
                      dueInfo?.isOverdue 
                        ? 'border border-amber-200 shadow-[0_8px_30px_rgb(251,146,60,0.12)]' 
                        : isOccupied 
                          ? 'border border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]' 
                          : 'border border-zinc-200 shadow-sm hover:shadow-md'
                    }`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center ${
                dueInfo?.isOverdue 
                  ? 'bg-gradient-to-r from-amber-50/50 to-transparent border-amber-100' 
                  : isOccupied 
                    ? 'bg-gradient-to-r from-emerald-50/50 to-transparent border-emerald-100/50' 
                    : 'bg-gradient-to-r from-red-50/30 to-transparent border-zinc-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isOccupied ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-400 shadow-red-400/50'}`}></div>
                  <h4 className="font-bold text-zinc-900 text-xl font-mono flex items-center gap-3">
                    {room.roomNumber}
                    {room.floor && <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-zinc-500 bg-white px-2.5 py-1 rounded-full border border-zinc-200 shadow-sm">{room.floor}</span>}
                  </h4>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col gap-5">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Base Room Rent</span>
                  {editingRoomRentId === room.id ? (
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-zinc-500 font-mono font-bold">NPR</span>
                      <input
                        type="number"
                        value={newRentValue}
                        onChange={(e) => setNewRentValue(e.target.value)}
                        className="w-24 px-2 py-1 border border-teal-300 rounded text-sm font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-teal-500 outline-none bg-white shadow-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Number(newRentValue);
                          if (!isNaN(val) && val >= 0) {
                            updateRoom(room.id, { rentAmount: val });
                          }
                          setEditingRoomRentId(null);
                        }}
                        className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded text-xs font-bold transition-colors cursor-pointer border border-emerald-100"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoomRentId(null)}
                        className="px-2.5 py-1 text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded text-xs font-bold transition-colors cursor-pointer border border-zinc-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg text-zinc-900">NPR {room.rentAmount}</span>
                      <button
                        title="Edit Base Rent"
                        onClick={() => {
                          setEditingRoomRentId(room.id);
                          setNewRentValue(room.rentAmount.toString());
                        }}
                        className="p-1.5 text-zinc-500 border border-transparent hover:border-zinc-200 hover:text-teal-600 hover:bg-zinc-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  {isOccupied && tenant ? (
                    <div className="flex flex-col gap-5 h-full">
                      <div className="flex flex-col gap-2.5">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Current Occupant</p>
                        <div className="flex justify-between items-center bg-zinc-50/50 rounded-xl p-3 border border-zinc-100/80 shadow-[0_1px_2px_rgb(0,0,0,0.02)]">
                          <div className="flex gap-3 items-center">
                            {tenant.imageUrl ? (
                              <img src={tenant.imageUrl} alt={tenant.name} className="w-10 h-10 rounded-full object-cover border border-zinc-200 shadow-sm" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center text-teal-700 font-bold border border-teal-200 shadow-sm text-base">
                                {String(tenant.name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col justify-center">
                                <p className="font-semibold text-zinc-900 text-sm leading-tight tracking-tight">{tenant.name}</p>
                                <p className="text-xs text-zinc-500 mt-0.5 font-mono">{tenant.phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => setLedgerTenant(tenant)} className="text-[10px] font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded transition-colors uppercase tracking-widest border border-zinc-200 hover:border-blue-200 shadow-sm">History</button>
                            <button onClick={() => openTenantModal(tenant)} className="text-[10px] font-bold text-teal-700 hover:text-teal-800 bg-white hover:bg-teal-50 px-2.5 py-1.5 rounded transition-colors uppercase tracking-widest border border-zinc-200 hover:border-teal-200 shadow-sm">Edit</button>
                            <button onClick={() => handleTenantDelete(tenant.id)} className="text-[10px] font-bold text-red-700 hover:text-red-800 bg-white hover:bg-red-50 px-2.5 py-1.5 rounded transition-colors uppercase tracking-widest border border-zinc-200 hover:border-red-200 shadow-sm">Delete</button>
                          </div>
                        </div>
                      </div>
                      
                      {tenant.notes && (
                        <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/50 shadow-sm">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-amber-800/70 mb-2">Manager Notes</p>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{tenant.notes}</p>
                        </div>
                      )}

                      <div className="flex flex-col bg-gradient-to-b from-zinc-50/80 to-white p-4 rounded-xl border border-zinc-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                        <div className="flex justify-between items-center border-b border-zinc-200/60 pb-3 mb-3">
                          <span className="text-[11px] font-bold text-zinc-500 tracking-widest uppercase pl-1">Utilities &amp; Billing</span>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <button 
                              onClick={() => openMeterModal(room)}
                              className="text-[10px] font-bold bg-amber-100/60 text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm border border-amber-200/50"
                            >
                              Update Meter Readings
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-0.5">Total Due / {tenant.rentCycle}</p>
                              <p className="font-mono font-bold text-zinc-900 text-[15px]">NPR {getTenantTotalRent(tenant)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-0.5">Joined Since</p>
                              <p className="font-mono font-medium text-zinc-800 text-sm" title={formatWithNepaliDate(tenant.startDate)}>
                                {formatWithNepaliDate(tenant.startDate)}
                              </p>
                            </div>
                          </div>
                          
                          {dueInfo && (
                            <div className="pt-2 border-t border-zinc-100">
                              <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-0.5">Rent Due Status</p>
                              <p className={`text-[13px] font-bold ${dueInfo.inlineStyleClass}`}>{dueInfo.displayText}</p>
                            </div>
                          )}
                          
                          {calcArgs && (
                            <div className="pt-2 border-t border-zinc-100 flex justify-between items-end">
                              <div>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-teal-600 mb-0.5">Billed Till Today</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] text-zinc-500 leading-none">Today: {formatWithNepaliDate(todayStr)}</p>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedBreakdowns(prev => ({ ...prev, [room.id]: !prev[room.id] }))}
                                    className={`p-1 rounded transition-colors border ${expandedBreakdowns[room.id] ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 shadow-sm'}`}
                                    title="Toggle Details Breakdown"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-teal-700 text-[15px] leading-tight">NPR {calcArgs.due}</p>
                                <p className="text-[10px] text-zinc-500 font-medium">{calcArgs.daysActive} days active</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {expandedBreakdowns[room.id] && (() => {
                          const baseRent = tenant.rentMode === 'manual' ? (tenant.customRentAmount || 0) : room.rentAmount;
                          
                          let elecUnits = 0;
                          let elecCost = 0;
                          const elecRate = currentHouse?.electricityRate || 0;
                          if (currentHouse?.electricityBillingType === 'unit') {
                            elecUnits = Math.max(0, (room.currentElectricityReading || 0) - (room.previousElectricityReading || 0));
                            elecCost = elecUnits * elecRate;
                          } else if (currentHouse?.electricityBillingType === 'fixed') {
                            elecCost = elecRate;
                          }

                          let waterUnits = 0;
                          let waterCost = 0;
                          const waterRate = currentHouse?.waterRate || 0;
                          if (currentHouse?.waterBillingType === 'unit') {
                            waterUnits = Math.max(0, (room.currentWaterReading || 0) - (room.previousWaterReading || 0));
                            waterCost = waterUnits * waterRate;
                          } else if (currentHouse?.waterBillingType === 'fixed') {
                            waterCost = waterRate;
                          }

                          const trashCost = currentHouse?.trashCollectionRate || 0;
                          
                          const proratedBase = calcArgs ? calcArgs.due : baseRent;
                          const grandTotalCycle = baseRent + elecCost + waterCost + trashCost;
                          const grandTotalToday = proratedBase + elecCost + waterCost + trashCost;

                          return (
                            <div className="col-span-2 mt-3 pt-3 border-t border-dashed border-zinc-200 bg-zinc-100/60 p-2.5 rounded-lg text-zinc-700 text-[11px] space-y-2 animate-in slide-in-from-top-1 duration-200">
                              <h5 className="font-bold text-[10px] text-teal-600 uppercase tracking-widest">Billed Amount Breakdown</h5>
                              
                              <div className="space-y-1 font-mono">
                                <div className="flex justify-between items-center">
                                  <span>Base Rent (Cycle):</span>
                                  <span className="font-semibold text-zinc-900">NPR {baseRent}</span>
                                </div>
                                {calcArgs && (
                                  <div className="flex justify-between items-center text-teal-600/90 pl-2 border-l border-teal-200">
                                    <span>↳ Pro-rated Till Today:</span>
                                    <span className="font-semibold">NPR {proratedBase}</span>
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center">
                                  <span>Electricity {currentHouse?.electricityBillingType === 'unit' ? `(${elecUnits} units)` : '(Fixed)'}:</span>
                                  <span className="font-semibold text-zinc-900">NPR {elecCost}</span>
                                </div>
                                {currentHouse?.electricityBillingType === 'unit' && (
                                  <div className="text-[9px] text-zinc-500 pl-2">
                                    {room.previousElectricityReading || 0} Prev ➔ {room.currentElectricityReading || 0} Curr @ NPR {elecRate}/u
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span>Water {currentHouse?.waterBillingType === 'unit' ? `(${waterUnits} units)` : '(Fixed)'}:</span>
                                  <span className="font-semibold text-zinc-900">NPR {waterCost}</span>
                                </div>
                                {currentHouse?.waterBillingType === 'unit' && (
                                  <div className="text-[9px] text-zinc-500 pl-2">
                                    {room.previousWaterReading || 0} Prev ➔ {room.currentWaterReading || 0} Curr @ NPR {waterRate}/u
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span>Trash Fee:</span>
                                  <span className="font-semibold text-zinc-900">NPR {trashCost}</span>
                                </div>
                              </div>

                              <div className="border-t border-zinc-200 pt-1.5 flex justify-between font-bold text-zinc-900">
                                <span>Grand Total (Today):</span>
                                <span className="text-teal-600 font-bold">NPR {grandTotalToday}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
                      <p className="text-sm font-medium text-red-600 mb-3">Room is vacant</p>
                      <button 
                        onClick={() => openTenantModal(undefined, room.id)}
                        className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        Assign to New Tenant
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Modals placed at the end */}
      <Modal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)} title={editingTenant ? "Edit Tenant Profile" : "Onboard New Tenant"}>
        <form onSubmit={handleTenantSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">Tenant Picture</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors border-2 border-dashed border-zinc-300"
              >
                <UserPlus className="w-6 h-6 text-zinc-500" />
              </button>
              {imageUrl && (
                <img src={imageUrl} alt="Tenant Preview" className="w-16 h-16 rounded-full object-cover border border-zinc-200" />
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setImageUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Phone Number</label>
              <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add specific tenant details or history..."
              className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-zinc-700">Documents & IDs</label>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="text-xs text-teal-600 font-bold hover:text-teal-700"
              >
                + Add File
              </button>
            </div>
            <input
              type="file"
              ref={docInputRef}
              className="hidden"
              onChange={handleDocumentUpload}
            />
            {documents.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto w-full">
                {documents.map(doc => (
                  <div key={doc.id} className="flex justify-between items-center p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <span className="text-xs text-zinc-700 truncate max-w-[200px]" title={doc.name}>{doc.name}</span>
                    <button type="button" onClick={() => removeDocument(doc.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 p-2 text-center bg-zinc-50 border border-zinc-200 border-dashed rounded-lg">
                No documents uploaded yet.
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Rent Collection Cycle Style</label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={() => setRentCollectionType('arrears')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  rentCollectionType === 'arrears'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                In Arrears (After Month Ends)
              </button>
              <button
                type="button"
                onClick={() => setRentCollectionType('advance')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  rentCollectionType === 'advance'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                In Advance (Upfront at Joining)
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {rentCollectionType === 'arrears' 
                ? 'Calculates dues only after each month/period starts and completes fully.' 
                : 'Rent starts and is owed as due on the first day of joining.'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Select Property</label>
            <select 
              value={selectedHouseId} 
              onChange={(e) => { 
                setSelectedHouseId(e.target.value); 
                setSelectedRooms([]); 
              }} 
              className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white"
            >
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Assign Rooms</label>
            <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-lg p-2 space-y-1 bg-zinc-50">
              {rooms.filter(r => r.houseId === selectedHouseId)
                .sort((a, b) => String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''), undefined, { numeric: true }))
                .map(room => {
                const isOccupiedByOther = occupiedRoomsForModal.has(room.id);
                return (
                  <label key={room.id} className={`flex items-center p-2 rounded-md transition-colors ${isOccupiedByOther ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-50 cursor-pointer'} ${selectedRooms.includes(room.id) ? 'bg-teal-50 border border-teal-200 shadow-sm' : 'border border-transparent'}`}>
                    <input 
                      type="checkbox" 
                      className="rounded text-teal-600 mr-3 w-4 h-4"
                      disabled={isOccupiedByOther}
                      checked={selectedRooms.includes(room.id)}
                      onChange={() => handleRoomToggle(room.id)}
                    />
                    <div className="flex-1 flex items-center gap-2">
                       <span className="font-semibold text-zinc-800">{room.roomNumber}</span>
                       {room.floor && <span className="text-[10px] text-zinc-500 bg-white px-1.5 py-0.5 rounded border border-zinc-200">{room.floor}</span>}
                    </div>
                    <span className="text-zinc-600 text-sm font-mono mr-2">NPR {room.rentAmount}</span>
                    {isOccupiedByOther && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded">Occupied</span>}
                  </label>
                )
              })}
              {rooms.filter(r => r.houseId === selectedHouseId).length === 0 && <p className="text-sm text-zinc-500 p-2 text-center">No rooms available in this property to assign.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Rent Cycle</label>
              <select value={rentCycle} onChange={e => setRentCycle(e.target.value as RentCycle)} className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Onboarding / Join Date Option</label>
              <div className="grid grid-cols-2 gap-2 p-1 border border-zinc-200 rounded-lg bg-zinc-50">
                <button
                  type="button"
                  onClick={() => setDateOption('current')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${dateOption === 'current' ? 'bg-white text-teal-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Current Date (Today)
                </button>
                <button
                  type="button"
                  onClick={() => setDateOption('custom')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${dateOption === 'custom' ? 'bg-white text-teal-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Custom Historic Date
                </button>
              </div>
            </div>
          </div>

          <div>
            {dateOption === 'custom' ? (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-1">
                <label className="block text-xs font-bold text-teal-600 uppercase">Select Custom / Historic Date Joined</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm" 
                />
                <p className="text-[11px] text-zinc-500">Specify when the tenant originally assigned or occupied the room.</p>
              </div>
            ) : (
              <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100/50 text-xs text-teal-600">
                Automatically onboarding tenant with today's date (<strong className="font-mono">{getTodayDateStr()}</strong>) as the Join Date.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Rent Calculation</label>
            <div className="flex gap-6 p-3 border border-zinc-100 rounded-lg bg-zinc-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="auto" checked={rentMode === 'auto'} onChange={() => setRentMode('auto')} className="text-teal-600" />
                <span className="text-sm font-medium text-zinc-700">Auto Calculate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="manual" checked={rentMode === 'manual'} onChange={() => setRentMode('manual')} className="text-teal-600" />
                <span className="text-sm font-medium text-zinc-700">Custom Rate</span>
              </label>
            </div>
          </div>

          {rentMode === 'manual' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Custom Total Amount (NPR)</label>
              <input required type="number" min="0" step="any" value={customRent} onChange={e => setCustomRent(e.target.value)} className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none flex-1 text-sm" />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200/60 mt-4">
            <button type="button" onClick={() => setIsTenantModalOpen(false)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
              {editingTenant ? 'Save Profiler' : 'Onboard Tenant'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!meterModalRoom} onClose={() => setMeterModalRoom(null)} title={`Meters: ${meterModalRoom?.roomNumber || ''}`}>
        {meterModalRoom && (
          <form onSubmit={handleSaveMeters} className="space-y-4">
            {currentHouse?.electricityBillingType === 'unit' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-zinc-800 mb-3 border-b border-zinc-200 pb-2">Electricity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-1">Previous (Prev)</label>
                    <input type="number" value={meterElecPrev} onChange={e => setMeterElecPrev(e.target.value)} className="w-full p-2 border border-zinc-300 rounded focus:ring-1 focus:ring-teal-500 outline-none text-sm font-mono" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-teal-600 mb-1">Current (Curr)</label>
                    <input type="number" value={meterElecCurr} onChange={e => setMeterElecCurr(e.target.value)} className="w-full p-2 border border-teal-300 rounded focus:ring-1 focus:ring-teal-500 outline-none text-sm font-mono bg-teal-50" placeholder="0" />
                  </div>
                </div>
              </div>
            )}
            
            {currentHouse?.waterBillingType === 'unit' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-zinc-800 mb-3 border-b border-zinc-200 pb-2">Water</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-1">Previous (Prev)</label>
                    <input type="number" value={meterWaterPrev} onChange={e => setMeterWaterPrev(e.target.value)} className="w-full p-2 border border-zinc-300 rounded focus:ring-1 focus:ring-teal-500 outline-none text-sm font-mono" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-600 mb-1">Current (Curr)</label>
                    <input type="number" value={meterWaterCurr} onChange={e => setMeterWaterCurr(e.target.value)} className="w-full p-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-mono bg-blue-50" placeholder="0" />
                  </div>
                </div>
              </div>
            )}

            {currentHouse?.electricityBillingType !== 'unit' && currentHouse?.waterBillingType !== 'unit' && (
              <div className="p-4 text-center text-sm text-zinc-500">
                All utilities are configured as flat fixed rates. Update rates in the Property Layout settings.
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200 mt-4">
              <button type="button" onClick={() => setMeterModalRoom(null)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">Save Readings</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!ledgerTenant} onClose={() => setLedgerTenant(null)} title={`Interactive Payment History: ${ledgerTenant?.name}`}>
        {ledgerTenant && (() => {
          const tenantPayments = payments.filter(p => p.tenantId === ledgerTenant.id).sort((a, b) => String(b.month || '').localeCompare(String(a.month || '')));
          return (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto w-full">
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-sm mb-4">
                <p className="font-medium text-zinc-800">Joined: <span className="font-mono">{formatWithNepaliDate(ledgerTenant.startDate)}</span></p>
                <p className="font-medium text-zinc-800 text-xs text-zinc-500 mt-1">Rent Cycle: <span className="uppercase text-zinc-700">{ledgerTenant.rentCycle}</span></p>
              </div>

              {tenantPayments.length > 0 ? (
                <div className="space-y-3">
                  {tenantPayments.map(payment => (
                    <div key={payment.id} className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow transition-shadow">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-2">
                         <span className="font-bold text-zinc-800 font-mono text-sm">{formatWithNepaliDate(payment.month + "-01")}</span>
                         <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : payment.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                           {payment.status}
                         </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Total Billed:</span>
                          <span className="font-mono font-semibold">NPR {payment.amountDue}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Collected:</span>
                          <span className="font-mono font-semibold text-emerald-600">NPR {payment.amountPaid}</span>
                        </div>
                        {payment.status !== 'paid' && (
                          <div className="col-span-2 flex justify-between pt-1 mt-1 border-t border-zinc-100">
                             <span className="text-zinc-500 font-medium">Pending Arrears:</span>
                             <span className="font-mono font-bold text-red-600">NPR {payment.amountDue - payment.amountPaid}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <p className="text-zinc-500 font-medium">No payment interaction history found for this tenant yet.</p>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteTenantId !== null}
        title="Delete Tenant"
        message={
          <>
            Are you sure you want to permanently delete this tenant? 
            <br/><br/>
            <span className="text-red-600 font-semibold">Warning: This will also remove all their associated payment history.</span>
          </>
        }
        onConfirm={executeDeleteTenant}
        onCancel={() => setConfirmDeleteTenantId(null)}
        confirmText="Delete Tenant"
      />
    </div>
  );
}
