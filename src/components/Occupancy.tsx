import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Home, UserPlus, DoorOpen, MoreVertical } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { Room, Tenant, RentCycle } from '../types';
import { formatWithNepaliDate, getTodayDateStr, calculateProRatedAmount } from '../lib/dateUtils';

export function Occupancy() {
  const { houses, rooms, tenants, payments, activeHouseId, updateRoom, addTenant, updateTenant, deleteTenant, getTenantTotalRent, globalAction, setGlobalAction } = useAppContext();
  
  const currentHouse = houses.find(h => h.id === activeHouseId);

  // Expanded Room Breakdowns state
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});

  const [confirmDeleteTenantId, setConfirmDeleteTenantId] = useState<string | null>(null);

  // Tenant Modal State
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [rentMode, setRentMode] = useState<'auto' | 'manual'>('auto');
  const [customRent, setCustomRent] = useState('');
  const [startDate, setStartDate] = useState(() => getTodayDateStr());
  const [rentCycle, setRentCycle] = useState<RentCycle>('monthly');
  const [dateOption, setDateOption] = useState<'current' | 'custom'>('current');

  // Meter Modal State
  const [meterModalRoom, setMeterModalRoom] = useState<Room | null>(null);
  const [meterElecPrev, setMeterElecPrev] = useState('');
  const [meterElecCurr, setMeterElecCurr] = useState('');
  const [meterWaterPrev, setMeterWaterPrev] = useState('');
  const [meterWaterCurr, setMeterWaterCurr] = useState('');

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
      setSelectedRooms(tenant.roomIds);
      setRentMode(tenant.rentMode);
      setCustomRent(tenant.customRentAmount?.toString() || '');
      setStartDate(tenant.startDate || getTodayDateStr());
      setRentCycle(tenant.rentCycle || 'monthly');
      setDateOption('custom');
    } else {
      setEditingTenant(null);
      setName('');
      setPhone('');
      setSelectedRooms(preSelectRoomId ? [preSelectRoomId] : []);
      setRentMode('auto');
      setCustomRent('');
      setStartDate(getTodayDateStr());
      setRentCycle('monthly');
      setDateOption('current');
    }
    setIsTenantModalOpen(true);
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
      houseId: activeHouseId,
      name,
      phone,
      roomIds: selectedRooms,
      rentMode,
      customRentAmount: rentMode === 'manual' ? Number(customRent) : undefined,
      startDate: finalStartDate,
      rentCycle
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h3 className="font-bold text-slate-800 ml-1 sm:ml-2">Rooms & tenants Overview</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 ml-1 sm:ml-2 mt-1">Manage occupancy and assign tenants. For room management, see the Property Layout tab.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap w-full md:w-auto">
          <select 
            value={floorFilter}
            onChange={e => setFloorFilter(e.target.value)}
            className="flex-1 md:flex-none p-1.5 px-3 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 mr-0 sm:mr-2 font-medium"
          >
            <option value="all">All Floors</option>
            {uniqueFloors.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button 
            onClick={() => openTenantModal()}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" /> Add Tenant
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {houseRooms.length === 0 && (
          <div className="p-8 sm:p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <p className="text-slate-400 font-medium text-sm sm:text-base">No rooms added to this property yet.</p>
          </div>
        )}
        
        {uniqueFloors.filter(floor => floorFilter === 'all' || floorFilter === floor).map(floor => (
          <div key={floor} className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-4 sticky top-0 z-20 py-2 backdrop-blur-md bg-slate-50/90 -mx-4 px-4 sm:mx-0 sm:px-0 mt-4 md:mt-0">
              <h4 className="text-sm sm:text-base font-bold text-slate-700 uppercase tracking-wider shrink-0">{floor}</h4>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {(floorsMap.get(floor) || []).map(room => {
          const isOccupied = occupiedRoomIds.has(room.id);
          const tenant = roomToTenantMap.get(room.id);
          const expectedRent = tenant ? getTenantTotalRent(tenant) : 0;
          const todayStr = getTodayDateStr();
          const calcArgs = tenant && tenant.startDate ? calculateProRatedAmount(tenant.startDate, todayStr, expectedRent, tenant.rentCycle) : null;
          
          return (
            <div key={room.id} className={`bg-white rounded-xl border-2 overflow-hidden flex flex-col transition-all ${isOccupied ? 'border-emerald-100 shadow-sm' : 'border-rose-100 shadow-sm hover:border-rose-200'}`}>
              <div className={`px-5 py-3 border-b flex justify-between items-center ${isOccupied ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    {room.roomNumber}
                    {room.floor && <span className="text-xs font-medium text-slate-500 bg-white/60 px-2 py-0.5 rounded-full border border-slate-200/50">{room.floor}</span>}
                  </h4>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Base Room Rent</span>
                  <span className="font-mono font-bold text-slate-900">NPR {room.rentAmount}</span>
                </div>

                <div className="flex-1 flex flex-col">
                  {isOccupied && tenant ? (
                    <div className="flex flex-col gap-3 h-full justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Occupant</p>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900 text-base">{tenant.name}</p>
                            <p className="text-xs text-slate-500">{tenant.phone}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => openTenantModal(tenant)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded transition-colors">Edit Tenant</button>
                            <button onClick={() => handleTenantDelete(tenant.id)} className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded transition-colors">Delete</button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="col-span-2 flex justify-between items-center mb-1 border-b border-slate-200 pb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Utilities &amp; Billing</span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => openMeterModal(room)}
                              className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded hover:bg-amber-200 transition-colors"
                            >
                              Update Meter Readings
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedBreakdowns(prev => ({ ...prev, [room.id]: !prev[room.id] }))}
                              className={`p-1 rounded-md transition-colors ${expandedBreakdowns[room.id] ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                              title="Toggle Details Breakdown"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Due / {tenant.rentCycle}</p>
                          <p className="font-mono font-bold text-sm text-slate-800">NPR {getTenantTotalRent(tenant)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Joined Since</p>
                          <p className="font-mono text-xs font-bold text-slate-800" title={formatWithNepaliDate(tenant.startDate)}>{formatWithNepaliDate(tenant.startDate)}</p>
                        </div>
                        {calcArgs && (
                          <div className="col-span-2 pt-2 mt-1 border-t border-slate-200">
                            <p className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">Billed Till Today</span>
                              <span className="font-mono font-bold text-sm text-indigo-700">NPR {calcArgs.due}</span>
                            </p>
                            <p className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400">Today: {formatWithNepaliDate(todayStr)}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{calcArgs.daysActive} days active</span>
                            </p>
                          </div>
                        )}

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
                            <div className="col-span-2 mt-3 pt-3 border-t border-dashed border-slate-200 bg-slate-100/60 p-2.5 rounded-lg text-slate-700 text-[11px] space-y-2 animate-in slide-in-from-top-1 duration-200">
                              <h5 className="font-bold text-[10px] text-indigo-600 uppercase tracking-wider">Billed Amount Breakdown</h5>
                              
                              <div className="space-y-1 font-mono">
                                <div className="flex justify-between items-center">
                                  <span>Base Rent (Cycle):</span>
                                  <span className="font-semibold text-slate-900">NPR {baseRent}</span>
                                </div>
                                {calcArgs && (
                                  <div className="flex justify-between items-center text-indigo-600/90 pl-2 border-l border-indigo-200">
                                    <span>↳ Pro-rated Till Today:</span>
                                    <span className="font-semibold">NPR {proratedBase}</span>
                                  </div>
                                )}
                                
                                <div className="flex justify-between items-center">
                                  <span>Electricity {currentHouse?.electricityBillingType === 'unit' ? `(${elecUnits} units)` : '(Fixed)'}:</span>
                                  <span className="font-semibold text-slate-900">NPR {elecCost}</span>
                                </div>
                                {currentHouse?.electricityBillingType === 'unit' && (
                                  <div className="text-[9px] text-slate-400 pl-2">
                                    {room.previousElectricityReading || 0} Prev ➔ {room.currentElectricityReading || 0} Curr @ NPR {elecRate}/u
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span>Water {currentHouse?.waterBillingType === 'unit' ? `(${waterUnits} units)` : '(Fixed)'}:</span>
                                  <span className="font-semibold text-slate-900">NPR {waterCost}</span>
                                </div>
                                {currentHouse?.waterBillingType === 'unit' && (
                                  <div className="text-[9px] text-slate-400 pl-2">
                                    {room.previousWaterReading || 0} Prev ➔ {room.currentWaterReading || 0} Curr @ NPR {waterRate}/u
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span>Trash Fee:</span>
                                  <span className="font-semibold text-slate-900">NPR {trashCost}</span>
                                </div>
                              </div>

                              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                                <span>Grand Total (Today):</span>
                                <span className="text-indigo-600 font-bold">NPR {grandTotalToday}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
                      <p className="text-sm font-medium text-rose-600 mb-3">Room is vacant</p>
                      <button 
                        onClick={() => openTenantModal(undefined, room.id)}
                        className="text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        Assign to New Tenant
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
            </div>
          </div>
        ))}
      </div>

      {/* Modals placed at the end */}
      <Modal isOpen={isTenantModalOpen} onClose={() => setIsTenantModalOpen(false)} title={editingTenant ? "Edit Tenant Profile" : "Onboard New Tenant"}>
        <form onSubmit={handleTenantSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assign Rooms</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
              {houseRooms.map(room => {
                const isOccupiedByOther = occupiedRoomsForModal.has(room.id);
                return (
                  <label key={room.id} className={`flex items-center p-2 rounded-md transition-colors ${isOccupiedByOther ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50 cursor-pointer'} ${selectedRooms.includes(room.id) ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'border border-transparent'}`}>
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 mr-3 w-4 h-4"
                      disabled={isOccupiedByOther}
                      checked={selectedRooms.includes(room.id)}
                      onChange={() => handleRoomToggle(room.id)}
                    />
                    <div className="flex-1 flex items-center gap-2">
                       <span className="font-semibold text-slate-800">{room.roomNumber}</span>
                       {room.floor && <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{room.floor}</span>}
                    </div>
                    <span className="text-slate-600 text-sm font-mono mr-2">NPR {room.rentAmount}</span>
                    {isOccupiedByOther && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider bg-rose-50 px-1.5 py-0.5 rounded">Occupied</span>}
                  </label>
                )
              })}
              {houseRooms.length === 0 && <p className="text-sm text-slate-500 p-2 text-center">No rooms available in this property to assign.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rent Cycle</label>
              <select value={rentCycle} onChange={e => setRentCycle(e.target.value as RentCycle)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Onboarding / Join Date Option</label>
              <div className="grid grid-cols-2 gap-2 p-1 border border-slate-200 rounded-lg bg-slate-50">
                <button
                  type="button"
                  onClick={() => setDateOption('current')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${dateOption === 'current' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Current Date (Today)
                </button>
                <button
                  type="button"
                  onClick={() => setDateOption('custom')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${dateOption === 'custom' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Custom Historic Date
                </button>
              </div>
            </div>
          </div>

          <div>
            {dateOption === 'custom' ? (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-1">
                <label className="block text-xs font-bold text-indigo-600 uppercase">Select Custom / Historic Date Joined</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                />
                <p className="text-[11px] text-slate-400">Specify when the tenant originally assigned or occupied the room.</p>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100/50 text-xs text-indigo-600">
                Automatically onboarding tenant with today's date (<strong className="font-mono">{getTodayDateStr()}</strong>) as the Join Date.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rent Calculation</label>
            <div className="flex gap-6 p-3 border border-slate-100 rounded-lg bg-slate-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="auto" checked={rentMode === 'auto'} onChange={() => setRentMode('auto')} className="text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Auto Calculate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="manual" checked={rentMode === 'manual'} onChange={() => setRentMode('manual')} className="text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Custom Rate</span>
              </label>
            </div>
          </div>

          {rentMode === 'manual' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">Custom Total Amount (NPR)</label>
              <input required type="number" min="0" step="any" value={customRent} onChange={e => setCustomRent(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none flex-1 text-sm" />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-200/60 mt-4">
            <button type="button" onClick={() => setIsTenantModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
              {editingTenant ? 'Save Profiler' : 'Onboard Tenant'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!meterModalRoom} onClose={() => setMeterModalRoom(null)} title={`Meters: ${meterModalRoom?.roomNumber || ''}`}>
        {meterModalRoom && (
          <form onSubmit={handleSaveMeters} className="space-y-4">
            {currentHouse?.electricityBillingType === 'unit' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Electricity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Previous (Prev)</label>
                    <input type="number" value={meterElecPrev} onChange={e => setMeterElecPrev(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-mono" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-600 mb-1">Current (Curr)</label>
                    <input type="number" value={meterElecCurr} onChange={e => setMeterElecCurr(e.target.value)} className="w-full p-2 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-mono bg-indigo-50" placeholder="0" />
                  </div>
                </div>
              </div>
            )}
            
            {currentHouse?.waterBillingType === 'unit' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Water</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Previous (Prev)</label>
                    <input type="number" value={meterWaterPrev} onChange={e => setMeterWaterPrev(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-mono" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-600 mb-1">Current (Curr)</label>
                    <input type="number" value={meterWaterCurr} onChange={e => setMeterWaterCurr(e.target.value)} className="w-full p-2 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-mono bg-blue-50" placeholder="0" />
                  </div>
                </div>
              </div>
            )}

            {currentHouse?.electricityBillingType !== 'unit' && currentHouse?.waterBillingType !== 'unit' && (
              <div className="p-4 text-center text-sm text-slate-500">
                All utilities are configured as flat fixed rates. Update rates in the Property Layout settings.
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 mt-4">
              <button type="button" onClick={() => setMeterModalRoom(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Save Readings</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteTenantId !== null}
        title="Delete Tenant"
        message={
          <>
            Are you sure you want to permanently delete this tenant? 
            <br/><br/>
            <span className="text-rose-600 font-semibold">Warning: This will also remove all their associated payment history.</span>
          </>
        }
        onConfirm={executeDeleteTenant}
        onCancel={() => setConfirmDeleteTenantId(null)}
        confirmText="Delete Tenant"
      />
    </div>
  );
}
