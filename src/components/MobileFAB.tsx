import React, { useState } from 'react';
import { Plus, X, UserPlus, DollarSign, DoorOpen, Zap, Building } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function MobileFAB() {
  const { setCurrentView, setGlobalAction, activeHouseId } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleShortcut = (view: any, action: any) => {
    setCurrentView(view);
    // Smooth transition delay to let target route render before opening the interactive dialog
    setTimeout(() => {
      setGlobalAction(action);
    }, 150);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* Overlay Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[990] transition-opacity duration-300"
        />
      )}

      {/* Shortcuts Stack Panel */}
      <div className={`fixed bottom-24 right-5 z-[995] flex flex-col items-end gap-3.5 transition-all duration-300 transform ${
        isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'
      }`}>
        {activeHouseId === 'all' ? (
          <div className="flex items-center gap-3">
            <span className="bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md border border-zinc-800">
              Add Property
            </span>
            <button
              onClick={() => {
                setGlobalAction('add-property');
                setIsOpen(false);
              }}
              className="w-11 h-11 bg-white hover:bg-zinc-50 text-teal-600 rounded-full flex items-center justify-center shadow-lg border border-zinc-100 hover:scale-105 active:scale-95 transition-all"
              title="Add Property"
            >
              <Building className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            {/* Onboarding */}
            <div className="flex items-center gap-3">
              <span className="bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md border border-zinc-800">
                Onboard Tenant
              </span>
              <button
                onClick={() => handleShortcut('occupancy', 'onboard')}
                className="w-11 h-11 bg-white hover:bg-zinc-50 text-teal-600 rounded-full flex items-center justify-center shadow-lg border border-zinc-100 hover:scale-105 active:scale-95 transition-all"
                title="Onboard Tenant"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>

            {/* Record Payment */}
            <div className="flex items-center gap-3">
              <span className="bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md border border-zinc-800">
                Record Payment
              </span>
              <button
                onClick={() => handleShortcut('payments', 'payment')}
                className="w-11 h-11 bg-white hover:bg-zinc-50 text-emerald-600 rounded-full flex items-center justify-center shadow-lg border border-zinc-100 hover:scale-105 active:scale-95 transition-all"
                title="Record Rent Payment"
              >
                <DollarSign className="w-5 h-5" />
              </button>
            </div>

            {/* Map/Add Rooms */}
            <div className="flex items-center gap-3">
              <span className="bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md border border-zinc-800">
                Map/Add Rooms
              </span>
              <button
                onClick={() => handleShortcut('layout', 'room')}
                className="w-11 h-11 bg-white hover:bg-zinc-50 text-amber-600 rounded-full flex items-center justify-center shadow-lg border border-zinc-100 hover:scale-105 active:scale-95 transition-all"
                title="Map/Add Rooms"
              >
                <DoorOpen className="w-5 h-5" />
              </button>
            </div>

            {/* Utility Meter Readings */}
            <div className="flex items-center gap-3">
              <span className="bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md border border-zinc-800">
                Enter Meter Values
              </span>
              <button
                onClick={() => handleShortcut('occupancy', 'meters')}
                className="w-11 h-11 bg-white hover:bg-zinc-50 text-cyan-600 rounded-full flex items-center justify-center shadow-lg border border-zinc-100 hover:scale-105 active:scale-95 transition-all"
                title="Update Meter Values"
              >
                <Zap className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main floating action trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-5 z-[1000] w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
          isOpen ? 'rotate-45 bg-zinc-900 hover:bg-zinc-800' : 'hover:scale-[1.08]'
        }`}
        aria-label="Toggle Quick Shortcuts Menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
