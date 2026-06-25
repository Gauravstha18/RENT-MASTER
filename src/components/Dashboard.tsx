import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Home, Building, TrendingUp, Landmark, FileText, Search, ShieldAlert, Sparkles, UserCheck, CalendarDays, ExternalLink, Calendar, MapPin, Hash, Phone } from 'lucide-react';
import { Modal } from './Modal';
import { formatWithNepaliDate, getRentDueInfo } from '../lib/dateUtils';
import { Payment, Tenant, Room } from '../types';

export function Dashboard() {
  const { houses, rooms, tenants, payments, activeHouseId, getTenantTotalRent } = useAppContext();
  const [paymentTab, setPaymentTab] = useState<'all' | 'paid' | 'pending'>('all');
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

  // Get monthly revenue trends for the current house (last 6 months)
  const housePayments = payments.filter(p => p.houseId === activeHouseId);
  const trendData = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7); // 'YYYY-MM'
    const totalCollected = housePayments
      .filter(p => p.month === monthStr)
      .reduce((sum, p) => sum + p.amountPaid, 0);
    const displayMonth = d.toLocaleString('default', { month: 'short' });
    trendData.push({
      month: monthStr,
      displayMonth,
      revenue: totalCollected
    });
  }

  // Generate unified ledger entries for the current month
  // This includes actual payments recorded, plus virtual "Unpaid" records for tenants who haven't paid this month
  const unifiedLedgerEntries = houseTenants.map(tenant => {
    const payment = monthPayments.find(p => p.tenantId === tenant.id);
    const tenantRooms = houseRooms.filter(r => tenant.roomIds?.includes(r.id));
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

  // Filter combined ledger entries by search query and tabs
  const filteredEntries = unifiedLedgerEntries.filter(entry => {
    const matchesTab = paymentTab === 'all' ? true : paymentTab === 'paid' ? entry.status === 'paid' : entry.status !== 'paid';
    return matchesTab;
  });

  if (!currentHouse) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p className="text-base font-medium">Please select or add a property to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      
      {/* Visual Welcome Ribbon */}
      <div className="relative overflow-hidden bg-zinc-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-zinc-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none lg:block hidden">
          <Sparkles className="w-64 h-64 text-teal-400 -mr-16 -mt-16" />
        </div>
        <div className="space-y-1 w-full">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-300 text-[10px] font-bold uppercase tracking-widest">Property Live</span>
            <span className="text-zinc-500 text-xs font-mono">{currentMonth} Dashboard</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">{currentHouse?.name} Overview</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-2">
            <p className="text-zinc-500 text-xs sm:text-sm truncate max-w-full sm:max-w-[300px]">{currentHouse?.address || 'No address specified'}</p>
          </div>
        </div>
        <div className="w-full lg:max-w-md lg:ml-auto mt-4 lg:mt-0 bg-zinc-800/80 border border-zinc-700/60 p-5 rounded-xl flex flex-col justify-center relative z-10 shrink-0 shadow-inner">
          <div className="flex justify-between items-center mb-3">
            <div>
               <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest block mb-0.5">Rooms Capacity</span>
               <span className="text-zinc-400 text-xs"><span className="text-teal-400 font-bold">{houseTenants.length}</span> Active Tenants</span>
            </div>
            <div className="text-right">
               <span className="text-xs font-bold text-zinc-200 bg-zinc-700/60 px-2.5 py-1 rounded-lg border border-zinc-600/40 inline-block">{houseRooms.length} Units</span>
            </div>
          </div>
          <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden mb-3 border border-zinc-700/50">
            <div className="h-full bg-teal-500 transition-all duration-500 shadow-[0_0_10px_rgba(20, 184, 166,0.5)]" style={{ width: `${occupancyRate}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-xs text-zinc-300 font-medium">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span>{occupiedCount} Occupied</span>
            </span>
            <span className="font-mono text-zinc-400 text-[10px] bg-zinc-900/90 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">{occupancyRate}%</span>
            <span className="text-red-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
              <span>{houseRooms.length - occupiedCount} Empty</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-0.5">Space Occupancy Map</p>
              <h4 className="text-xl sm:text-2xl font-black text-zinc-900">Unit Lookup</h4>
            </div>
            <div className="p-2 sm:p-2.5 bg-zinc-50 rounded-lg text-zinc-500">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-50 flex-1 flex flex-col overflow-hidden">
             <div className="flex gap-2 items-center mb-3 text-[9px] uppercase font-bold tracking-widest text-zinc-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-emerald-500"></div>
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-2 h-2 rounded-sm bg-red-500"></div>
                  <span>Vacant</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-1.5 min-h-[120px]">
                  {[...houseRooms]
                    .sort((a, b) => String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''), undefined, { numeric: true }))
                    .map(room => {
                      const isOccupied = occupiedRoomIds.has(room.id);
                      return (
                        <div 
                          key={room.id}
                          onClick={() => setSelectedRoom(room)}
                          title={`Room ${room.roomNumber} - ${room.floor || 'No Floor'}`}
                          className={`aspect-square rounded border flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                            isOccupied 
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                              : 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {room.roomNumber}
                        </div>
                      );
                    })}
                  {houseRooms.length === 0 && (
                    <p className="col-span-full text-[10px] text-zinc-500 py-4 text-center">No units configured yet.</p>
                  )}
                </div>
              </div>
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-0.5">Collected Revenue</p>
              <h4 className="text-xl sm:text-2xl font-black text-teal-600">NPR {collectedRent}</h4>
            </div>
            <div className="p-2 sm:p-2.5 bg-teal-50 rounded-lg text-teal-600">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          
          {/* Elegant Custom Mini Monthly Revenue Trend Chart */}
          <div className="h-16 w-full my-2 flex flex-col justify-end">
            <div className="flex items-end justify-between h-10 px-1 gap-1.5 relative">
              {(() => {
                const maxVal = Math.max(...trendData.map(d => d.revenue), 1);
                return trendData.map((entry, index) => {
                  const pct = (entry.revenue / maxVal) * 100;
                  const barHeight = Math.max(pct, 6); // at least 6% height so it's visible
                  const isCurrent = entry.month === currentMonth;
                  return (
                    <div 
                      key={index} 
                      className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 bg-zinc-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md font-mono border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap">
                        {entry.month}: NPR {entry.revenue}
                      </div>
                      {/* Bar */}
                      <div 
                        style={{ height: `${barHeight}%` }} 
                        className={`w-full rounded-t transition-all duration-300 ${
                          isCurrent 
                            ? 'bg-teal-600 hover:bg-teal-700 shadow-[0_0_8px_rgba(20, 184, 166,0.4)]' 
                            : 'bg-teal-200 hover:bg-teal-300'
                        }`}
                      ></div>
                    </div>
                  );
                });
              })()}
            </div>
            {/* X-Axis labels */}
            <div className="flex justify-between px-1 mt-1 text-[8px] font-semibold text-zinc-500 font-mono">
              {trendData.map((entry, index) => (
                <div key={index} className="flex-1 text-center truncate">
                  {entry.displayMonth}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-50 flex justify-between items-center text-[10px] sm:text-[11px] text-zinc-500">
            <span>Target rent cycle limit:</span>
            <span className="font-bold font-mono text-zinc-700">NPR {expectedRent}</span>
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-0.5">Outstanding Ledger</p>
              <h4 className="text-xl sm:text-2xl font-black text-red-600">NPR {pendingDues > 0 ? pendingDues : 0}</h4>
            </div>
            <div className="p-2 sm:p-2.5 bg-red-50 rounded-lg text-red-600">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-50 flex justify-between items-center text-[10px] sm:text-[11px] text-zinc-500">
            <span>Unpaid / Partial Profiles:</span>
            <span className="font-bold text-red-600">
              {monthPayments.filter(p => p.status !== 'paid').length || 0} active records
            </span>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Ledger table card */}
        <div className="col-span-full bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50">
            <div>
              <h3 className="font-bold text-zinc-800 text-sm tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-500" /> Recent Payment Records
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Latest statement details for month of {currentMonth}</p>
            </div>
            
            <div className="flex sm:items-center flex-col-reverse sm:flex-row gap-3">
               {/* Tabs */}
               <div className="flex items-center p-1 bg-zinc-100/80 border border-zinc-200 rounded-lg">
                  <button 
                    onClick={() => setPaymentTab('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentTab === 'all' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}
                  >
                    All Tenants
                  </button>
                  <button 
                    onClick={() => setPaymentTab('pending')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentTab === 'pending' ? 'bg-white text-amber-600 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}
                  >
                    Pending / Overdue
                  </button>
                  <button 
                    onClick={() => setPaymentTab('paid')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentTab === 'paid' ? 'bg-white text-emerald-600 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}
                  >
                    Paid
                  </button>
               </div>
               
               {/* Search removed from here */}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[350px]">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-3">Tenant & Room</th>
                  <th className="px-6 py-3">Rent Due Status</th>
                  <th className="px-6 py-3 text-right">Amount Paid</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Date Filed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">
                      {'No entries available for this property.'}
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
                            : 'hover:bg-zinc-50/80 border-l-transparent'
                        }`}
                        onClick={() => setSelectedPaymentRecord({payment: entry.payment, tenant: entry.tenant})}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-700 shrink-0">
                              {String(entry.tenant?.name || '?').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-800 text-[13px]">{entry.tenant?.name || 'Unknown'}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 rounded text-[9px] font-bold font-mono">
                                  Room {entry.roomNumbers || 'N/A'}
                                </span>
                                {entry.tenant?.phone && (
                                  <span className="text-[10px] text-zinc-500 font-mono">{entry.tenant?.phone}</span>
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
                            <span className="text-xs text-zinc-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <p className="font-mono font-bold text-zinc-900 text-xs">
                            NPR {entry.amountPaid}
                          </p>
                          <p className="text-[9px] text-zinc-500 font-mono">
                            of NPR {entry.amountDue}
                          </p>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                            entry.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            entry.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-[10px] text-zinc-500 font-mono font-medium">
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
      </div>

      <Modal isOpen={!!selectedPaymentRecord} onClose={() => setSelectedPaymentRecord(null)} title="Payment & Profile Details">
        {selectedPaymentRecord && (() => {
          const dueInfo = getRentDueInfo(selectedPaymentRecord.tenant, payments);
          return (
            <div className="space-y-6">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-xl font-bold text-zinc-700">
                  {String(selectedPaymentRecord.tenant?.name || '?').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-zinc-900 text-lg">{selectedPaymentRecord.tenant?.name || 'Unknown'}</h3>
                  <div className="flex gap-4 mt-1">
                    {selectedPaymentRecord.tenant?.phone && (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedPaymentRecord.tenant?.phone}
                      </span>
                    )}
                    {selectedPaymentRecord.tenant?.citizenshipNo && (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                        <Hash className="w-3.5 h-3.5" />
                        {selectedPaymentRecord.tenant?.citizenshipNo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Occupied Room</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedPaymentRecord.tenant.roomIds || []).map(roomId => {
                      const room = houseRooms.find(r => r.id === roomId);
                      return room ? (
                        <span key={roomId} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-bold font-mono">
                          {room.roomNumber}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                
                <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Tenancy Started</p>
                  <p className="font-mono text-sm font-bold text-zinc-800 mt-1">
                    {selectedPaymentRecord.tenant?.startDate ? formatWithNepaliDate(selectedPaymentRecord.tenant.startDate) : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Base Rent (Total)</p>
                  <p className="font-mono text-sm font-bold text-zinc-800 mt-1 flex items-center gap-1.5">
                    NPR {getTenantTotalRent(selectedPaymentRecord.tenant)}
                  </p>
                </div>

                <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Payment Status</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      selectedPaymentRecord.payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      selectedPaymentRecord.payment.status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {selectedPaymentRecord.payment.status}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">{selectedPaymentRecord.payment.paymentDate}</span>
                  </div>
                </div>

                {dueInfo && (
                  <div className="col-span-2 bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Rent Due / Overdue Status</p>
                    <p className={`text-sm font-bold mt-1 ${dueInfo.inlineStyleClass}`}>
                      {dueInfo.displayText}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div className="flex justify-between items-center mb-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-zinc-700"><TrendingUp className="w-4 h-4 text-emerald-500" /> Payment Recorded (<span className="font-mono">{selectedPaymentRecord.payment.month}</span>)</p>
                  <p className="font-bold font-mono text-lg text-emerald-600">NPR {selectedPaymentRecord.payment.amountPaid}</p>
                </div>
                <p className="text-xs text-zinc-500">Record ID: <span className="font-mono">{selectedPaymentRecord.payment.id}</span></p>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={!!selectedRoom} onClose={() => setSelectedRoom(null)} title="Room Properties & Occupancy">
        {selectedRoom && (() => {
          const isOccupied = occupiedRoomIds.has(selectedRoom.id);
          const tenant = houseTenants.find(t => t.roomIds?.includes(selectedRoom.id));
          const dueInfo = tenant ? getRentDueInfo(tenant, payments) : null;
          
          return (
            <div className="space-y-6">
              {/* Header Box */}
              <div className={`p-5 rounded-xl border flex items-center justify-between ${
                isOccupied ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                    isOccupied ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {selectedRoom.roomNumber}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Room {selectedRoom.roomNumber}</h3>
                    <p className="text-xs opacity-75 font-medium">{selectedRoom.floor || 'No Floor Listed'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  isOccupied ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {isOccupied ? 'Occupied' : 'Vacant'}
                </span>
              </div>

              {/* Room Financial Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Base Monthly Rent</p>
                  <p className="font-mono text-base font-black text-zinc-800 mt-1">
                    NPR {selectedRoom.rentAmount}
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Property Name</p>
                  <p className="text-sm font-bold text-zinc-800 mt-1 truncate">
                    {currentHouse?.name}
                  </p>
                </div>
              </div>

              {/* Occupied Tenant Details */}
              {isOccupied && tenant ? (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 pb-2 border-b border-zinc-200/60">
                      <UserCheck className="w-3.5 h-3.5 text-teal-500" /> Active Tenant Profile
                    </h4>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center text-sm font-black text-zinc-700">
                        {String(tenant?.name || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-zinc-900 text-sm">{tenant?.name || 'Unknown'}</p>
                        {tenant?.phone && (
                          <p className="text-xs text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                            <span className="text-zinc-500 font-bold">Phone:</span> {tenant?.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Lease Started</span>
                        <span className="font-bold text-zinc-800 font-mono">{tenant.startDate}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-0.5">Rent Due Style</span>
                        <span className="font-bold text-zinc-800 uppercase tracking-widest">
                          {tenant.rentCollectionType === 'advance' ? 'Advance' : 'Arrears'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {dueInfo && (
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-[10px] uppercase font-bold text-amber-600 tracking-widest">Rent Cycle Status</p>
                      <p className={`text-sm font-bold mt-1 ${dueInfo.inlineStyleClass}`}>
                        {dueInfo.displayText}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <p className="text-sm font-semibold text-zinc-500">This room is currently vacant.</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Go to the Occupancy tab to onboard a new tenant for this space.</p>
                </div>
              )}

              {/* Utility Readings */}
              {(selectedRoom.currentElectricityReading !== undefined || selectedRoom.currentWaterReading !== undefined) && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Meter Readings Record</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRoom.currentElectricityReading !== undefined && (
                      <div className="bg-white border border-zinc-100 p-3 rounded-lg shadow-sm">
                        <p className="text-[9px] uppercase font-extrabold text-zinc-500">Electricity (kWh)</p>
                        <div className="flex justify-between items-center mt-1.5 text-xs">
                          <div>
                            <span className="text-zinc-500 block text-[9px]">Prev</span>
                            <span className="font-mono font-bold text-zinc-700">{selectedRoom.previousElectricityReading ?? 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-teal-600 block text-[9px] font-bold">Current</span>
                            <span className="font-mono font-bold text-teal-700">{selectedRoom.currentElectricityReading}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedRoom.currentWaterReading !== undefined && (
                      <div className="bg-white border border-zinc-100 p-3 rounded-lg shadow-sm">
                        <p className="text-[9px] uppercase font-extrabold text-zinc-500">Water (Units)</p>
                        <div className="flex justify-between items-center mt-1.5 text-xs">
                          <div>
                            <span className="text-zinc-500 block text-[9px]">Prev</span>
                            <span className="font-mono font-bold text-zinc-700">{selectedRoom.previousWaterReading ?? 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-teal-600 block text-[9px] font-bold">Current</span>
                            <span className="font-mono font-bold text-teal-700">{selectedRoom.currentWaterReading}</span>
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

