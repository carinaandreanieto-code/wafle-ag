import React, { useState } from 'react';
import { TableCall } from '../types';
import { formatCurrency } from '../utils';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag,
  User,
  Truck,
  FileText,
  MapPin,
  ClipboardList
} from 'lucide-react';

interface AdminFinanceProps {
  calls: TableCall[];
}

export default function AdminFinance({ calls }: AdminFinanceProps) {
  // Use current local date for default values
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [selectedDayNum, setSelectedDayNum] = useState<number>(today.getDate());

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Helper to get total of a single call
  const getCallTotal = (call: TableCall) => {
    if (!call.wishlist || call.wishlist.length === 0) return 0;
    return call.wishlist.reduce((acc, item) => acc + (item.selectedPriceValue * item.quantity), 0);
  };

  // Helper to extract local date parts safely
  const getLocalDateParts = (isoString: string) => {
    const d = new Date(isoString);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate()
    };
  };

  // Filter completed/settled calls (could also include 'ready' / delivered/delivered orders if relevant, but let's prioritize 'completed' as finalized revenue)
  const completedCalls = calls.filter(c => c.status === 'completed');

  // Compute Today's Revenue (using today's actual calendar date)
  const todayParts = {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate()
  };

  const todayRevenue = completedCalls
    .filter(c => {
      const p = getLocalDateParts(c.timestamp);
      return p.year === todayParts.year && p.month === todayParts.month && p.day === todayParts.day;
    })
    .reduce((acc, c) => acc + getCallTotal(c), 0);

  // Compute Selected Month's Revenue
  const monthRevenue = completedCalls
    .filter(c => {
      const p = getLocalDateParts(c.timestamp);
      return p.year === selectedYear && p.month === selectedMonth;
    })
    .reduce((acc, c) => acc + getCallTotal(c), 0);

  // Compute list of calls for the selected day
  const selectedDayCalls = completedCalls.filter(c => {
    const p = getLocalDateParts(c.timestamp);
    return p.year === selectedYear && p.month === selectedMonth && p.day === selectedDayNum;
  });

  const selectedDayRevenue = selectedDayCalls.reduce((acc, c) => acc + getCallTotal(c), 0);

  // Calculate daily totals for the currently chosen month/year to render in the calendar
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  
  // Create an array mapping day number -> total revenue
  const dailyRevenuesMap: { [day: number]: number } = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailyRevenuesMap[d] = 0;
  }

  completedCalls.forEach(c => {
    const p = getLocalDateParts(c.timestamp);
    if (p.year === selectedYear && p.month === selectedMonth) {
      dailyRevenuesMap[p.day] = (dailyRevenuesMap[p.day] || 0) + getCallTotal(c);
    }
  });

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(v => v - 1);
    } else {
      setSelectedMonth(v => v - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(v => v + 1);
    } else {
      setSelectedMonth(v => v + 1);
    }
  };

  // Generate calendar padding days
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sat, 1 = Mon (Argentina uses standard standard days)
  // Shift calendar first day index to Monday-first for visual comfort
  // Sunday is 0 inside JS Date, converting to 0 = Monday, ..., 6 = Sunday
  const firstDayOfWeek = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6 text-slate-100 max-w-[1500px] mx-auto pb-12">
      
      {/* 1. Header Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Cash Card */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/20 rounded-2xl p-4 md:p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-amber-500">Caja del Día Actual</span>
            <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500 border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-tight">
            {formatCurrency(todayRevenue)}
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Ventas completadas procesadas hoy
          </p>
        </div>

        {/* Selected Month's Cash Card */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 md:p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-indigo-400">Caja Mensual ({monthsList[selectedMonth]})</span>
            <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-tight">
            {formatCurrency(monthRevenue)}
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center">
            <span className="font-bold text-indigo-400 mr-1">{selectedYear}</span> - Consolidado del mes seleccionado
          </p>
        </div>

        {/* Selected Day's Cash Card */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 md:p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-emerald-400">Total Día {selectedDayNum} de {monthsList[selectedMonth]}</span>
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight leading-tight">
            {formatCurrency(selectedDayRevenue)}
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center">
            <span className="bg-emerald-950 text-emerald-400 px-1 rounded-md text-[9px] font-black mr-1">{selectedDayCalls.length} pedidos</span> 
            completados en esta jornada
          </p>
        </div>
      </div>

      {/* 2. Interactive Calendar & Days Breakdown Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Calendar Column (7/12 cols) */}
        <div className="lg:col-span-7 bg-slate-950/40 p-4 md:p-5 rounded-2xl border border-slate-850 shadow-2xl flex flex-col justify-between">
          <div>
            {/* Calendar Controls Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Caja del Mes Paso a Paso</h3>
                <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5">Toca cualquier casillero para ver e inspeccionar su recaudación.</p>
              </div>
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-1 py-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg active:scale-95 transition-all"
                  title="Mes Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black uppercase text-amber-500 px-2 min-w-[110px] text-center">
                  {monthsList[selectedMonth]} {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg active:scale-95 transition-all"
                  title="Siguiente Mes"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays indicator bar */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {weekdays.map(d_name => (
                <span key={d_name} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest py-1.5">
                  {d_name}
                </span>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty padding blocks */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`padding-${idx}`} className="bg-slate-950/10 border border-transparent rounded-xl h-14 opacity-20" />
              ))}

              {/* Day blocks */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const rev = dailyRevenuesMap[dayNum] || 0;
                const isSelected = selectedDayNum === dayNum;
                const isToday = today.getDate() === dayNum && today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDayNum(dayNum)}
                    className={`h-14 rounded-xl border flex flex-col justify-between p-1.5 transition-all outline-none ${
                      isSelected
                        ? 'bg-indigo-600/80 border-indigo-400/60 shadow-lg shadow-indigo-600/20'
                        : isToday
                          ? 'bg-slate-900 border-amber-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-850 hover:bg-slate-900 hover:border-slate-750'
                    }`}
                  >
                    {/* Day number block */}
                    <div className="w-full flex justify-between items-center text-[10px] font-black">
                      <span className={isSelected ? 'text-white' : isToday ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Hoy" />
                      )}
                    </div>

                    {/* Revenue sum preview */}
                    {rev > 0 ? (
                      <div className={`text-[8.5px] font-extrabold font-mono truncate max-w-full tracking-tighter px-1 py-0.2 rounded-md ${
                        isSelected 
                          ? 'bg-white text-indigo-900' 
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        ${Math.round(rev).toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-[8.5px] text-slate-700 font-mono tracking-tighter leading-none pb-0.5">
                        -
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats list summary of top sales days */}
          <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
            <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Jornadas con Mayor Recaudación del Mes</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(dailyRevenuesMap)
                .filter(([_, value]) => value > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([dayStr, val]) => (
                  <button
                    key={`top-${dayStr}`}
                    onClick={() => setSelectedDayNum(Number(dayStr))}
                    className="p-2 bg-slate-900/60 border border-slate-850 rounded-xl hover:border-indigo-500/40 text-left transition-all flex items-center justify-between"
                  >
                    <span className="text-[10px] font-black text-white">Día {dayStr}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{formatCurrency(val)}</span>
                  </button>
                ))}
              {Object.entries(dailyRevenuesMap).filter(([_, v]) => v > 0).length === 0 && (
                <span className="text-[11px] text-slate-500 italic">No hay registros financieros este mes.</span>
              )}
            </div>
          </div>
        </div>

        {/* Selected Day Details SidePanel (5/12 cols) */}
        <div className="lg:col-span-5 bg-slate-950/40 p-4 md:p-5 rounded-2xl border border-slate-850 shadow-2xl flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#f59e0b] flex items-center">
                  <ClipboardList className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  Consolidado Detallado - Día {selectedDayNum}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Movimientos registrados para el {selectedDayNum} de {monthsList[selectedMonth]} {selectedYear}
                </p>
              </div>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-mono text-indigo-400">
                {selectedDayCalls.length} pedidos
              </span>
            </div>

            {/* List of deliveries of that day */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
              {selectedDayCalls.length === 0 ? (
                <div className="py-12 text-center text-slate-650 flex flex-col items-center justify-center space-y-2">
                  <ShoppingBag className="w-8 h-8 opacity-40 animate-pulse text-slate-550" />
                  <p className="text-xs font-bold text-slate-400">Sin ventas completadas</p>
                  <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                    No se registraron ventas con estado "Hecho" elegidas para la fecha seleccionada.
                  </p>
                </div>
              ) : (
                selectedDayCalls.map((call) => {
                  const total = getCallTotal(call);
                  return (
                    <div key={call.id} className="bg-slate-950/80 p-3 rounded-xl border border-slate-850/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 bg-slate-900 rounded text-[9px] font-black uppercase text-amber-400 border border-slate-800">
                            {call.userName || 'Anónimo'}
                          </span>
                          <span className="text-[9px] text-slate-500 flex items-center font-mono">
                            <Clock className="w-2.5 h-2.5 mr-0.5" />
                            {new Date(call.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-emerald-400">
                          {formatCurrency(total)}
                        </span>
                      </div>

                      {/* Items details */}
                      <div className="bg-black/30 p-2 rounded-lg border border-white/5 space-y-1">
                        {call.wishlist?.map((item, id) => (
                          <div key={id} className="flex justify-between items-center text-[10px] text-slate-400 leading-tight">
                            <span>
                              <strong className="text-amber-500 font-bold">{item.quantity}x</strong> {item.productName}
                              {item.selectedPriceLabel && <span className="opacity-60 ml-0.5">({item.selectedPriceLabel})</span>}
                            </span>
                            <span className="font-mono text-slate-500 flex-shrink-0">
                              {formatCurrency(item.selectedPriceValue * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Contact & destination metadata */}
                      <div className="flex flex-col text-[9px] text-slate-500 space-y-0.5 border-t border-white/5 pt-1.5">
                        {call.userAddress && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                            <span className="truncate max-w-[280px]">{call.userAddress}</span>
                          </div>
                        )}
                        {call.waiterName && (
                          <div className="flex items-center space-x-1">
                            <Truck className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                            <span>Repartidor: <strong className="text-slate-400">{call.waiterName}</strong></span>
                          </div>
                        )}
                        {call.notes && (
                          <div className="flex items-center space-x-1">
                            <FileText className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                            <span className="truncate">Chat: <span className="text-slate-400 italic">"{call.notes}"</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Day Cash Summary Box */}
          {selectedDayCalls.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-slate-800 bg-[#0c142c] p-3 rounded-xl border border-slate-800/80 flex justify-between items-center">
              <span className="text-xs text-indigo-300 font-extrabold uppercase">Cierre de Caja {selectedDayNum}:</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {formatCurrency(selectedDayRevenue)}
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
