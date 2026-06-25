import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Search, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from './Modal';
import { Payment } from '../types';
import { formatWithNepaliDate, getTodayDateStr, calculateProRatedAmount, getRentDueInfo } from '../lib/dateUtils';

export function Payments() {
  const { houses, rooms, tenants, payments, activeHouseId, addPayment, updatePayment, getTenantTotalRent, globalAction, setGlobalAction } = useAppContext();
  
  // Default to today
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  
  // Form State
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => getTodayDateStr());

  // Search and status filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [paymentStatusFilter, selectedDate]);

  const currentHouse = houses.find(h => h.id === activeHouseId);
  const houseTenants = tenants.filter(t => t.houseId === activeHouseId);
  const selectedMonthStr = selectedDate.slice(0, 7);
  
  const getPaymentForTenant = (tenantId: string) => {
    return payments.find(p => p.houseId === activeHouseId && p.tenantId === tenantId && p.month === selectedMonthStr);
  };

  const openPaymentModal = (tenantId: string, totalDueAmount: number) => {
    const existing = getPaymentForTenant(tenantId);
    
    setActiveTenantId(tenantId);
    if (existing) {
      setAmountPaid(existing.amountPaid.toString());
      setPaymentDate(existing.paymentDate || new Date().toISOString().slice(0, 10));
    } else {
      setAmountPaid(totalDueAmount.toString());
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (globalAction === 'payment') {
      setGlobalAction(null);
    }
  }, [globalAction, setGlobalAction]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHouseId || !activeTenantId) return;

    const tenant = houseTenants.find(t => t.id === activeTenantId);
    if (!tenant) return;

    const expectedRent = getTenantTotalRent(tenant);
    let amountDue = expectedRent;

    if (tenant.startDate) {
      const calc = calculateProRatedAmount(tenant.startDate, selectedDate, expectedRent, tenant.rentCycle);
      amountDue = calc.due;
    }

    let electricityTotal = 0;
    let waterTotal = 0;
    
    if (currentHouse?.waterBillingType === 'fixed') {
      waterTotal = currentHouse.waterRate || 0;
    }

    let trashTotal = 0;
    if (currentHouse?.trashBillingType === 'fixed') {
      trashTotal = currentHouse.trashCollectionRate || 0;
    } else {
      trashTotal = (currentHouse?.trashCollectionRate || 0) * tenant.roomIds.length;
    }

    tenant.roomIds.forEach(roomId => {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        if (currentHouse?.electricityBillingType === 'unit') {
          const eDiff = Math.max(0, (room.currentElectricityReading || 0) - (room.previousElectricityReading || 0));
          electricityTotal += eDiff * (currentHouse?.electricityRate || 0);
        } else if (currentHouse?.electricityBillingType === 'fixed') {
          electricityTotal += (currentHouse?.electricityRate || 0);
        }

        if (currentHouse?.waterBillingType === 'unit') {
          const wDiff = Math.max(0, (room.currentWaterReading || 0) - (room.previousWaterReading || 0));
          waterTotal += wDiff * (currentHouse?.waterRate || 0);
        }
      }
    });

    const finalAmountDue = amountDue + electricityTotal + waterTotal + trashTotal;
    const paid = Number(amountPaid);
    const status = paid >= finalAmountDue ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    const existingPayment = getPaymentForTenant(activeTenantId);

    if (existingPayment) {
      updatePayment(existingPayment.id, { 
        amountPaid: paid, 
        paymentDate, 
        status, 
        amountDue: finalAmountDue,
        baseRent: amountDue,
        electricityCharge: electricityTotal,
        waterCharge: waterTotal,
        trashCharge: trashTotal
      });
    } else {
      addPayment({
        houseId: activeHouseId,
        tenantId: activeTenantId,
        month: selectedMonthStr,
        amountDue: finalAmountDue,
        amountPaid: paid,
        paymentDate,
        status,
        baseRent: amountDue,
        electricityCharge: electricityTotal,
        waterCharge: waterTotal,
        trashCharge: trashTotal
      });
    }
    setIsModalOpen(false);
  };

  // Compile calculations to enable filters and sorting
  const processedLedgerItems = useMemo(() => {
    return houseTenants.map(tenant => {
      const payment = getPaymentForTenant(tenant.id);
      const expectedRent = getTenantTotalRent(tenant);
      
      let calculatedDue = expectedRent;
      let nextDueDate = '';
      let daysActive = 0;

      if (tenant.startDate) {
        const calc = calculateProRatedAmount(tenant.startDate, selectedDate, expectedRent, tenant.rentCycle);
        calculatedDue = calc.due;
        daysActive = calc.daysActive;
        nextDueDate = calc.nextDueDate;
      }

      let electricityTotal = 0;
      let waterTotal = 0;
      
      if (currentHouse?.waterBillingType === 'fixed') {
        waterTotal = currentHouse.waterRate || 0;
      }

      let trashTotal = 0;
      if (currentHouse?.trashBillingType === 'fixed') {
        trashTotal = currentHouse.trashCollectionRate || 0;
      } else {
        trashTotal = (currentHouse?.trashCollectionRate || 0) * tenant.roomIds.length;
      }

      tenant.roomIds.forEach(roomId => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
          if (currentHouse?.electricityBillingType === 'unit') {
            const eDiff = Math.max(0, (room.currentElectricityReading || 0) - (room.previousElectricityReading || 0));
            electricityTotal += eDiff * (currentHouse?.electricityRate || 0);
          } else if (currentHouse?.electricityBillingType === 'fixed') {
            electricityTotal += currentHouse?.electricityRate || 0;
          }

          if (currentHouse?.waterBillingType === 'unit') {
            const wDiff = Math.max(0, (room.currentWaterReading || 0) - (room.previousWaterReading || 0));
            waterTotal += wDiff * (currentHouse?.waterRate || 0);
          }
        }
      });

      const totalDue = calculatedDue + electricityTotal + waterTotal + trashTotal;
      const status = payment ? payment.status : 'unpaid';
      const paidAmount = payment ? payment.amountPaid : 0;

      return {
        tenant,
        payment,
        expectedRent,
        calculatedDue,
        nextDueDate,
        daysActive,
        electricityTotal,
        waterTotal,
        trashTotal,
        totalDue,
        status,
        paidAmount
      };
    });
  }, [houseTenants, payments, activeHouseId, selectedDate, currentHouse, rooms]);

  const filteredLedgerItems = useMemo(() => {
    return processedLedgerItems.filter(item => {
      const matchesStatus = paymentStatusFilter === 'all' || item.status === paymentStatusFilter;
      return matchesStatus;
    });
  }, [processedLedgerItems, paymentStatusFilter]);

  const paginatedLedgerItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLedgerItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLedgerItems, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLedgerItems.length / itemsPerPage));

  const activeTenantName = houseTenants.find(t => t.id === activeTenantId)?.name;

  if (!activeHouseId) return null;

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm gap-4">
        <h3 className="font-bold text-zinc-800 ml-2">Tenant Billing Ledger</h3>
        
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3 bg-zinc-50 p-1.5 rounded-md border border-zinc-200">
            <Calendar className="w-4 h-4 text-zinc-500 ml-2" />
            <span className="text-xs text-zinc-500 font-medium">As of Date:</span>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-zinc-700 font-bold text-sm py-1 px-2"
            />
          </div>
          <div className="text-[10px] text-zinc-500 pr-2 pb-1 font-mono">{formatWithNepaliDate(selectedDate)}</div>
        </div>
      </div>

      {/* Multi-Filter controls inside Payments ledger */}
      <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
          <button
            type="button"
            onClick={() => setPaymentStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentStatusFilter === 'all' ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
          >
            All Ledger
          </button>
          <button
            type="button"
            onClick={() => setPaymentStatusFilter('paid')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentStatusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
          >
            Paid Only
          </button>
          <button
            type="button"
            onClick={() => setPaymentStatusFilter('partial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentStatusFilter === 'partial' ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
          >
            Partially Paid
          </button>
          <button
            type="button"
            onClick={() => setPaymentStatusFilter('unpaid')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${paymentStatusFilter === 'unpaid' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
          >
            Unpaid Dues
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-50 border-b border-zinc-100 flex-none sticky top-0 backdrop-blur-md bg-zinc-50/90 z-10">
              <tr>
                <th className="px-6 py-3">Tenant Name</th>
                <th className="px-6 py-3">Ledger Details (NPR)</th>
                <th className="px-6 py-3">Total Due</th>
                <th className="px-6 py-3">Paid Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedLedgerItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 font-medium">No statements or ledger records match filters.</td>
                </tr>
              ) : (
                paginatedLedgerItems.map(item => {
                  const { tenant, calculatedDue, nextDueDate, daysActive, electricityTotal, waterTotal, trashTotal, totalDue, status, paidAmount } = item;
                  const dueInfo = getRentDueInfo(tenant, payments, selectedDate);
                  
                  return (
                    <tr key={tenant.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{tenant.name}</div>
                        {tenant.startDate && (
                           <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Started: {formatWithNepaliDate(tenant.startDate)}</div>
                        )}
                        {dueInfo && (
                          <div className={`text-[10px] font-medium font-mono mt-0.5 ${dueInfo.inlineStyleClass}`}>
                            {dueInfo.displayText}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-zinc-700">Rent: NPR {calculatedDue}</div>
                        {(electricityTotal > 0 || waterTotal > 0 || trashTotal > 0) && (
                          <div className="text-[10px] text-zinc-500 mt-1 space-y-0.5 font-mono">
                            {electricityTotal > 0 && <div>Elec: NPR {electricityTotal}</div>}
                            {waterTotal > 0 && <div>Water: NPR {waterTotal}</div>}
                            {trashTotal > 0 && <div>Trash: NPR {trashTotal}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-zinc-800">NPR {totalDue}</td>
                      <td className="px-6 py-4 font-mono font-medium text-zinc-800">
                        NPR {paidAmount}
                        {paidAmount > totalDue && (
                          <span className="text-emerald-600 text-xs ml-2 font-bold">(+{paidAmount - totalDue})</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                          status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                          'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openPaymentModal(tenant.id, totalDue)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-colors ${
                            status === 'paid' ? 'text-zinc-500 hover:text-zinc-600 bg-zinc-50' : 'text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100'
                          }`}
                        >
                          <DollarSign className="w-3 h-3" />
                          {status === 'paid' ? 'Update' : 'Collect'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {paginatedLedgerItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 font-medium">No statements or ledger records match filters.</div>
          ) : (
            paginatedLedgerItems.map(item => {
              const { tenant, calculatedDue, nextDueDate, daysActive, electricityTotal, waterTotal, trashTotal, totalDue, status, paidAmount } = item;
              const dueInfo = getRentDueInfo(tenant, payments, selectedDate);
              
              return (
                <div key={tenant.id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-zinc-900">{tenant.name}</div>
                      {dueInfo && (
                        <div className={`text-[10px] font-medium font-mono mt-0.5 ${dueInfo.inlineStyleClass}`}>
                          {dueInfo.displayText}
                        </div>
                      )}
                    </div>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                      status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-0.5">Total Due</p>
                      <p className="font-mono font-bold text-zinc-800 text-sm">NPR {totalDue}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-0.5">Paid</p>
                      <p className="font-mono font-bold text-zinc-800 text-sm">NPR {paidAmount}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => openPaymentModal(tenant.id, totalDue)}
                    className={`w-full flex justify-center items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold uppercase transition-colors ${
                      status === 'paid' ? 'text-zinc-500 bg-zinc-100' : 'text-white bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    <DollarSign className="w-3 h-3" />
                    {status === 'paid' ? 'Update Payment' : 'Collect Payment'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-zinc-100 bg-zinc-50">
            <span className="text-xs font-medium text-zinc-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-zinc-200 bg-white text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-zinc-200 bg-white text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Collect Rent - ${activeTenantName}`}>
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Amount Paid (NPR)</label>
            <input 
              required
              type="number" 
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              min="0"
              step="any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Date</label>
            <input 
              required
              type="date" 
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full p-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2 text-sm">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">Save Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
