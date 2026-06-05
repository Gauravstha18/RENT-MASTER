import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Building2, Search, Users, FileText, UserCheck } from 'lucide-react';
import { formatWithNepaliDate, getRentDueInfo } from '../lib/dateUtils';
import { Modal } from './Modal';
import { Tenant } from '../types';

export function GlobalDashboard() {
  const { houses, rooms, tenants, payments, getTenantTotalRent } = useAppContext();
  const [globalSearch, setGlobalSearch] = useState('');
  
  const [selectedTenantUser, setSelectedTenantUser] = useState<Tenant | null>(null);
  const [viewList, setViewList] = useState<'properties' | 'rooms' | 'tenants' | null>(null);

  // Stats
  const activeHouses = houses.filter(h => !h.isDeleted);
  const totalProperties = activeHouses.length;
  const totalRoomsCount = rooms.length;
  const totalTenantsCount = tenants.length;
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthPayments = payments.filter(p => p.month === currentMonth);
  const collectedRent = monthPayments.reduce((sum, p) => sum + p.amountPaid, 0);

  // Global Search logic
  const normalizedSearch = globalSearch.toLowerCase();
  
  const searchResults = tenants.filter(tenant => {
    if (!normalizedSearch) return false;
    const matchesTenantName = tenant.name.toLowerCase().includes(normalizedSearch);
    
    // Check if any of the tenant's rooms match the search
    const tenantRooms = rooms.filter(r => tenant.roomIds.includes(r.id));
    const matchesRoom = tenantRooms.some(r => r.roomNumber.toLowerCase().includes(normalizedSearch));
    
    return matchesTenantName || matchesRoom;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      <div className="bg-slate-900 rounded-2xl p-5 md:p-8 text-white shadow-lg border border-slate-800">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 sm:mb-2">Portfolio Overview</h2>
        <p className="text-sm sm:text-base text-slate-400 font-medium">Unified management for all your properties</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 md:mt-8">
          <button onClick={() => setViewList('properties')} className="bg-slate-800/50 border border-slate-700 p-3 md:p-4 rounded-xl text-left hover:bg-slate-800 transition-colors">
            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Properties</p>
            <p className="text-xl md:text-2xl font-bold text-white mt-1">{totalProperties}</p>
          </button>
          <button onClick={() => setViewList('rooms')} className="bg-slate-800/50 border border-slate-700 p-3 md:p-4 rounded-xl text-left hover:bg-slate-800 transition-colors">
            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Rooms</p>
            <p className="text-xl md:text-2xl font-bold text-indigo-400 mt-1">{totalRoomsCount}</p>
          </button>
          <button onClick={() => setViewList('tenants')} className="bg-slate-800/50 border border-slate-700 p-3 md:p-4 rounded-xl text-left hover:bg-slate-800 transition-colors">
            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenants</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-400 mt-1">{totalTenantsCount}</p>
          </button>
          <div className="bg-slate-800/50 border border-slate-700 p-3 md:p-4 rounded-xl text-left">
            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">Collected ({currentMonth})</p>
            <p className="text-sm sm:text-base md:text-xl font-bold text-white mt-1 truncate">NPR {collectedRent}</p>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-500" /> Global Search
        </h3>
        <p className="text-sm text-slate-500">Find any tenant or room across all properties</p>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            placeholder="Search by Room Number or Tenant Name..."
            className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-1/2 transition-shadow"
          />
        </div>

        {globalSearch && (
          <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">No records found matching "{globalSearch}"</div>
            ) : (
              searchResults.map(tenant => {
                const property = houses.find(h => h.id === tenant.houseId);
                const tenantRooms = rooms.filter(r => tenant.roomIds.includes(r.id)).map(r => r.roomNumber).join(', ');
                const tenantPayments = payments.filter(p => p.tenantId === tenant.id);
                const dueInfo = getRentDueInfo(tenant, payments);
                
                return (
                  <div key={tenant.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between cursor-pointer" onClick={() => setSelectedTenantUser(tenant)}>
                    <div>
                      <h4 className="font-bold text-indigo-700 flex items-center gap-2">
                        <Users className="w-4 h-4" /> {tenant.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 font-mono">{tenant.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Property</p>
                      <p className="text-sm font-semibold text-slate-800">{property?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Room</p>
                      <p className="text-sm font-semibold text-slate-800">{tenantRooms || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Rent Due Status</p>
                      <p className={`text-xs ${dueInfo ? dueInfo.inlineStyleClass : 'text-slate-500'}`}>
                        {dueInfo ? dueInfo.displayText : 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payments</p>
                      <p className="text-sm font-semibold text-slate-800">{tenantPayments.length} records</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Global Recent Payments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" /> Recent Portfolio Payments ({currentMonth})
          </h3>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 overflow-auto max-h-[400px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 backdrop-blur-md bg-slate-50/90 z-10">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-3">Tenant Name</th>
                <th className="px-6 py-3">Property</th>
                <th className="px-6 py-3 text-right">Amount Paid</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Date Filed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {monthPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No payment records across any property this month.
                  </td>
                </tr>
              ) : (
                monthPayments.map(payment => {
                  const tenant = tenants.find(t => t.id === payment.tenantId);
                  const property = houses.find(h => h.id === payment.houseId);
                  return (
                    <tr 
                      key={payment.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => tenant && setSelectedTenantUser(tenant)}
                    >
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-indigo-600 hover:underline">{tenant?.name || 'Unknown Profile'}</div>
                      </td>
                      <td className="px-6 py-3.5 text-[11px] font-bold text-slate-500">
                        {property?.name}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900 text-xs">
                        NPR {payment.amountPaid}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          payment.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-[10px] text-slate-400 font-mono font-medium">
                        {payment.paymentDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-slate-100 max-h-[400px] overflow-auto">
          {monthPayments.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-medium">No payment records this month.</div>
          ) : (
            monthPayments.map(payment => {
              const tenant = tenants.find(t => t.id === payment.tenantId);
              const property = houses.find(h => h.id === payment.houseId);
              
              return (
                <div key={payment.id} className="p-4 bg-white" onClick={() => tenant && setSelectedTenantUser(tenant)}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-indigo-600">{tenant?.name || 'Unknown Profile'}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">{property?.name}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      payment.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="text-[10px] text-slate-400 font-mono">{payment.paymentDate}</div>
                    <div className="font-mono font-bold text-slate-900 text-sm">NPR {payment.amountPaid}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Modal isOpen={!!selectedTenantUser} onClose={() => setSelectedTenantUser(null)} title="Tenant Information">
        {selectedTenantUser && (() => {
          const property = houses.find(h => h.id === selectedTenantUser.houseId);
          const tenantRooms = rooms.filter(r => selectedTenantUser.roomIds.includes(r.id)).map(r => r.roomNumber).join(', ');
          const tenantPayments = payments.filter(p => p.tenantId === selectedTenantUser.id);
          const dueInfo = getRentDueInfo(selectedTenantUser, payments);
          
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
                  {selectedTenantUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-indigo-900">{selectedTenantUser.name}</h3>
                  <p className="text-sm font-semibold font-mono text-indigo-600">{selectedTenantUser.phone}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Property</p>
                  <p className="font-semibold text-slate-800">{property?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{property?.address}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rooms</p>
                  <p className="font-semibold text-slate-800">{tenantRooms || 'None'}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rent Info</p>
                  <p className="font-mono font-bold text-slate-800">NPR {getTenantTotalRent(selectedTenantUser)}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedTenantUser.rentCycle}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Joined Date</p>
                  <p className="font-semibold text-slate-800">{selectedTenantUser.startDate ? formatWithNepaliDate(selectedTenantUser.startDate) : 'Unknown'}</p>
                </div>
                {dueInfo && (
                  <div className="col-span-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-sans">Rent Due / Overdue Status</p>
                    <p className={`text-sm font-bold ${dueInfo.inlineStyleClass}`}>{dueInfo.displayText}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-150 pb-2">Payment History</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {tenantPayments.length > 0 ? tenantPayments.slice().reverse().map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-200 bg-white">
                      <div>
                        <p className="font-mono text-sm font-bold text-slate-800">NPR {p.amountPaid}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.paymentDate}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        p.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  )) : (
                    <p className="text-slate-400 text-xs italic text-center py-4">No payment records found.</p>
                  )}
                </div>
              </div>

            </div>
          );
        })()}
      </Modal>
      <Modal isOpen={viewList !== null} onClose={() => setViewList(null)} title={viewList === 'properties' ? 'All Properties' : viewList === 'rooms' ? 'All Rooms' : 'All Tenants'}>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 -mx-2 px-2 pb-2">
          {viewList === 'properties' && activeHouses.map(house => (
            <div key={house.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <h4 className="font-bold text-slate-800">{house.name}</h4>
              <p className="text-xs text-slate-500">{house.address}</p>
              <div className="mt-2 text-xs font-semibold text-slate-600 flex gap-4">
                <span>{rooms.filter(r => r.houseId === house.id).length} Rooms</span>
                <span className="text-emerald-500">{rooms.filter(r => r.houseId === house.id && tenants.some(t => t.roomIds.includes(r.id))).length} Occupied</span>
              </div>
            </div>
          ))}
          
          {viewList === 'rooms' && rooms.map(room => {
            const house = houses.find(h => h.id === room.houseId);
            const tenant = tenants.find(t => t.roomIds.includes(room.id));
            return (
              <div key={room.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800">{room.roomNumber} <span className="text-xs text-slate-500 font-normal">({house?.name})</span></h4>
                  <p className="text-xs text-slate-500 mt-0.5">{room.floor || 'Floor 1'}</p>
                </div>
                <div>
                  {tenant ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Occupied</span>
                  ) : (
                    <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Vacant</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {viewList === 'tenants' && tenants.map(tenant => (
            <div key={tenant.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all" onClick={() => { setViewList(null); setSelectedTenantUser(tenant); }}>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800">{tenant.name}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{tenant.phone}</p>
                </div>
                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide bg-indigo-50 px-2 py-1 rounded-md">View Profile</div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
