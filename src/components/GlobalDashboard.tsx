import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Building2, Search, Users, FileText, UserCheck } from 'lucide-react';
import { formatWithNepaliDate, getRentDueInfo } from '../lib/dateUtils';
import { Modal } from './Modal';
import { Tenant } from '../types';

export function GlobalDashboard() {
  const { houses, rooms, tenants, payments, getTenantTotalRent } = useAppContext();
  const [modalSearch, setModalSearch] = useState('');
  
  const [selectedTenantUser, setSelectedTenantUser] = useState<Tenant | null>(null);
  const [viewList, setViewList] = useState<'properties' | 'rooms' | 'tenants' | null>(null);

  // Reset modal search when viewList changes
  React.useEffect(() => { setModalSearch(''); }, [viewList]);

  // Stats
  const activeHouses = houses.filter(h => !h.isDeleted);
  const totalProperties = activeHouses.length;
  const totalRoomsCount = rooms.length;
  const totalTenantsCount = tenants.length;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthPayments = payments.filter(p => p.month === currentMonth);
  const collectedRent = monthPayments.reduce((sum, p) => sum + p.amountPaid, 0);

  const normalizedModalSearch = modalSearch.toLowerCase();
  
  const filteredProperties = activeHouses.filter(house => 
    String(house.name || '').toLowerCase().includes(normalizedModalSearch) || 
    String(house.address || '').toLowerCase().includes(normalizedModalSearch)
  );

  const filteredRooms = rooms.filter(room => 
    String(room.roomNumber || '').toLowerCase().includes(normalizedModalSearch) ||
    String(houses.find(h => h.id === room.houseId)?.name || '').toLowerCase().includes(normalizedModalSearch)
  );

  const filteredTenants = tenants.filter(tenant => 
    String(tenant.name || '').toLowerCase().includes(normalizedModalSearch) || 
    String(tenant.phone || '').includes(normalizedModalSearch)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Global Overview</h2>
          <p className="text-zinc-500 mt-1">Summary across all your properties</p>
        </div>
        <button 
          onClick={() => useAppContext().setGlobalAction('add-property')}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Building2 className="w-4 h-4" />
          Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setViewList('properties')}
          className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl group-hover:scale-110 transition-transform"><Building2 className="w-5 h-5" /></div>
            <h3 className="font-semibold text-zinc-700">Total Properties</h3>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{totalProperties}</div>
        </div>

        <div 
          onClick={() => setViewList('rooms')}
          className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform"><FileText className="w-5 h-5" /></div>
            <h3 className="font-semibold text-zinc-700">Total Rooms</h3>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{totalRoomsCount}</div>
        </div>

        <div 
          onClick={() => setViewList('tenants')}
          className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
            <h3 className="font-semibold text-zinc-700">Total Tenants</h3>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{totalTenantsCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck className="w-5 h-5" /></div>
            <h3 className="font-semibold text-zinc-700">Rent Collected (This Month)</h3>
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">NPR {collectedRent.toLocaleString()}</div>
        </div>
      </div>

      <Modal isOpen={!!selectedTenantUser} onClose={() => setSelectedTenantUser(null)} title="Tenant Information">
        {selectedTenantUser && (() => {
          const property = houses.find(h => h.id === selectedTenantUser.houseId);
          const tenantRooms = rooms.filter(r => selectedTenantUser.roomIds?.includes(r.id)).map(r => r.roomNumber).join(', ');
          const tenantPayments = payments.filter(p => p.tenantId === selectedTenantUser.id);
          const dueInfo = getRentDueInfo(selectedTenantUser, payments);
          
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-teal-50 border border-teal-100 p-4 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xl">
                  {String(selectedTenantUser?.name || '?').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-teal-900">{selectedTenantUser.name}</h3>
                  <p className="text-sm font-semibold font-mono text-teal-600">{selectedTenantUser.phone}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Property</p>
                  <p className="font-semibold text-zinc-800">{property?.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{property?.address}</p>
                </div>
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Rooms</p>
                  <p className="font-semibold text-zinc-800">{tenantRooms || 'None'}</p>
                </div>
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Rent Info</p>
                  <p className="font-mono font-bold text-zinc-800">NPR {getTenantTotalRent(selectedTenantUser)}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">{selectedTenantUser.rentCycle}</p>
                </div>
                <div className="border border-zinc-200 rounded-lg p-3 bg-zinc-50">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Joined Date</p>
                  <p className="font-semibold text-zinc-800">{selectedTenantUser.startDate ? formatWithNepaliDate(selectedTenantUser.startDate) : 'Unknown'}</p>
                </div>
                {dueInfo && (
                  <div className="col-span-2 border border-zinc-200 rounded-lg p-3 bg-zinc-50">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-sans">Rent Due / Overdue Status</p>
                    <p className={`text-sm font-bold ${dueInfo.inlineStyleClass}`}>{dueInfo.displayText}</p>
                  </div>
                )}
              </div>
              
              {selectedTenantUser.notes && (
                <div className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100/50">
                  <p className="text-[10px] font-bold text-yellow-800/60 uppercase tracking-widest mb-1">Manager Notes</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{selectedTenantUser.notes}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-zinc-700 mb-3 border-b border-zinc-200 pb-2">Payment History</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {tenantPayments.length > 0 ? tenantPayments.slice().reverse().map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2.5 rounded-lg border border-zinc-200 bg-white">
                      <div>
                        <p className="font-mono text-sm font-bold text-zinc-800">NPR {p.amountPaid}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{p.paymentDate}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                        p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        p.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  )) : (
                    <p className="text-zinc-500 text-xs italic text-center py-4">No payment records found.</p>
                  )}
                </div>
              </div>

            </div>
          );
        })()}
      </Modal>
      <Modal isOpen={viewList !== null} onClose={() => setViewList(null)} title={viewList === 'properties' ? 'All Properties' : viewList === 'rooms' ? 'All Rooms' : 'All Tenants'}>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={modalSearch}
            onChange={e => setModalSearch(e.target.value)}
            placeholder={`Search ${viewList}...`}
            className="pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 w-full"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 -mx-2 px-2 pb-2">
          {viewList === 'properties' && filteredProperties.map(house => (
            <div key={house.id} className="p-4 border border-zinc-200 rounded-lg bg-zinc-50">
              <h4 className="font-bold text-zinc-800">{house.name}</h4>
              <p className="text-xs text-zinc-500">{house.address}</p>
              <div className="mt-2 text-xs font-semibold text-zinc-600 flex gap-4">
                <span>{rooms.filter(r => r.houseId === house.id).length} Rooms</span>
                <span className="text-emerald-500">{rooms.filter(r => r.houseId === house.id && tenants.some(t => t.roomIds?.includes(r.id))).length} Occupied</span>
              </div>
            </div>
          ))}
          
          {viewList === 'rooms' && filteredRooms.map(room => {
            const house = houses.find(h => h.id === room.houseId);
            const tenant = tenants.find(t => t.roomIds?.includes(room.id));
            return (
              <div key={room.id} className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-zinc-800">{room.roomNumber} <span className="text-xs text-zinc-500 font-normal">({house?.name})</span></h4>
                  <p className="text-xs text-zinc-500 mt-0.5">{room.floor || 'Floor 1'}</p>
                </div>
                <div>
                  {tenant ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-widest">Occupied</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-widest">Vacant</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {viewList === 'tenants' && filteredTenants.map(tenant => (
            <div key={tenant.id} className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all" onClick={() => { setViewList(null); setSelectedTenantUser(tenant); }}>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-zinc-800">{tenant.name}</h4>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{tenant.phone}</p>
                </div>
                <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wide bg-teal-50 px-2 py-1 rounded-md">View Profile</div>
              </div>
            </div>
          ))}

          {(viewList === 'properties' ? filteredProperties : viewList === 'rooms' ? filteredRooms : filteredTenants).length === 0 && (
            <div className="p-8 text-center text-zinc-500 font-medium">No results found for "{modalSearch}"</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
