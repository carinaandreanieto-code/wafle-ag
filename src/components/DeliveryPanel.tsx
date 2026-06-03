import React, { useState, useEffect } from 'react';
import { TableCall } from '../types';
import { subscribeCalls, saveCall } from '../firebase';
import { formatCurrency } from '../utils';
import { 
  Truck, 
  Map as MapIcon, 
  X, 
  CheckCircle, 
  Navigation, 
  Clock, 
  Phone,
  LayoutList,
  ChevronRight,
  ShoppingBag
} from 'lucide-react';
import OSMMap from './OSMMap';
import { motion, AnimatePresence } from 'motion/react';

interface DeliveryPanelProps {
  onClose: () => void;
}

export default function DeliveryPanel({ onClose }: DeliveryPanelProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [calls, setCalls] = useState<TableCall[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    call: TableCall;
    nextStatus: 'ready' | 'completed';
  } | null>(null);

  // Subscribe to real-time calls
  useEffect(() => {
    const unsub = subscribeCalls((loadedCalls) => {
      // Show orders that are being prepared (attending) or are already on the way (ready)
      const active = loadedCalls.filter(c => c.status === 'attending' || c.status === 'ready');
      setCalls(active);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = (call: TableCall, nextStatus: 'ready' | 'completed') => {
    setConfirmModal({ call, nextStatus });
  };

  const handleOpenGPS = (address: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-[#070b19] text-slate-100 flex flex-col z-50 select-text overflow-hidden animate-slide-up">
      
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Truck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-extrabold tracking-tight text-white uppercase">
                Panel Delivery
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">Pedidos Activos en Tiempo Real</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'list' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'map' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mapa</span>
              </button>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        
        {viewMode === 'list' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
            <div className="max-w-2xl mx-auto space-y-4">
              {calls.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                    <ShoppingBag className="w-8 h-8 text-slate-700" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin pedidos pendientes</h3>
                  <p className="text-xs text-slate-500">Relájate un momento, no hay nada que entregar por ahora.</p>
                </div>
              ) : (
                calls.map((call) => (
                  <motion.div 
                    layout
                    key={call.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-indigo-500 text-white rounded text-[10px] font-black uppercase">
                            {call.userName}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            call.status === 'ready' ? 'bg-blue-600 text-white' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {call.status === 'ready' ? 'En Camino' : 'En Cocina'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(call.timestamp).toLocaleTimeString()}</span>
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white flex items-center space-x-2">
                          <Navigation className="w-4 h-4 text-emerald-500" />
                          <span>{call.userAddress}</span>
                        </h4>
                        <div className="flex items-center space-x-2 text-slate-400">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs font-mono">{call.userPhone}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase font-black text-slate-500 mb-1">Total Pedido</span>
                        <span className="text-lg font-black text-amber-500 font-mono">
                          {formatCurrency(call.wishlist?.reduce((acc, x) => acc + (x.selectedPriceValue * x.quantity), 0) || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Wishlist summary */}
                    <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-2">
                      <span className="block text-[9px] uppercase font-black text-slate-500 tracking-widest">Productos</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                        {call.wishlist?.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-slate-200 truncate pr-2">
                              <span className="font-bold text-amber-500">{item.quantity}x</span> {item.productName}
                            </span>
                            <span className="text-slate-400 font-mono flex-shrink-0">{formatCurrency(item.selectedPriceValue * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleOpenGPS(call.userAddress || '')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center space-x-2 active:scale-95 transition-all"
                      >
                        <MapIcon className="w-4 h-4 text-white" />
                        <span>GPS</span>
                      </button>
                      
                      {call.status === 'attending' ? (
                        <button 
                          onClick={() => handleUpdateStatus(call, 'ready')}
                          className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Retirar (En Camino)</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUpdateStatus(call, 'completed')}
                          className="flex-[1.5] bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Entregado (Hecho)</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-slate-950 relative">
            <OSMMap 
              calls={calls}
              onUpdateStatus={handleUpdateStatus}
              onOpenGPS={handleOpenGPS}
            />
          </div>
        )}

      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl"
            >
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                {confirmModal.nextStatus === 'ready' ? (
                  <Truck className="w-6 h-6 text-amber-500 animate-pulse" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-emerald-500 animate-pulse" />
                )}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase text-white tracking-wider">
                  {confirmModal.nextStatus === 'ready' 
                    ? "¿Marcar como 'En Camino'?" 
                    : "¿Marcar como 'Entregado'?"}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmModal.nextStatus === 'ready'
                    ? "El pedido cambiará de estado y el cliente verá que su pedido está en camino."
                    : "El pedido se marcará como Hecho y se archivará del panel de entregas activo."}
                </p>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 py-3 rounded-xl text-xs font-bold uppercase transition-all active:scale-95 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { call, nextStatus } = confirmModal;
                    setConfirmModal(null);
                    try {
                      const updatedCall = { ...call, status: nextStatus };
                      await saveCall(updatedCall);
                      console.log(`Update ${call.id} to ${nextStatus} succeeded`);
                    } catch (error) {
                      console.error("Error updating call status:", error);
                    }
                  }}
                  className={`flex-1 ${
                    confirmModal.nextStatus === 'ready'
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                  } text-white py-3 rounded-xl text-xs font-bold uppercase transition-all active:scale-95 shadow-lg`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
