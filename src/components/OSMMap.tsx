import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TableCall } from '../types';
import { 
  Navigation, 
  Phone, 
  Clock, 
  MapPin, 
  Map as MapIcon, 
  Truck, 
  CheckCircle,
  Loader2,
  Compass,
  ShoppingBag
} from 'lucide-react';
import { formatCurrency } from '../utils';

interface OSMMapProps {
  calls: TableCall[];
  onUpdateStatus: (call: TableCall, nextStatus: 'ready' | 'completed') => void;
  onOpenGPS: (address: string) => void;
}

interface GeoCache {
  [address: string]: { lat: number; lng: number };
}

export default function OSMMap({ calls, onUpdateStatus, onOpenGPS }: OSMMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  
  const [geocodedData, setGeocodedData] = useState<{[address: string]: {lat: number; lng: number}}>({});
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Load cache and geocode calls
  useEffect(() => {
    let active = true;
    
    const geocodeAddresses = async () => {
      const addressesToGeocode = calls
        .map(c => c.userAddress || '')
        .filter(addr => addr.trim().length > 0);
        
      if (addressesToGeocode.length === 0) return;
      
      setLoadingGeocode(true);
      
      // Read cache
      const cacheStr = localStorage.getItem('osm_geocoding_cache');
      const cache: GeoCache = cacheStr ? JSON.parse(cacheStr) : {};
      let updated = false;

      const results: {[address: string]: {lat: number; lng: number}} = {};

      for (const addr of addressesToGeocode) {
        if (!active) return;
        
        if (cache[addr]) {
          results[addr] = cache[addr];
        } else {
          try {
            // Polite delay for Nominatim API
            await new Promise(resolve => setTimeout(resolve, 600));
            
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`,
              {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'BarApp-Delivery-Panel-OSM'
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
            console.error("Geocoding failed for:", addr, err);
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
  }, [calls]);

  // Initial map setup
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Create Leaflet map instance
    const defaultLat = -34.6037;
    const defaultLng = -58.3816;
    
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 12);
    
    // Dark matter/slate styled tiles for beautiful dark mode
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    mapRef.current = map;
    
    // Handle container resize
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

  // Sync Markers and Boundaries
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    const bounds: L.LatLngExpression[] = [];
    
    calls.forEach(call => {
      const address = call.userAddress || '';
      const coords = geocodedData[address];
      
      if (coords) {
        const isEnCamino = call.status === 'ready';
        const colorClass = isEnCamino ? 'bg-blue-500 ring-blue-500/40 text-blue-150' : 'bg-emerald-500 ring-emerald-500/40 text-emerald-150';
        
        // Custom interactive glowing marker
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white/90 ${colorClass} text-white font-extrabold shadow-lg shadow-black/80 ring-4 transition-all duration-300">
              <span class="absolute inline-flex h-full w-full rounded-full animate-ping bg-white/20 opacity-40"></span>
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
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
    
    // Adjust view to contain all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [60, 60], maxZoom: 15 });
    }
  }, [calls, geocodedData]);

  // Find currently selected call details
  const selectedCall = calls.find(c => c.id === selectedCallId);

  // Zoom center helper for fitting all active markers
  const handleFitAll = () => {
    const map = mapRef.current;
    if (!map) return;
    
    const bounds: L.LatLngExpression[] = [];
    calls.forEach(call => {
      const address = call.userAddress || '';
      const coords = geocodedData[address];
      if (coords) {
        bounds.push([coords.lat, coords.lng]);
      }
    });
    
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [60, 60] });
    }
  };

  return (
    <div className="flex-1 w-full h-full relative flex flex-col">
      {/* Search status / Geocode loader */}
      {loadingGeocode && (
        <div className="absolute top-4 left-4 z-[999] bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 flex items-center space-x-2 shadow-2xl backdrop-blur-md">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-medium">Geolocalizando nuevas entregas...</span>
        </div>
      )}

      {/* Map Element Container */}
      <div id="osm-delivery-map" ref={mapContainerRef} className="w-full h-full flex-1" />

      {/* Reset view control button */}
      <button
        onClick={handleFitAll}
        className="absolute bottom-20 right-4 z-[999] bg-slate-950 text-white p-3 rounded-xl border border-slate-800 shadow-2xl hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center"
        title="Centrar mapa en todas las entregas"
      >
        <Compass className="w-5 h-5 text-amber-500" />
      </button>

      {/* Floating Order details bottom-drawer */}
      {selectedCall && (
        <div className="absolute bottom-4 left-4 right-4 z-[999] bg-slate-950/95 border border-slate-800 rounded-2xl p-4 shadow-2xl shadow-black/80 backdrop-blur-md max-w-lg mx-auto animate-slide-up">
          <div className="flex items-start justify-between mb-3 border-b border-white/5 pb-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-600 uppercase text-white">
                  {selectedCall.userName}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  selectedCall.status === 'ready' ? 'bg-blue-600 text-white' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {selectedCall.status === 'ready' ? 'En Camino' : 'En Cocina'}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(selectedCall.timestamp).toLocaleTimeString()}</span>
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{selectedCall.userAddress}</span>
              </h4>
              {selectedCall.userPhone && (
                <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span className="font-mono">{selectedCall.userPhone}</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setSelectedCallId(null)}
              className="text-xs hover:text-white text-slate-500 bg-slate-900 border border-slate-800 p-1.5 rounded-lg"
            >
              Cerrar
            </button>
          </div>

          {/* Cart item products */}
          <div className="max-h-24 overflow-y-auto bg-black/30 rounded-lg p-2.5 space-y-1 text-xs border border-white/5 mb-3 no-scrollbar">
            {selectedCall.wishlist?.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-slate-300">
                <span>
                  <strong className="text-amber-500 font-bold">{item.quantity}x</strong> {item.productName}
                </span>
                <span className="font-mono text-slate-400">
                  {formatCurrency(item.selectedPriceValue * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs mb-3">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total a cobrar:</span>
            <span className="text-sm font-black text-amber-500 font-mono">
              {formatCurrency(selectedCall.wishlist?.reduce((acc, x) => acc + (x.selectedPriceValue * x.quantity), 0) || 0)}
            </span>
          </div>

          {/* Action cluster */}
          <div className="flex gap-2">
            <button
              onClick={() => onOpenGPS(selectedCall.userAddress || '')}
              className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white py-2.5 rounded-xl text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-white" />
              <span>GPS</span>
            </button>

            {selectedCall.status === 'attending' ? (
              <button
                onClick={() => {
                  onUpdateStatus(selectedCall, 'ready');
                  setSelectedCallId(null);
                }}
                className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-lg shadow-blue-600/10"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>En Camino</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onUpdateStatus(selectedCall, 'completed');
                  setSelectedCallId(null);
                }}
                className="flex-[1.5] bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-600/10"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Hecho</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
