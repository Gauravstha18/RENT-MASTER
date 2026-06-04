import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Home, Building, TrendingUp, Landmark, FileText, Search, ShieldAlert, Sparkles, UserCheck, CalendarDays } from 'lucide-react';

export function Dashboard() {
  const { houses, rooms, tenants, payments, activeHouseId, getTenantTotalRent } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter payments
  const filteredPayments = monthPayments.filter(payment => {
    const tenantName = houseTenants.find(t => t.id === payment.tenantId)?.name || '';
    return tenantName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!currentHouse) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-base font-medium">Please select or add a property to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Visual Welcome Ribbon */}
      <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none md:block hidden">
          <Sparkles className="w-64 h-64 text-indigo-400 -mr-16 -mt-16" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Property Live</span>
            <span className="text-slate-400 text-xs font-mono">{currentMonth} Dashboard</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">{currentHouse.name} Overview</h2>
          <p className="text-slate-400 text-sm">{currentHouse.address || 'No address specified'}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl text-center min-w-[100px]">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupancy</p>
            <p className="text-xl font-bold text-white mt-0.5">{occupancyRate}%</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl text-center min-w-[100px]">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenants</p>
            <p className="text-xl font-bold text-indigo-400 mt-0.5">{houseTenants.length}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Rooms Capacity</p>
              <h4 className="text-2xl font-black text-slate-900">{houseRooms.length} <span className="text-xs font-normal text-slate-500">units</span></h4>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg text-slate-500">
              <Building className="w-5 h-5" />
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
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Collected Revenue</p>
              <h4 className="text-2xl font-black text-indigo-600">NPR {collectedRent}</h4>
            </div>
            <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[11px] text-slate-500">
            <span>Target rent cycle limit:</span>
            <span className="font-bold font-mono text-slate-700">NPR {expectedRent}</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="pb-3 flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Outstanding Ledger</p>
              <h4 className="text-2xl font-black text-rose-600">NPR {pendingDues > 0 ? pendingDues : 0}</h4>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[11px] text-slate-500">
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
                  <th className="px-6 py-3">Tenant Name</th>
                  <th className="px-6 py-3 text-right">Amount Paid</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Date Filed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                      {searchTerm ? 'No payments match search query.' : 'No payment records compiled this month.'}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => {
                    const tenant = houseTenants.find(t => t.id === payment.tenantId);
                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                              {tenant?.name?.substring(0, 2).toUpperCase() || 'UN'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-[13px]">{tenant?.name || 'Unknown Profile'}</p>
                              {tenant?.phone && <span className="text-[10px] text-slate-400 font-mono">{tenant.phone}</span>}
                            </div>
                          </div>
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
                {houseRooms.map(room => {
                  const isOccupied = occupiedRoomIds.has(room.id);
                  return (
                    <div 
                      key={room.id}
                      title={`Room ${room.roomNumber} (${isOccupied ? 'Occupied' : 'Vacant'})`}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all transform hover:scale-[1.05] ${
                        isOccupied 
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                          : 'border-rose-100 bg-rose-50 text-rose-600'
                      }`}
                    >
                      <span className="font-bold">{room.roomNumber}</span>
                      <span className="text-[8px] font-medium opacity-60 font-mono">
                        {room.floor ? room.floor.split(' ')[1] || room.floor : ''}
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
    </div>
  );
}

