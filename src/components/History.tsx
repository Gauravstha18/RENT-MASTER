import React, { useState } from 'react';
import { Archive, RotateCcw, Trash2, Building, Layers, DoorOpen, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from './ConfirmModal';

export function History() {
  const { 
    houses, 
    restoreHouse, 
    hardDeleteHouse,
    archivedItems,
    restoreArchivedItem,
    deleteArchivedItemPermanently
  } = useAppContext();
  
  const [archiveTab, setArchiveTab] = useState<'properties' | 'floors' | 'rooms'>('properties');
  const [confirmDeleteHouseId, setConfirmDeleteHouseId] = useState<string | null>(null);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);
  
  const deletedHouses = houses.filter(h => h.isDeleted);
  const userArchivedItems = archivedItems.filter(item => houses.some(h => h.id === item.houseId));
  const deletedFloors = userArchivedItems.filter(item => item.type === 'floor');
  const deletedRooms = userArchivedItems.filter(item => item.type === 'room');
  
  const houseToDelete = houses.find(h => h.id === confirmDeleteHouseId);
  const itemToDelete = userArchivedItems.find(i => i.id === confirmDeleteItemId);

  const getRemainingDays = (deletedAtStr: string) => {
    const deletedAt = new Date(deletedAtStr).getTime();
    const now = new Date().getTime();
    const diffTime = (deletedAt + 15 * 24 * 60 * 60 * 1000) - now;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getAssociatedHouseName = (houseId: string) => {
    return houses.find(h => h.id === houseId)?.name || 'Unknown Property';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-105 text-zinc-700 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200 shrink-0">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Archive / Trash</h1>
            <p className="text-xs sm:text-sm text-zinc-500">Restore or permanently delete removed items. Rooms and floors stay auto-archived for 15 days.</p>
          </div>
        </div>
      </div>

      {/* Archive Tabs */}
      <div className="flex border-b border-zinc-200 p-0.5 max-w-md bg-zinc-50 rounded-xl">
        <button
          onClick={() => setArchiveTab('properties')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            archiveTab === 'properties'
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Properties ({deletedHouses.length})
        </button>
        <button
          onClick={() => setArchiveTab('floors')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            archiveTab === 'floors'
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Floors ({deletedFloors.length})
        </button>
        <button
          onClick={() => setArchiveTab('rooms')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            archiveTab === 'rooms'
              ? 'bg-white text-teal-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Rooms ({deletedRooms.length})
        </button>
      </div>

      {/* PROPERTIES TAB */}
      {archiveTab === 'properties' && (
        deletedHouses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 animate-pulse">
              <Building className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-widest">No Properties in Trash</h3>
            <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">None of your properties are currently soft-deleted.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-350">
            {deletedHouses.map(house => (
              <div key={house.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                <div className="flex gap-4 items-start mb-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center shrink-0 border border-teal-100">
                    <Building className="w-6 h-6 text-teal-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-800 text-base leading-tight truncate">{house.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 truncate">{house.address}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-zinc-100 flex items-center gap-2">
                  <button 
                    onClick={() => restoreHouse(house.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700  hover:bg-emerald-100 transition-colors rounded-lg text-xs font-bold border border-emerald-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteHouseId(house.id)}
                    className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 transition-colors rounded-lg border border-transparent hover:border-red-105 cursor-pointer"
                    title="Permanently Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* FLOORS TAB */}
      {archiveTab === 'floors' && (
        deletedFloors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 animate-pulse">
              <Layers className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-widest">No Archived Floors</h3>
            <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">Archived floors stay here for 15 days before permanent auto-purge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-350">
            {deletedFloors.map(item => {
              const daysLeft = getRemainingDays(item.deletedAt);
              return (
                <div key={item.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                  <div className="mb-4 space-y-3">
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 border border-amber-100">
                        <Layers className="w-6 h-6 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-zinc-800 text-base leading-tight">{item.name}</h3>
                        <p className="text-xs text-teal-600 font-semibold mt-1 truncate">Belonged to: {getAssociatedHouseName(item.houseId)}</p>
                      </div>
                    </div>
                    {item.floorData?.rooms && item.floorData.rooms.length > 0 && (
                      <div className="bg-zinc-50 rounded-lg p-2.5 text-[11px] text-zinc-500 font-medium">
                        Contains {item.floorData.rooms.length} Room(s): {item.floorData.rooms.map(r => r.roomNumber).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-zinc-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold bg-amber-50/50 px-2.5 py-1 rounded-md w-max">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{daysLeft} days until automatic purge</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => restoreArchivedItem(item.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-lg text-xs font-bold border border-emerald-100 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Floor
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteItemId(item.id)}
                        className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 transition-colors rounded-lg border border-transparent hover:border-red-105 cursor-pointer"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ROOMS TAB */}
      {archiveTab === 'rooms' && (
        deletedRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 animate-pulse">
              <DoorOpen className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-widest">No Archived Rooms</h3>
            <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">Archived rooms stay here for 15 days before permanent auto-purge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-350">
            {deletedRooms.map(item => {
              const daysLeft = getRemainingDays(item.deletedAt);
              return (
                <div key={item.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:shadow-md transition-all group flex flex-col justify-between">
                  <div className="mb-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 border border-blue-100">
                        <DoorOpen className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-zinc-800 text-base leading-tight">{item.name}</h3>
                        <p className="text-xs text-teal-600 font-semibold mt-1 truncate">Belonged to: {getAssociatedHouseName(item.houseId)}</p>
                        {item.roomData?.rentAmount && (
                          <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">Rent: NPR {item.roomData.rentAmount}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-zinc-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold bg-amber-50/50 px-2.5 py-1 rounded-md w-max">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{daysLeft} days until automatic purge</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => restoreArchivedItem(item.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors rounded-lg text-xs font-bold border border-emerald-100 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore Room
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteItemId(item.id)}
                        className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 transition-colors rounded-lg border border-transparent hover:border-red-105 cursor-pointer"
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmDeleteHouseId !== null}
        title="Permanently Delete Property"
        message={
          <>
            Are you sure you want to permanently delete <strong>{houseToDelete?.name}</strong>? 
            <br/><br/>
            <span className="text-red-600 font-semibold">Warning: This action cannot be undone and will permanently remove all associated rooms, tenants, and payment records.</span>
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

      <ConfirmModal
        isOpen={confirmDeleteItemId !== null}
        title={`Permanently Delete Archived Item`}
        message={
          <>
            Are you sure you want to permanently delete <strong>{itemToDelete?.name}</strong> from the archive? 
            <br/><br/>
            <span className="text-red-600 font-semibold">Warning: This action cannot be undone.</span>
          </>
        }
        onConfirm={() => {
          if (confirmDeleteItemId) {
            deleteArchivedItemPermanently(confirmDeleteItemId);
            setConfirmDeleteItemId(null);
          }
        }}
        onCancel={() => setConfirmDeleteItemId(null)}
        confirmText="Delete Permanently"
      />
    </div>
  );
}
