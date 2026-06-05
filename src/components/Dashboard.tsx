import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Home, Building, TrendingUp, Landmark, FileText, Search, ShieldAlert, Sparkles, UserCheck, CalendarDays, ExternalLink, Calendar, MapPin, Hash, Phone } from 'lucide-react';
import { Modal } from './Modal';
import { formatWithNepaliDate, getRentDueInfo } from '../lib/dateUtils';
import { Payment, Tenant, Room } from '../types';

export function Dashboard() {
  const { houses, rooms, tenants, payments, activeHouseId, getTenantTotalRent } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentRecord, setSelectedPaymentRecord] = useState<{payment: Payment, tenant: Tenant} | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const currentHouse = houses.find(h => h.id === activeHouseId);
  const houseRooms = rooms.filter(r => r.houseId === activeHouseId);
  const houseTenants = tenants.filter(t => t.houseId === activeHouseId);
  
  // Calculate occupancies
  const occupiedRoomIds = new Set(houseTenants.flatMap(t => t.roomIds));
  const occupiedCount = houseRooms.filter(r => occupiedRoomIds.has(r.id)).length;
  const occupancyRate = houseRooms.length ? Math.round((occupiedCount / houseRooms.length) * 100) : 0;
  
  // Calculate finances for the current month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthPayments = payments.filter(p => p.houseId === activeHouseId && p.month === currentMonth);
  
  // Expected Rent: sum of all active tenants rent logic
  const expectedRent = houseTenants.reduce((sum, tenant) => sum + getTenantTotalRent(tenant), 0);
  
  // Collected Rent
  const collectedRent = monthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  
  // Pending Dues
  const pendingDues = expectedRent - collectedRent;

  // Generate unified ledger entries for the current month
  // This includes actual payments recorded, plus virtual "Unpaid" records for tenants who haven't paid this month
  const unifiedLedgerEntries = houseTenants.map(tenant => {
    const payment = monthPayments.find(p => p.tenantId === tenant.id);
    const tenantRooms = houseRooms.filter(r => tenant.roomIds.includes(r.id));
    const roomNumbers = tenantRooms.map(r => r.roomNumber).join(', ');
    const dueInfo = getRentDueInfo(tenant, payments);
    
    if (payment) {
      return {
        id: payment.id,
        tenant,
        payment,
        isRecorded: true,
        roomNumbers,
        dueInfo,
        amountPaid: payment.amountPaid,
        status: payment.status,
        date: payment.paymentDate,
        amountDue: payment.amountDue || getTenantTotalRent(tenant)
      };
    } else {
      // Synthesized "yet to be paid" record
      const expected = getTenantTotalRent(tenant);
      return {
        id: `unpaid-${tenant.id}`,
        tenant,
        payment: {
          id: `unpaid-payment-${tenant.id}`,
          houseId: activeHouseId,
          tenantId: tenant.id,
          month: currentMonth,
          amountDue: expected,
          amountPaid: 0,
          paymentDate: '-',
          status: 'unpaid' as const
        },
        isRecorded: false,
        roomNumbers,
        dueInfo,
        amountPaid: 0,
        status: 'unpaid' as const,
        date: 'Not Filed Yet',
        amountDue: expected
      };
    }
  });

  // Filter combined ledger entries by search query
  const filteredEntries = unifiedLedgerEntries.filter(entry => {
    return (
      entry.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.roomNumbers.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.tenant.phone && entry.tenant.phone.includes(searchTerm))
    );
  });

  if (!currentHouse) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-base font-medium">Please select or add a property to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      
      {/* Visual Welcome Ribbon */}
      <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none md:block hidden">
          <Sparkles className="w-64 h-64 text-indigo-400 -mr-16 -mt-16" />
        </div>
        <div className="space-y-1 w-full">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Property Live</span>
            <span className="text-slate-400 text-xs font-mono">{currentMonth} Dashboard</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">{currentHouse.name} Overview</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-2">
            <p className="text-slate-400 text-xs sm:text-sm truncate max-w-full sm:max-w-[200px]">{currentHouse.address || 'No address specified'}</p>
            <div className="text-[10px] sm:text-xs bg-slate-800/80 px-2 sm:px-3 py-1.5 rounded-md border border-slate-700/60 flex items-center gap-1.5 sm:gap-2 self-start w-auto">
              <span className="text-white font-bold">{houseRooms.length}</span> <span className="text-slate-400 uppercase text-[8px] sm:text-[9px] tracking-wider font-bold">Rooms</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-bold">{occupiedCount}</span> <span className="text-emerald-400/70 uppercase text-[8px] sm:text-[9px] tracking-wider font-bold">Filled</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400 font-bold">{houseRooms.length - occupiedCount}</span> <span className="text-rose-400/70 uppercase text-[8px] sm:text-[9px] tracking-wider font-bold">Empty</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 shrink-0">
          <div className="bg-slate-800/80 border border-slate-700/60 p-2 sm:p-3 rounded-xl flex flex-col items-center justify-center flex-1 md:min-w-[100px]">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupancy</p>
            <p className="text-lg sm:text-xl font-bold text-white mt-0.5 leading-none">{occupancyRate}%</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-2 sm:p-3 rounded-xl flex flex-col items-center justify-center flex-1 md:min-w-[100px]">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenants</p>
            <p className="text-lg sm:text-xl font-bold text-indigo-400 mt-0.5 leading-none">{houseTenants.length}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Rooms Capacity</p>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900">{houseRooms.length} <span className="text-xs font-normal text-slate-500">units</span></h4>
            </div>
            <div className="p-2 sm:p-2.5 bg-slate-50 rounded-lg text-slate-500">
              <Building className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${occupancyRate}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-2.5 text-[11px] text-slate-500">
              <span className="font-semibold text-emerald-600">{occupiedCount} Occupied</span>
              <span>{houseRooms.length - occupiedCount} Vacant</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Collected Revenue</p>
              <h4 className="text-xl sm:text-2xl font-black text-indigo-600">NPR {collectedRent}</h4>
            </div>
            <div className="p-2 sm:p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500">
            <span>Target rent cycle limit:</span>
            <span className="font-bold font-mono text-slate-700">NPR {expectedRent}</span>
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Outstanding Ledger</p>
              <h4 className="text-xl sm:text-2xl font-black text-rose-600">NPR {pendingDues > 0 ? pendingDues : 0}</h4>
            </div>
            <div className="p-2 sm:p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500">
            <span>Unpaid / Partial Profiles:</span>
            <span className="font-bold text-rose-600">
              {monthPayments.filter(p => p.status !== 'paid').length || 0} active records
            </span>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ledger table card */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Recent Payment Records
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Latest statement details for month of {currentMonth}</p>
            </div>
            
            {/* Quick search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search tenant..."
                className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-44"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[350px]">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3">Tenant & Room</th>
                  <th className="px-6 py-3">Rent Due Status</th>
                  <th className="px-6 py-3 text-right">Amount Paid</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Date Filed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      {searchTerm ? 'No entries match search query.' : 'No entries available for this property.'}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(entry => {
                    const isOverdue = entry.dueInfo?.isOverdue;
                    return (
                      <tr 
                        key={entry.id} 
                        className={`transition-colors cursor-pointer border-l-4 ${
                          isOverdue 
                            ? 'bg-amber-50/70 hover:bg-amber-100/90 border-l-amber-400' 
                            : 'hover:bg-slate-50/80 border-l-transparent'
                        }`}
                        onClick={() => setSelectedPaymentRecord({payment: entry.payment, tenant: entry.tenant})}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                              {entry.tenant.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-[13px]">{entry.tenant.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold font-mono">
                                  Room {entry.roomNumbers || 'N/A'}
                                </span>
                                {entry.tenant.phone && (
                                  <span className="text-[10px] text-slate-400 font-mono">{entry.tenant.phone}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {entry.dueInfo ? (
                            <span className={`text-xs ${entry.dueInfo.inlineStyleClass}`}>
                              {entry.dueInfo.displayText}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <p className="font-mono font-bold text-slate-900 text-xs">
                            NPR {entry.amountPaid}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            of NPR {entry.amountDue}
                          </p>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                            entry.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            entry.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-[10px] text-slate-400 font-mono font-medium">
                          {entry.date}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Room Overview Availability Map */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-500" /> Space Occupancy Map
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Quick lookup of units inside building</p>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              {/* Map Legend */}
              <div className="flex gap-4 items-center mb-5 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div>
                  <span>Vacant</span>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 gap-2">
                {houseRooms
                  .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
                  .map(room => {
                    const isOccupied = occupiedRoomIds.has(room.id);
                    return (
                      <div 
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        title={`Room ${room.roomNumber} - ${room.floor || 'No Floor'} (${isOccupied ? 'Occupied' : 'Vacant'})`}
                        className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all transform hover:scale-[1.05] cursor-pointer ${
                          isOccupied 
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300' 
                            : 'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-200'
                        }`}
                      >
                        <span className="font-extrabold text-[13px]">{room.roomNumber}</span>
                        <span className="text-[8px] font-semibold opacity-60 font-mono mt-0.5">
                          {room.floor || 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                {houseRooms.length === 0 && (
                  <p className="col-span-full text-xs text-slate-400 py-6 text-center">No units configured yet.</p>
                )}
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-slate-400" /> Operational Month</span>
                <span className="font-semibold text-slate-800 uppercase font-mono">{currentMonth}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Calculated Yield</span>
                <span className="font-extrabold text-slate-800 text-sm">NPR {expectedRent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selectedPaymentRecord} onClose={() => setSelectedPaymentRecord(null)} title="Payment & Profile Details">
        {selectedPaymentRecord && (() => {
          const dueInfo = getRentDueInfo(selectedPaymentRecord.tenant, payments);
          return (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xl font-bold text-slate-700">
                  {selectedPaymentRecord.tenant.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg">{selectedPaymentRecord.tenant.name}</h3>
                  <div className="flex gap-4 mt-1">
                    {selectedPaymentRecord.tenant.phone && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedPaymentRecord.tenant.phone}
                      </span>
                    )}
                    {selectedPaymentRecord.tenant.citizenshipNo && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <Hash className="w-3.5 h-3.5" />
                        {selectedPaymentRecord.tenant.citizenshipNo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupied Room</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPaymentRecord.tenant.roomIds.map(roomId => {
                      const room = houseRooms.find(r => r.id === roomId);
                      return room ? (
                        <span key={roomId} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold font-mono">
                          {room.roomNumber}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenancy Started</p>
                  <p className="font-mono text-sm font-bold text-slate-800 mt-1">
                    {selectedPaymentRecord.tenant.startDate ? formatWithNepaliDate(selectedPaymentRecord.tenant.startDate) : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Base Rent (Total)</p>
                  <p className="font-mono text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    NPR {getTenantTotalRent(selectedPaymentRecord.tenant)}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payment Status</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      selectedPaymentRecord.payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      selectedPaymentRecord.payment.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {selectedPaymentRecord.payment.status}
                    </span>
                    <span className="font-mono text-xs text-slate-500">{selectedPaymentRecord.payment.paymentDate}</span>
                  </div>
                </div>

                {dueInfo && (
                  <div className="col-span-2 bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rent Due / Overdue Status</p>
                    <p className={`text-sm font-bold mt-1 ${dueInfo.inlineStyleClass}`}>
                      {dueInfo.displayText}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><TrendingUp className="w-4 h-4 text-emerald-500" /> Payment Recorded (<span className="font-mono">{selectedPaymentRecord.payment.month}</span>)</p>
                  <p className="font-bold font-mono text-lg text-emerald-600">NPR {selectedPaymentRecord.payment.amountPaid}</p>
                </div>
                <p className="text-xs text-slate-500">Record ID: <span className="font-mono">{selectedPaymentRecord.payment.id}</span></p>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={!!selectedRoom} onClose={() => setSelectedRoom(null)} title="Room Properties & Occupancy">
        {selectedRoom && (() => {
          const isOccupied = occupiedRoomIds.has(selectedRoom.id);
          const tenant = houseTenants.find(t => t.roomIds.includes(selectedRoom.id));
          const dueInfo = tenant ? getRentDueInfo(tenant, payments) : null;
          
          return (
            <div className="space-y-6">
              {/* Header Box */}
              <div className={`p-5 rounded-xl border flex items-center justify-between ${
                isOccupied ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                    isOccupied ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                  }`}>
                    {selectedRoom.roomNumber}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Room {selectedRoom.roomNumber}</h3>
                    <p className="text-xs opacity-75 font-medium">{selectedRoom.floor || 'No Floor Listed'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isOccupied ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {isOccupied ? 'Occupied' : 'Vacant'}
                </span>
              </div>

              {/* Room Financial Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Base Monthly Rent</p>
                  <p className="font-mono text-base font-black text-slate-800 mt-1">
                    NPR {selectedRoom.rentAmount}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Property Name</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                    {currentHouse?.name}
                  </p>
                </div>
              </div>

              {/* Occupied Tenant Details */}
              {isOccupied && tenant ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" /> Active Tenant Profile
                    </h4>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-sm font-black text-slate-700">
                        {tenant.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm">{tenant.name}</p>
                        {tenant.phone && (
                          <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <span className="text-slate-400 font-bold">Phone:</span> {tenant.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Lease Started</span>
                        <span className="font-bold text-slate-800 font-mono">{tenant.startDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Rent Due Style</span>
                        <span className="font-bold text-slate-800 uppercase tracking-widest">
                          {tenant.rentCollectionType === 'advance' ? 'Advance' : 'Arrears'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {dueInfo && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Rent Cycle Status</p>
                      <p className={`text-sm font-bold mt-1 ${dueInfo.inlineStyleClass}`}>
                        {dueInfo.displayText}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm font-semibold text-slate-500">This room is currently vacant.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Go to the Occupancy tab to onboard a new tenant for this space.</p>
                </div>
              )}

              {/* Utility Readings */}
              {(selectedRoom.currentElectricityReading !== undefined || selectedRoom.currentWaterReading !== undefined) && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Meter Readings Record</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRoom.currentElectricityReading !== undefined && (
                      <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                        <p className="text-[9px] uppercase font-extrabold text-slate-400">Electricity (kWh)</p>
                        <div className="flex justify-between items-center mt-1.5 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px]">Prev</span>
                            <span className="font-mono font-bold text-slate-700">{selectedRoom.previousElectricityReading ?? 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-indigo-600 block text-[9px] font-bold">Current</span>
                            <span className="font-mono font-bold text-indigo-700">{selectedRoom.currentElectricityReading}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedRoom.currentWaterReading !== undefined && (
                      <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                        <p className="text-[9px] uppercase font-extrabold text-slate-400">Water (Units)</p>
                        <div className="flex justify-between items-center mt-1.5 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px]">Prev</span>
                            <span className="font-mono font-bold text-slate-700">{selectedRoom.previousWaterReading ?? 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-indigo-600 block text-[9px] font-bold">Current</span>
                            <span className="font-mono font-bold text-indigo-700">{selectedRoom.currentWaterReading}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

