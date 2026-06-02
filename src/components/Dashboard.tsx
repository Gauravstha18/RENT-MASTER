import React from 'react';
import { useAppContext } from '../context/AppContext';

export function Dashboard() {
  const { houses, rooms, tenants, payments, activeHouseId, getTenantTotalRent } = useAppContext();

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

  if (!currentHouse) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Please select or add a property to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-300">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Rooms</p>
            <p className="text-2xl font-bold text-slate-900">{houseRooms.length} <span className="text-[10px] font-normal text-slate-400">/ Unit</span></p>
          </div>
          <div>
            <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${occupancyRate}%` }}></div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">{occupiedCount} Occupied, {houseRooms.length - occupiedCount} Vacant</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-slate-900">NPR {collectedRent}</p>
          </div>
          <p className="mt-4 text-[10px] text-slate-500 font-bold">Collected for {currentMonth}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Dues</p>
            <p className="text-2xl font-bold text-rose-600">NPR {pendingDues > 0 ? pendingDues : 0}</p>
          </div>
          <p className="mt-4 text-[10px] text-slate-500 text-balance">
            {monthPayments.filter(p => p.status !== 'paid').length || 0} Tenants with incomplete payments
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Payment Records</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                  <th className="px-6 py-3">Tenant</th>
                  <th className="px-6 py-3 text-right">Amount Paid</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {monthPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No payments this month.</td>
                  </tr>
                )}
                {monthPayments.slice(0, 5).map(payment => {
                  const tenant = houseTenants.find(t => t.id === payment.tenantId);
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{tenant?.name || 'Unknown'}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">
                        NPR {payment.amountPaid}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                          payment.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[10px] text-slate-500">
                        {payment.paymentDate}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Room Overview</h3>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Availability Map</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 gap-2">
              {houseRooms.map(room => {
                const isOccupied = occupiedRoomIds.has(room.id);
                return (
                  <div 
                    key={room.id}
                    title={`Room ${room.roomNumber}`}
                    className={`aspect-square rounded border flex items-center justify-center text-[10px] font-bold transition-all ${
                      isOccupied 
                        ? 'border-emerald-600 bg-emerald-500 text-white' 
                        : 'border-rose-500 bg-rose-500 text-white shadow-sm'
                    }`}
                  >
                    {room.roomNumber}
                  </div>
                );
              })}
              {houseRooms.length === 0 && <p className="col-span-full text-xs text-slate-400">No rooms configured.</p>}
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total Capacity</span>
                <span className="text-sm font-semibold text-slate-800">{houseRooms.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Expected Total Rent</span>
                <span className="text-sm font-semibold text-slate-800">NPR {expectedRent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
