import React, { useState } from 'react';
import { Archive, RotateCcw, Trash2, Building } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from './ConfirmModal';

export function History() {
  const { houses, restoreHouse, hardDeleteHouse } = useAppContext();
  const [confirmDeleteHouseId, setConfirmDeleteHouseId] = useState<string | null>(null);
  
  const deletedHouses = houses.filter(h => h.isDeleted);
  
  const houseToDelete = houses.find(h => h.id === confirmDeleteHouseId);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center border border-slate-200">
          <Archive className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Archive / Trash</h1>
          <p className="text-sm text-slate-500">Restore or permanently delete removed properties.</p>
        </div>
      </div>

      {deletedHouses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Archive className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Trash is empty</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">No properties have been removed recently.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deletedHouses.map(house => (
            <div key={house.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all group flex flex-col">
              <div className="flex gap-4 items-start mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                  <Building className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{house.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{house.address}</p>
                </div>
              </div>
              
              <div className="mt-auto pt-6 flex items-center gap-2">
                <button 
                  onClick={() => restoreHouse(house.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-lg text-sm font-semibold border border-emerald-100"
                >
                  <RotateCcw className="w-4 h-4" /> Restore
                </button>
                <button 
                  onClick={() => setConfirmDeleteHouseId(house.id)}
                  className="flex items-center justify-center p-2 text-rose-500 hover:bg-rose-50 transition-colors rounded-lg border border-transparent hover:border-rose-100"
                  title="Permanently Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteHouseId !== null}
        title="Permanently Delete Property"
        message={
          <>
            Are you sure you want to permanently delete <strong>{houseToDelete?.name}</strong>? 
            <br/><br/>
            <span className="text-rose-600 font-semibold">Warning: This action cannot be undone and will permanently remove all associated rooms, tenants, and payment records.</span>
          </>
        }
        onConfirm={() => {
          if (confirmDeleteHouseId) {
            hardDeleteHouse(confirmDeleteHouseId);
          }
        }}
        onCancel={() => setConfirmDeleteHouseId(null)}
        confirmText="Delete Permanently"
      />
    </div>
  );
}
