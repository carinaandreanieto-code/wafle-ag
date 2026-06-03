import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TableCall } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Clock, 
  Navigation,
  Compass,
  Loader2,
  ChevronUp,
  ShoppingBag,
  Truck,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { formatCurrency } from '../utils';

interface AdminClientMapProps {
  calls: TableCall[];
}

interface GeoCache {
  [address: string]: { lat: number; lng: number };
}

export default function AdminClientMap({ calls }: AdminClientMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Choose date state
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [selectedDayNum, setSelectedDayNum] = useState<number>(today.getDate());

  const [geocodedData, setGeocodedData] = useState<{ [address: string]: { lat: number; lng: number } }>({});
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Helper date parts conversion
  const getLocalDateParts = (isoString: string) => {
    const d = new Date(isoString);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate()
    };
  };

  // Filter calls of selected date that have a valid address string
  const activeDayCalls = calls.filter(c => {
    if (!c.userAddress || c.userAddress.trim().length === 0) return false;
    const p = getLocalDateParts(c.timestamp);
    return p.year === selectedYear && p.month === selectedMonth && p.day === selectedDayNum;
  });

  // Calculate days in month to render list of days for quick selection
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Geocode active day addresses with OSM Nominatim API + LocalStorage cache
  useEffect(() => {
    let active = true;
    
    const geocodeAddresses = async () => {
      const addressesToGeocode = activeDayCalls
        .map(c => c.userAddress || '')
        .filter(addr => addr.trim().length > 0);
        
      if (addressesToGeocode.length === 0) {
        setGeocodedData({});
        return;
      }
      
      setLoadingGeocode(true);
      
      const cacheStr = localStorage.getItem('osm_geocoding_cache');
      const cache: GeoCache = cacheStr ? JSON.parse(cacheStr) : {};
      let updated = false;

      const results: { [address: string]: { lat: number; lng: number } } = {};

      for (const addr of addressesToGeocode) {
        if (!active) return;
        
        if (cache[addr]) {
          results[addr] = cache[addr];
        } else {
          try {
            // Polite delay for Nominatim lookup
            await new Promise(resolve => setTimeout(resolve, 600));
            
            const searchQuery = addr.toLowerCase().includes('alta gracia')
              ? addr
              : `${addr}, Alta Gracia, Córdoba, Argentina`;

            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
              {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'BarApp-Admin-Client-OSM'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                cache[addr] = { lat, lng };
                results[addr] = { lat, lng };
                updated = true;
              }
            }
          } catch (err) {
            console.error("OSM Geocoding failed for:", addr, err);
          }
        }
      }

      if (updated) {
        localStorage.setItem('osm_geocoding_cache', JSON.stringify(cache));
      }
      
      if (active) {
        setGeocodedData(results);
        setLoadingGeocode(false);
      }
    };

    geocodeAddresses();
    
    return () => {
      active = false;
    };
  }, [selectedYear, selectedMonth, selectedDayNum, calls]);

  // Handle Leaflet initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Center map on Alta Gracia, Córdoba
    const defaultLat = -31.6529;
    const defaultLng = -64.4283;
    
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 14);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    mapRef.current = map;
    
    // Auto sync layout on resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);
    
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers when active calls change or geocoding resolves
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Flush current markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    const bounds: L.LatLngExpression[] = [];
    
    activeDayCalls.forEach(call => {
      const address = call.userAddress || '';
      const coords = geocodedData[address];
      
      if (coords) {
        // Status color configuration
        let colorClass = 'bg-red-500 ring-red-500/40 text-red-150'; // pending
        if (call.status === 'attending') {
          colorClass = 'bg-amber-500 ring-amber-500/40 text-amber-950';
        } else if (call.status === 'ready') {
          colorClass = 'bg-blue-500 ring-blue-500/40 text-blue-150';
        } else if (call.status === 'completed') {
          colorClass = 'bg-emerald-500 ring-emerald-500/40 text-emerald-150';
        }

        const customIcon = L.divIcon({
          className: 'admin-client-marker',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white/95 ${colorClass} text-white font-extrabold shadow-2xl shadow-black/80 ring-4 transition-all duration-300">
              <span class="absolute inline-flex h-full w-full rounded-full animate-ping bg-white/10 opacity-30"></span>
              <span class="text-[10px] uppercase font-black tracking-tighter">${(call.userName || '?').substring(0, 3)}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });
        
        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => {
            setSelectedCallId(call.id);
            map.setView([coords.lat, coords.lng], 15);
          });
          
        markersRef.current.push(marker);
        bounds.push([coords.lat, coords.lng]);
      }
    });
    
    // Fit to map viewport
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 15 });
    }
  }, [activeDayCalls, geocodedData]);

  const handleFitAll = () => {
    const map = mapRef.current;
    if (!map) return;
    
    const bounds: L.LatLngExpression[] = [];
    activeDayCalls.forEach(call => {
      const address = call.userAddress || '';
      const coords = geocodedData[address];
      if (coords) bounds.push([coords.lat, coords.lng]);
    });
    
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  };

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

  // Find currently selected marker details
  const selectedCall = activeDayCalls.find(c => c.id === selectedCallId);

  return (
    <div className="flex flex-col h-[650px] bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden relative shadow-2xl">
      
      {/* 1. Header controls & date choosing bar */}
      <div className="bg-slate-950/90 border-b border-slate-850 p-4 space-y-3 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center">
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              <span>Mapa de Distribución de Clientes</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Inspecciona los domicilios mapeados para clientes con domicilio del día elegido.
            </p>
          </div>

          {/* Month selector control */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-850 p-1 rounded-xl flex-shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-black uppercase text-slate-350 min-w-[100px] text-center tracking-wide">
              {monthsList[selectedMonth]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Responsive horizontal timeline tracker */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scroll-smooth no-scrollbar border-t border-white/5 pt-2">
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const isSelected = selectedDayNum === dayNum;
            const isToday = today.getDate() === dayNum && today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;

            // Count deliveries scheduled on this exact day
            const countForDay = calls.filter(c => {
              if (!c.userAddress || c.userAddress.trim().length === 0) return false;
              const p = getLocalDateParts(c.timestamp);
              return p.year === selectedYear && p.month === selectedMonth && p.day === dayNum;
            }).length;

            return (
              <button
                key={`sel-day-${dayNum}`}
                type="button"
                onClick={() => {
                  setSelectedDayNum(dayNum);
                  setSelectedCallId(null);
                }}
                className={`py-1.5 px-3 rounded-lg text-center flex flex-col items-center justify-between min-w-[42px] border transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-amber-500 border-amber-400 text-black shadow shadow-amber-500/20'
                    : isToday
                      ? 'bg-slate-900 border-amber-500/40 text-amber-400'
                      : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900 hover:border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[9px] uppercase font-black opacity-80 leading-none">Día</span>
                <span className="text-xs font-black font-mono leading-none my-0.5">{dayNum}</span>
                {countForDay > 0 ? (
                  <span className={`w-4 h-4 rounded-full text-[8.5px] font-black flex items-center justify-center leading-none ${
                    isSelected ? 'bg-black text-white' : 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {countForDay}
                  </span>
                ) : (
                  <span className="text-[8px] opacity-20">-</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. OSM Map elements panel */}
      <div className="relative flex-1 w-full bg-[#030612]">
        <div id="admin-interactive-osm" ref={mapContainerRef} className="w-full h-full" />

        {/* Floating status geocoding notification bar */}
        {loadingGeocode && (
          <div className="absolute top-4 left-4 z-[999] bg-slate-950/95 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 flex items-center space-x-2 shadow-2xl backdrop-blur-md">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Geocodificando entregas...</span>
          </div>
        )}

        {/* Fit viewer button */}
        <button
          onClick={handleFitAll}
          className="absolute bottom-6 right-4 z-[99] bg-slate-950 text-white p-3 rounded-xl border border-slate-800 shadow-2xl hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center"
          title="Ver todos los clientes mapeados hoy"
        >
          <Compass className="w-4 h-4 text-amber-500" />
        </button>

        {/* Right side floating legend of markers */}
        <div className="absolute top-4 right-4 z-[99] bg-slate-950/90 border border-slate-850/90 rounded-xl p-2.5 shadow-xl backdrop-blur-md text-[8.5px] font-bold text-slate-400 uppercase tracking-widest space-y-1.5 max-w-[110px]">
          <div className="text-[7.5px] opacity-50 mb-1 border-b border-white/5 pb-1">Estados</div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Pendiente</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>En Cocina</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>En Camino</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Entregado</span>
          </div>
        </div>

        {/* If no calls on chosen date with addresses */}
        {activeDayCalls.length === 0 && (
          <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <div className="max-w-xs space-y-3.5">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                <MapPin className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">Sin Entregas Registradas</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                No hay pedidos con dirección de domicilio registrada para el {selectedDayNum} de {monthsList[selectedMonth]} {selectedYear}. Las entregas a domicilio aparecerán mapeadas automáticamente al asentar pedidos.
              </p>
            </div>
          </div>
        )}

        {/* Clicked delivery drawer card details */}
        {selectedCall && (
          <div className="absolute bottom-4 left-4 right-4 z-[99] bg-slate-950/95 border border-slate-800 rounded-2xl p-4 shadow-2xl shadow-black/90 backdrop-blur-md max-w-md mx-auto">
            <div className="flex items-start justify-between pb-2 border-b border-white/5 mb-2.5">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded uppercase">
                    {selectedCall.userName || 'Usuario'}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                    selectedCall.status === 'completed' 
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : selectedCall.status === 'ready'
                        ? 'bg-blue-600 text-white'
                        : selectedCall.status === 'attending'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {selectedCall.status === 'completed' ? 'Entregado (Hecho)' : selectedCall.status === 'ready' ? 'En Camino' : selectedCall.status === 'attending' ? 'En Cocina' : 'Pendiente'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-1.5 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span className="truncate max-w-[250px]">{selectedCall.userAddress}</span>
                </h4>
              </div>

              <button 
                onClick={() => setSelectedCallId(null)}
                className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-350 bg-slate-900 border border-slate-800 px-2 py-1 rounded"
              >
                Cerrar
              </button>
            </div>

            {/* Cart products description code */}
            <div className="max-h-20 overflow-y-auto bg-black/40 rounded-lg p-2 space-y-1 text-[10px] border border-white/5 mb-2.5 no-scrollbar">
              {selectedCall.wishlist?.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-slate-300">
                  <span>
                    <strong className="text-amber-500 font-bold">{item.quantity}x</strong> {item.productName}
                  </span>
                  <span className="font-mono text-slate-500">
                    {formatCurrency(item.selectedPriceValue * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 text-[10px] justify-between items-center bg-[#070c18] p-2 rounded-xl border border-white/5">
              <span className="text-slate-500 font-black uppercase tracking-wider text-[8px]">Monto facturado:</span>
              <span className="font-black text-amber-500 text-xs font-mono">
                {formatCurrency(selectedCall.wishlist?.reduce((acc, x) => acc + (x.selectedPriceValue * x.quantity), 0) || 0)}
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
