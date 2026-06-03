import React, { useState, useEffect } from 'react';
import { 
  Category, 
  Product, 
  RestaurantConfig, 
  TableCall, 
  ProductPrice 
} from '../types';
import { 
  saveCategory, 
  removeCategory, 
  saveProduct, 
  removeProduct, 
  saveRestaurantConfig, 
  subscribeCalls, 
  saveCall, 
  removeCall,
  loginWithGoogle,
  logout
} from '../firebase';
import { compressImage, formatCurrency } from '../utils';
import AdminFinance from './AdminFinance';
import AdminClientMap from './AdminClientMap';
import { 
  ShieldAlert, 
  Layers, 
  UtensilsCrossed, 
  Bell, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Camera, 
  Save, 
  CheckCircle, 
  Clock, 
  User as UserIcon, 
  FileText, 
  PhoneCall, 
  ChevronRight, 
  AlertTriangle,
  LogOut,
  LogIn,
  DollarSign,
  Map
} from 'lucide-react';

interface AdminPanelProps {
  categories: Category[];
  products: Product[];
  config: RestaurantConfig;
  isAdmin: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export default function AdminPanel({ categories, products, config, isAdmin, onClose, onRefreshData }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'leaves' | 'products' | 'calls' | 'chef' | 'caja' | 'mapa'>('calls');
  const [calls, setCalls] = useState<TableCall[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      alert("Error al iniciar sesión");
    } finally {
      setIsLoggingIn(false);
    }
  };
  const [callsFilter, setCallsFilter] = useState<'active' | 'completed' | 'all'>('active');
  
  // WhatsApp config input state
  const [whatsapp, setWhatsapp] = useState(config.whatsappNumber);
  const [restaurantName, setRestaurantName] = useState(config.restaurantName);
  const [pinCode, setPinCode] = useState(config.pinCode);
  const [isOpen, setIsOpen] = useState(config.isOpen !== false);

  // Category Editor state
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState(1);
  const [catBgStyle, setCatBgStyle] = useState<'luxury' | 'fastfood' | 'cafe' | 'neonbar' | 'dessert'>('luxury');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Product Editor state
  const [prodId, setProdId] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPhoto, setProdPhoto] = useState('');
  const [priceInputs, setPriceInputs] = useState<ProductPrice[]>([{ label: 'Sencillo', value: 0 }]);
  const [prodIsSuspended, setProdIsSuspended] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  // Chef Suggestion state
  const [chefName, setChefName] = useState(config.chefSuggestion?.name || '');
  const [chefDesc, setChefDesc] = useState(config.chefSuggestion?.description || '');
  const [chefPhoto, setChefPhoto] = useState(config.chefSuggestion?.photo || '');
  const [chefPrice, setChefPrice] = useState(config.chefSuggestion?.price || 0);
  const [chefActive, setChefActive] = useState(config.chefSuggestion?.active !== false);

  // Subscribe to real-time buzzer calls in admin panel
  useEffect(() => {
    const unsub = subscribeCalls((loadedCalls) => {
      setCalls(loadedCalls);
    });
    return () => unsub();
  }, []);

  // Pending orders alert sound
  useEffect(() => {
    const hasPending = calls.some(c => c.status === 'pending');
    
    let interval: NodeJS.Timeout | null = null;
    
    if (hasPending) {
      const playBeep = () => {
        // Use a simple beep sound URL
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play().catch(e => console.error("Audio playback failed", e));
      };
      
      playBeep();
      interval = setInterval(playBeep, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [calls]);

  // Sync category select on loads
  useEffect(() => {
    if (categories.length > 0 && !prodCategoryId) {
      setProdCategoryId(categories[0].id);
    }
  }, [categories, prodCategoryId]);

  // Save General Config
  const handleSaveGeneralConfig = async () => {
    const updatedConfig: RestaurantConfig = {
      ...config,
      restaurantName: restaurantName.trim(),
      pinCode: pinCode.trim(),
      whatsappNumber: whatsapp.trim(),
      isOpen: isOpen
    };
    await saveRestaurantConfig(updatedConfig);
    onRefreshData();
    alert("¡Configuración general guardada!");
  };

  // --- 1. HOJAS / CATEGORIES ACTIONS ---
  const handleSaveCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const id = editingCatId || 'cat_' + Date.now();
    const newCat: Category = {
      id,
      name: catName.trim(),
      order: catOrder,
      backgroundStyle: catBgStyle
    };

    await saveCategory(newCat);
    setCatName('');
    setCatOrder(categories.length + 2);
    setEditingCatId(null);
    onRefreshData();
  };

  const handleEditCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatOrder(cat.order);
    setCatBgStyle(cat.backgroundStyle);
  };

  const handleDeleteCat = async (id: string) => {
    if (confirm("Al eliminar esta hoja, también se eliminarán todos sus platos asociados. ¿Confirmas?")) {
      await removeCategory(id);
      onRefreshData();
    }
  };

  // --- 2. MENU PRODUCTS ACTIONS ---
  const handleAddPriceField = () => {
    setPriceInputs([...priceInputs, { label: 'Doble', value: 0 }]);
  };

  const handleRemovePriceField = (index: number) => {
    if (priceInputs.length === 1) return;
    setPriceInputs(priceInputs.filter((_, i) => i !== index));
  };

  const handlePriceInputChange = (index: number, field: keyof ProductPrice, val: string | number) => {
    const next = [...priceInputs];
    if (field === 'value') {
      next[index].value = Number(val) || 0;
    } else {
      next[index].label = String(val);
    }
    setPriceInputs(next);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 250, 250, 0.5);
        setProdPhoto(compressed);
      } catch (err) {
        alert("No se pudo procesar la imagen");
      }
    }
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodCategoryId) {
      alert("Por favor completa el nombre y selecciona una hoja");
      return;
    }

    const id = editingProdId || 'prod_' + Date.now();
    const newProduct: Product = {
      id,
      categoryId: prodCategoryId,
      name: prodName.trim(),
      description: prodDesc.trim(),
      photo: prodPhoto,
      prices: priceInputs.map(pi => ({ label: pi.label.trim() || 'General', value: Number(pi.value) || 0 })),
      isSuspended: prodIsSuspended
    };

    await saveProduct(newProduct);
    
    // Clear form
    setEditingProdId(null);
    setProdName('');
    setProdDesc('');
    setProdPhoto('');
    setPriceInputs([{ label: 'Sencillo', value: 0 }]);
    setProdIsSuspended(false);
    onRefreshData();
    alert("¡Producto guardado con éxito!");
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProdId(prod.id);
    setProdCategoryId(prod.categoryId);
    setProdName(prod.name);
    setProdDesc(prod.description);
    setProdPhoto(prod.photo);
    setPriceInputs(prod.prices.length > 0 ? prod.prices : [{ label: 'General', value: 0 }]);
    setProdIsSuspended(prod.isSuspended || false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      await removeProduct(id);
      onRefreshData();
    }
  };

  // --- 3. CALLS / OBSERVATIONS / STATUS CONTROL ---
  const handleUpdateCallStatus = async (call: TableCall, nextStatus: 'pending' | 'attending' | 'ready' | 'completed') => {
    const updated = { ...call, status: nextStatus };
    await saveCall(updated);
  };

  const handleSaveNotesAndWaiter = async (call: TableCall, notesText: string, waiterText: string) => {
    const updated = { ...call, notes: notesText, waiterName: waiterText };
    await saveCall(updated);
  };

  const handleDeleteCallHistory = async (id: string) => {
    if (!isAdmin) {
      alert("No tienes permisos para borrar registros.");
      return;
    }
    if (confirm("¿Limpiar registro de esta consulta?")) {
      try {
        await removeCall(id);
      } catch (err: any) {
        console.error("Delete error:", err);
        const errMsg = err?.message || "Error desconocido";
        if (errMsg.includes("permission") || errMsg.includes("insufficient")) {
          alert("Error: No tienes permisos suficientes en la base de datos para borrar este registro.");
        } else {
          alert(`Error al borrar el registro: ${errMsg}`);
        }
      }
    }
  };

  // --- 4. CHEF SUGGESTION ACTIONS ---
  const handleChefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 280, 280, 0.5);
        setChefPhoto(compressed);
      } catch (err) {
        alert("Error de compresión");
      }
    }
  };

  const handleSaveChefSuggestion = async () => {
    const updatedConfig: RestaurantConfig = {
      ...config,
      chefSuggestion: {
        name: chefName.trim() || "Plato Gourmet Especial",
        description: chefDesc.trim() || "Recomendación artesanal de hoy.",
        photo: chefPhoto,
        price: Number(chefPrice) || 0,
        active: chefActive
      }
    };
    await saveRestaurantConfig(updatedConfig);
    onRefreshData();
    alert("¡Sugerencia guardada!");
  };

  // Filtered calls list based on current selection
  const filteredCalls = calls.filter((call) => {
    if (callsFilter === 'active') return call.status !== 'completed';
    if (callsFilter === 'completed') return call.status === 'completed';
    return true;
  });

  return (
    <div className="fixed inset-0 bg-[#070b19] text-slate-100 flex flex-col z-50 select-text overflow-hidden animate-slide-up">
      
      {/* Top Header */}
      <div className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm md:text-base font-extrabold tracking-tight text-amber-400 flex items-center space-x-1.5 uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>Back-Office de Gestión</span>
            </h2>
            <p className="text-[10px] md:text-xs text-slate-400 font-mono tracking-tight">Consola de Mando en Vivo en la Nube</p>
          </div>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <div className="hidden md:flex items-center space-x-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <ShieldAlert className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Verificado</span>
              </div>
            )}
            {!isAdmin ? (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs text-white uppercase rounded-xl font-bold tracking-wider transition-all active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Iniciando...' : 'Acceso Admin (Google)'}</span>
              </button>
            ) : (
              <button
                onClick={() => logout()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white uppercase rounded-xl font-bold tracking-wider transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-white uppercase rounded-xl font-bold tracking-wider transition-all active:scale-95"
            >
              Cerrar Consola
            </button>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="bg-slate-950/60 border-b border-slate-850/80 p-2">
        <div className="max-w-[1700px] mx-auto grid grid-cols-3 md:flex gap-1.5 md:space-x-1.5">
          <button 
            onClick={() => setActiveTab('calls')}
            className={`py-2 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-tight flex items-center justify-center space-x-1.5 transition-all md:flex-initial ${activeTab === 'calls' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:bg-slate-900/40'}`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="relative">
              Consultas
              {calls.filter(c => c.status !== 'completed').length > 0 && (
                <span className="absolute -top-1.5 -right-3.5 px-1.5 py-0.5 text-[8.5px] font-black bg-red-650 text-white rounded-full leading-none scale-90 shadow">
                  {calls.filter(c => c.status !== 'completed').length}
                </span>
              )}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('leaves')}
            className={`py-2 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-tight flex items-center justify-center space-x-1.5 transition-all md:flex-initial ${activeTab === 'leaves' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:bg-slate-900/40'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hojas</span>
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`py-2 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-tight flex items-center justify-center space-x-1.5 transition-all md:flex-initial ${activeTab === 'products' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:bg-slate-900/40'}`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>PRODUCTOS</span>
          </button>
          <button 
            onClick={() => setActiveTab('chef')}
            className={`py-2 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-tight flex items-center justify-center space-x-1.5 transition-all md:flex-initial ${activeTab === 'chef' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:bg-slate-900/40'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SUGERENCIA</span>
          </button>
          <button 
            onClick={() => setActiveTab('caja')}
            className={`py-2 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-tight flex items-center justify-center space-x-1.5 transition-all md:flex-initial ${activeTab === 'caja' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:bg-slate-900/40'}`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Caja</span>
          </button>
          <button 
            onClick={() => setActiveTab('mapa')}
            className={`py-2 px-4 rounded-xl text-center text-xs font-bold uppercase tracking-tight flex items-center justify-center space-x-1.5 transition-all md:flex-initial ${activeTab === 'mapa' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:bg-slate-900/40'}`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Mapa Clientes</span>
          </button>
        </div>
      </div>

      {/* Tab Body View (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        {!isAdmin && (
          <div className="max-w-[1700px] mx-auto mb-4 p-3 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-bold uppercase tracking-tight">Modo de Solo Lectura</p>
              <p className="opacity-80">No tienes permisos para modificar datos. Por favor inicia sesión con una cuenta de administrador autorizada.</p>
            </div>
          </div>
        )}
        <div className="max-w-[1700px] mx-auto">

        {/* --- TAB: ACTIVE WAITER CALLS / TIMBRE BOARD --- */}
        {activeTab === 'calls' && (
          <div className="space-y-4">
            
            {/* Real-time buzzer board & Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping mr-2" />
                  Monitoreo de Timbre y Deseos
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Pantalla optimizada en alta densidad para múltiples columnas en PC y Tablets</p>
              </div>

              {/* Calls Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCallsFilter('active')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${callsFilter === 'active' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Activos ({calls.filter(c => c.status !== 'completed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCallsFilter('completed')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${callsFilter === 'completed' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Finalizados ({calls.filter(c => c.status === 'completed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCallsFilter('all')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${callsFilter === 'all' ? 'bg-slate-800 text-slate-200 shadow border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Todos ({calls.length})
                </button>
              </div>
            </div>

            {calls.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2">
                <Bell className="w-8 h-8 text-slate-650 animate-bounce" />
                <p className="text-sm font-bold text-slate-400">Ninguna consulta activa por el momento.</p>
                <p className="text-xs text-slate-500">Las consultas con listas de deseos aparecerán aquí en vivo al instante.</p>
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-850 flex flex-col items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500/80 mb-2 animate-pulse" />
                <p className="text-xs font-bold text-slate-400">¡Yupi! No hay mensajes en este estado.</p>
                <p className="text-[10px] text-slate-500 mt-1">Todas las consultas han sido resueltas de forma impecable.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 items-start">
                {filteredCalls.map((call) => (
                  <div 
                    key={call.id} 
                    className={`p-3 border rounded-xl transition-all relative flex flex-col justify-between shadow-lg ${
                      call.status === 'completed' 
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60' 
                        : call.status === 'attending'
                          ? 'bg-amber-950/15 border-amber-500/30'
                          : 'bg-indigo-950/25 border-indigo-500/40 animate-pulse'
                    }`}
                  >
                    {/* User info Header */}
                    <div className="flex flex-col mb-1.5 pb-1.5 border-b border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="px-2 py-0.5 bg-amber-500 text-black rounded-md text-[10px] font-black tracking-tight uppercase truncate">
                            {call.userName || 'Usuario Anónimo'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            <Clock className="w-2.5 h-2.5 text-slate-500 mr-1" />
                            {new Date(call.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {/* Close or remove call from server */}
                        <button 
                          onClick={() => handleDeleteCallHistory(call.id)}
                          className="p-1 text-slate-550 hover:text-red-400 transition-colors"
                          title="Borrar registro de consulta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-col items-start text-slate-400 mt-0.5 space-y-0.5">
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 flex-shrink-0">📍 Dir:</span>
                          <span className="text-[10px] truncate max-w-[150px]">{call.userAddress || 'No especificada'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 flex-shrink-0">📞 Tel:</span>
                          {call.userPhone ? (
                            <a 
                              href={`https://wa.me/${call.userPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] truncate max-w-[150px] text-indigo-400 hover:text-indigo-300 font-bold underline decoration-indigo-400/30"
                            >
                              {call.userPhone}
                            </a>
                          ) : (
                            <span className="text-[10px] truncate max-w-[150px]">No especificado</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Compact Status selection toggles with background */}
                    <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-850/80 mb-2 gap-0.5">
                      {(['pending', 'attending', 'ready', 'completed'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => isAdmin && handleUpdateCallStatus(call, st)}
                          disabled={!isAdmin}
                          className={`flex-1 py-1 rounded text-[9.5px] font-black transition-all ${
                            call.status === st
                              ? st === 'pending'
                                ? 'bg-red-500 text-white shadow shadow-red-500/20'
                                : st === 'attending'
                                  ? 'bg-amber-500 text-black shadow shadow-amber-500/20'
                                  : st === 'ready'
                                    ? 'bg-blue-500 text-white shadow shadow-blue-500/20'
                                    : 'bg-emerald-500 text-white shadow shadow-emerald-500/20'
                              : 'text-slate-500 hover:text-slate-300'
                          } ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                        >
                          {st === 'pending' ? 'Pend' : st === 'attending' ? 'Cocina' : st === 'ready' ? 'Camino' : 'Hecho'}
                        </button>
                      ))}
                    </div>

                    {/* High Density Wishlist description */}
                    <div className="bg-slate-950/65 border border-slate-900/60 rounded-lg p-2 mb-2 flex-grow flex flex-col min-h-[90px] justify-between">
                      <div>
                        <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                          <span className="flex items-center">
                            <UtensilsCrossed className="w-2.5 h-2.5 text-amber-500 mr-1" />
                            Deseos / Pedido
                          </span>
                          {call.wishlist && call.wishlist.length > 0 && (
                            <span className="text-[8px] bg-amber-500/10 px-1 rounded text-amber-500 font-mono">
                              {call.wishlist.reduce((acc, x) => acc + x.quantity, 0)} u
                            </span>
                          )}
                        </div>
                        
                        {call.wishlist && call.wishlist.length > 0 ? (
                          <div className="space-y-1 max-h-[130px] overflow-y-auto pr-0.5 no-scrollbar text-[11px] leading-tight">
                            {call.wishlist.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between text-slate-200 border-b border-white/5 pb-0.5 last:border-0 last:pb-0">
                                <span className="line-clamp-1 pr-1">
                                  <span className="font-extrabold text-amber-500 mr-0.5">{item.quantity}x</span> {item.productName}
                                  {item.selectedPriceLabel && (
                                    <span className="text-[8.5px] text-slate-500 ml-0.5">({item.selectedPriceLabel})</span>
                                  )}
                                </span>
                                <span className="text-slate-450 font-mono text-[9px] flex-shrink-0">
                                  {formatCurrency(item.selectedPriceValue * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic py-1 flex items-center space-x-1">
                            <span>🔔 Consulta general / Pregunta</span>
                          </div>
                        )}
                      </div>

                      {/* Compact Total suggested label if wishlist is active */}
                      {call.wishlist && call.wishlist.length > 0 && (
                        <div className="pt-1.5 mt-1 text-[10px] font-black text-amber-400 border-t border-dashed border-slate-800 flex items-center justify-between">
                          <span className="tracking-tight">Suma Sugerida:</span>
                          <span className="font-mono text-[10.5px]">
                            {formatCurrency(call.wishlist.reduce((acc, x) => acc + (x.selectedPriceValue * x.quantity), 0))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Side by side inputs (mozo and notes) to preserve compact layout */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-900/40">
                      <div>
                        <span className="block text-[8px] uppercase text-slate-500 font-bold mb-0.5">Nombre Delivery</span>
                        <input 
                          type="text"
                          placeholder="Repartidor"
                          defaultValue={call.waiterName || ''}
                          onBlur={(e) => handleSaveNotesAndWaiter(call, call.notes || '', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-[10px] text-slate-250 placeholder-slate-700/80 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase text-slate-500 font-bold mb-0.5">Chat/Respuesta</span>
                        <input 
                          type="text"
                          placeholder="Escribir respuesta..."
                          defaultValue={call.notes || ''}
                          onBlur={(e) => handleSaveNotesAndWaiter(call, e.target.value, call.waiterName || '')}
                          className="w-full bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-[10px] text-slate-250 placeholder-slate-700/80 focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* General WhatsApp config section */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2 text-indigo-400">
                <PhoneCall className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Enlace de Reservas WhatsApp</h4>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Nombre Restaurante</label>
                  <input 
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Teléfono WhatsApp</label>
                    <input 
                      type="text"
                      placeholder="+54911223344"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">PIN de Bloqueo (5 dígitos)</label>
                    <input 
                      type="text"
                      placeholder="99999"
                      maxLength={5}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white select-all text-center"
                    />
                  </div>
                </div>

                {/* Restaurant Status (Open/Closed) */}
                <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-tight text-white flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      Estado del Local: {isOpen ? 'Abierto' : 'Cerrado'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">Define si los clientes pueden realizar pedidos</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isOpen ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <button 
                  onClick={handleSaveGeneralConfig}
                  disabled={!isAdmin}
                  className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Datos del Restaurante</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB: MANAGE LEAVES (HOJAS) --- */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Hojas de Menú / Categorías</span>
              <span className="text-[9px] text-amber-500 normal-case font-normal">Soporta ordenar pestañas arriba</span>
            </h3>

            {/* Add or Edit category Form */}
            <form onSubmit={handleSaveCategoryForm} className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
              <h4 className="text-xs font-bold text-amber-400 flex items-center">
                {editingCatId ? <Edit3 className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                <span>{editingCatId ? 'Editar Hoja' : 'Crear Nueva Hoja de Menú'}</span>
              </h4>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Nombre de la Hoja</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. Entradas, Bebidas..."
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Estilo Visual</label>
                    <select 
                      value={catBgStyle}
                      onChange={(e: any) => setCatBgStyle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="luxury">Restorán de Lujo</option>
                      <option value="fastfood">Comida Rápida</option>
                      <option value="cafe">Desayunos/Vibe Cozy</option>
                      <option value="neonbar">Bebidas y Tragos</option>
                      <option value="dessert">Postres Dulces</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Orden del Botón</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      value={catOrder}
                      onChange={(e) => setCatOrder(Number(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-center focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  {editingCatId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingCatId(null);
                        setCatName('');
                      }} 
                      className="px-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={!isAdmin}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{editingCatId ? 'Actualizar Hoja' : 'Agregar Hoja'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of categories */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Hojas Registradas</h4>
              {categories.map((cat) => (
                <div key={cat.id} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-amber-400 rounded-md font-mono">
                        #{cat.order}
                      </span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="text-[9px] text-slate-400 block capitalize mt-0.5">
                      Estilo: {cat.backgroundStyle === 'luxury' ? 'Lujo/Gourmet' : cat.backgroundStyle === 'fastfood' ? 'Rápida' : cat.backgroundStyle === 'cafe' ? 'Café' : cat.backgroundStyle === 'neonbar' ? 'Bebidas' : 'Postres'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditCat(cat)}
                      className="p-1.5 bg-slate-900/80 border border-slate-800 hover:text-white rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCat(cat.id)}
                      className="p-1.5 bg-slate-900/80 border border-slate-800 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* --- TAB: MANAGE PRODUCTS (PRODUCTOS) --- */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Menú PRODUCTOS & Precios</span>
              <span className="text-[9px] text-indigo-500 normal-case font-normal">Permite múltiples precios</span>
            </h3>

            {/* Add or edit product Form */}
            <form onSubmit={handleSaveProductForm} className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
              <h4 className="text-xs font-bold text-amber-400 flex items-center">
                {editingProdId ? <Edit3 className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                <span>{editingProdId ? 'Editar Producto del Menú' : 'Cargar Nuevo Producto'}</span>
              </h4>

              <div className="space-y-3">
                {/* Categoría select */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Hoja asignada de menú</label>
                  {categories.length === 0 ? (
                    <div className="text-[10px] text-amber-400 flex items-center p-2 bg-amber-500/10 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1flex-shrink-0" />
                      Debes crear al menos una Hoja de menú antes de poder agregar platos.
                    </div>
                  ) : (
                    <select 
                      value={prodCategoryId}
                      onChange={(e) => setProdCategoryId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Nombre del Producto</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. Hamburguesa Doble, Gin Tonic..."
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Descripción o Ingredientes</label>
                  <textarea 
                    rows={2}
                    placeholder="Escribe la descripción, alérgenos o detalles del plato"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Multi-Price Inputs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] text-slate-400 font-bold">Listas de Precios / Variaciones</label>
                    <button 
                      type="button" 
                      onClick={handleAddPriceField}
                      className="text-[9px] bg-slate-850 border border-slate-800 text-amber-400 hover:bg-slate-800 px-2 py-1 rounded-lg font-bold flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Agregar Precio</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {priceInputs.map((pr, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input 
                          type="text"
                          placeholder="Etiqueta: Completa/Media/Doble..."
                          value={pr.label}
                          onChange={(e) => handlePriceInputChange(idx, 'label', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
                        />
                        <input 
                          type="number"
                          placeholder="Valor $"
                          value={pr.value === 0 ? '' : pr.value}
                          onChange={(e) => handlePriceInputChange(idx, 'value', e.target.value)}
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white text-center focus:outline-none"
                        />
                        <button 
                          type="button"
                          onClick={() => handleRemovePriceField(idx)}
                          className="p-1 px-2 text-red-400 hover:text-red-500 rounded-md bg-red-950/10 hover:bg-red-950/20"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo Upload (suitable for Firebase base64) */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Foto del Plato</label>
                  <div className="flex items-center space-x-3.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center text-slate-500 flex-shrink-0">
                      {prodPhoto ? (
                        <img src={prodPhoto} alt="Product preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="hidden"
                        id="prod-photo-upload"
                      />
                      <label 
                        htmlFor="prod-photo-upload"
                        className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-white font-bold rounded-lg transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Subir y Comprimir</span>
                      </label>
                      <p className="text-[8px] text-slate-400 mt-1">Se comprime en el acto para almacenamiento ultraligero.</p>
                    </div>
                  </div>
                </div>

                {/* Active/Suspended State */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-xs font-bold text-white block">Poner plato en suspenso</span>
                    <span className="text-[9px] text-slate-400 leading-none">Útil si se queda temporalmente sin stock.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={prodIsSuspended}
                    onChange={(e) => setProdIsSuspended(e.target.checked)}
                    className="w-4 h-4 text-amber-500 accent-amber-500 rounded focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-2.5 pt-2">
                  {editingProdId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingProdId(null);
                        setProdName('');
                        setProdDesc('');
                        setProdPhoto('');
                        setPriceInputs([{ label: 'Generol', value: 0 }]);
                        setProdIsSuspended(false);
                      }} 
                      className="px-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-white"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={!isAdmin}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingProdId ? 'Actualizar Producto' : 'Cargar en Menú'}</span>
                  </button>
                </div>

              </div>
            </form>

            {/* List of Products (By Category) */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Carta Completa</h4>
              {categories.map((cat) => {
                const catProducts = products.filter(p => p.categoryId === cat.id);
                if (catProducts.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-1.5 p-3 bg-slate-950/20 border border-slate-850 rounded-xl">
                    <span className="text-[10px] font-extrabold text-[#f59e0b] uppercase tracking-wider block mb-1">
                      {cat.name}
                    </span>
                    <div className="space-y-1.5">
                      {catProducts.map((prod) => (
                        <div 
                          key={prod.id} 
                          className={`p-2.5 rounded-lg border flex items-center justify-between ${prod.isSuspended ? 'bg-slate-950/30 border-slate-900/60 opacity-60' : 'bg-slate-950/60 border-slate-850'}`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {prod.photo ? (
                              <img src={prod.photo} alt={prod.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">
                                🥣
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{prod.name}</p>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                {prod.prices.map((p, i) => (
                                  <span key={i} className="text-[9px] bg-slate-900 px-1 py-0.5 text-slate-400 rounded">
                                    {p.label}: {formatCurrency(p.value)}
                                  </span>
                                ))}
                                {prod.isSuspended && (
                                  <span className="text-[8px] bg-red-950/40 text-red-400 px-1 py-0.5 rounded border border-red-900/40">
                                    En Suspenso
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1.5 flex-shrink-0">
                            <button 
                              onClick={() => handleEditProduct(prod)}
                              className="p-1 px-1.5 bg-slate-900 hover:text-white rounded-md transition-colors border border-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1 px-1.5 bg-slate-900 hover:text-red-400 rounded-md transition-colors border border-slate-800"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* --- TAB: CHEF SUGGESTION --- */}
        {activeTab === 'chef' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Sugerencia del Chef / Menú del Día</span>
            </h3>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
              <div className="space-y-3">
                {/* Active switch */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Mostrar Sugerencia</span>
                    <span className="text-[9px] text-slate-400">Aparece cuando tocan el logo/nombre del restaurante.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={chefActive}
                    onChange={(e) => setChefActive(e.target.checked)}
                    className="w-4 h-4 text-amber-500 accent-amber-500 rounded focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Nombre del Plato Recomendado</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. Ojo de Bife Flameado con Cognac..."
                    value={chefName}
                    onChange={(e) => setChefName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Descripción Gourmet</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe los ingredientes, la cocción premium y los acompañamientos..."
                    value={chefDesc}
                    onChange={(e) => setChefDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Precio Único ($)</label>
                  <input 
                    type="number"
                    placeholder="24500"
                    value={chefPrice || ''}
                    onChange={(e) => setChefPrice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Foto de la Sugerencia</label>
                  <div className="flex items-center space-x-3.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center text-slate-500 flex-shrink-0">
                      {chefPhoto ? (
                        <img src={chefPhoto} alt="Product preview" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleChefImageUpload}
                        className="hidden"
                        id="chef-photo-upload"
                      />
                      <label 
                        htmlFor="chef-photo-upload"
                        className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-white font-bold rounded-lg transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Subir y Comprimir</span>
                      </label>
                      <p className="text-[8px] text-slate-400 mt-1">Imágenes de alta calidad son comprimidas automáticamente.</p>
                    </div>
                  </div>
                </div>

                {/* Save core */}
                <button 
                  onClick={handleSaveChefSuggestion}
                  disabled={!isAdmin}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Guardar Sugerencia</span>
                </button>

              </div>
            </div>
          </div>
        )}

        {/* --- TAB: FINANCE / CAJA --- */}
        {activeTab === 'caja' && (
          <AdminFinance calls={calls} />
        )}

        {/* --- TAB: CLIENT VISUALIZATION MAP --- */}
        {activeTab === 'mapa' && (
          <AdminClientMap calls={calls} />
        )}

        </div>
      </div>
    </div>
  );
}
