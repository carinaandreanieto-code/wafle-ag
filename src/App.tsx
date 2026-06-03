import React, { useState, useEffect, useTransition } from 'react';
import { 
  fetchCategories, 
  fetchProducts, 
  getRestaurantConfig, 
  saveCall, 
  subscribeCategories, 
  subscribeProducts, 
  subscribeAuth,
  subscribeCalls,
  isAdminUser,
  loginWithGoogle,
  logout
} from './firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { Category, Product, RestaurantConfig, WishlistItem, TableCall } from './types';
import PhoneContainer from './components/PhoneContainer';
import ThemeBackground from './components/ThemeBackground';
import PasscodeScreen from './components/PasscodeScreen';
import AdminPanel from './components/AdminPanel';
import DeliveryPanel from './components/DeliveryPanel';
import { formatCurrency } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Heart, 
  Sparkles, 
  Lock, 
  Smile, 
  ChevronRight, 
  X, 
  Info, 
  Trash2, 
  Plus, 
  Minus, 
  CalendarDays, 
  Check, 
  Wifi, 
  ShoppingBag, 
  AlertCircle,
  User,
  Truck,
  MessageCircle,
  Loader2
} from 'lucide-react';

export default function App() {
  const [isPending, startTransition] = useTransition();

  // Core data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<RestaurantConfig | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return subscribeAuth(async (u) => {
      setUser(u);
      if (u) {
        const adminStatus = await isAdminUser(u.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  // Fetch / Sync core documents
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('restaurant_user_name') || '';
  });
  const [userAddress, setUserAddress] = useState<string>(() => {
    return localStorage.getItem('restaurant_user_address') || '';
  });
  const [userPhone, setUserPhone] = useState<string>(() => {
    return localStorage.getItem('restaurant_user_phone') || '549';
  });
  
  // Wishlist (lista de deseos) states
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('restaurant_wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [wishlistPrices, setWishlistPrices] = useState<{ [productId: string]: string }>({});

  // Active Buzzer Status feedback for client
  const [buzzAnimationActive, setBuzzAnimationActive] = useState(false);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [showBuzzSuccessModal, setShowBuzzSuccessModal] = useState(false);
  const [activeCall, setActiveCall] = useState<TableCall | null>(null);

  // Subscribe to user's specific calls to see responses (Chat Interno)
  useEffect(() => {
    if (!userName.trim() || !userAddress.trim() || !userPhone.trim()) return;
    
    // Simple filter: calls from this user/address combo that are not completed
    const unsub = subscribeCalls((allCalls) => {
      const cleanName = userName.trim().toLowerCase();
      const cleanAddress = userAddress.trim().toLowerCase();
      const cleanPhone = userPhone.replace(/\D/g, '');

      const userCalls = allCalls.filter(c => {
        const cPhone = (c.userPhone || '').replace(/\D/g, '');
        // Robust phone match: either exactly the same, or one ends with the other's last 8 digits
        const phoneMatch = cPhone === cleanPhone || 
          (cPhone.length >= 8 && cleanPhone.endsWith(cPhone.slice(-8))) ||
          (cleanPhone.length >= 8 && cPhone.endsWith(cleanPhone.slice(-8)));
        
        return (
          c.userName.trim().toLowerCase() === cleanName && 
          c.userAddress.trim().toLowerCase() === cleanAddress && 
          phoneMatch &&
          c.status !== 'completed'
        );
      });

      if (userCalls.length > 0) {
        setActiveCall(userCalls[0]); // Most recent active call
      } else {
        setActiveCall(null);
      }
    });
    return () => unsub();
  }, [userName, userAddress, userPhone]);

  // Modals / Overlays open states
  const [isPasscodeOpened, setIsPasscodeOpened] = useState(false);
  const [isAdminOpened, setIsAdminOpened] = useState(false);
  const [isDeliveryPasscodeOpened, setIsDeliveryPasscodeOpened] = useState(false);
  const [isDeliveryOpened, setIsDeliveryOpened] = useState(false);
  const [isWishlistOpened, setIsWishlistOpened] = useState(false);
  const [isChefSuggestionOpened, setIsChefSuggestionOpened] = useState(false);
  const [selectedProductForPopup, setSelectedProductForPopup] = useState<Product | null>(null);

  // Fetch / Sync core documents
  const loadData = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
      if (cats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(cats[0].id);
      }
      const prods = await fetchProducts();
      setProducts(prods);
      const conf = await getRestaurantConfig();
      setConfig(conf);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time changes
    const unsubCats = subscribeCategories((loadedCats) => {
      setCategories(loadedCats);
      if (loadedCats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(loadedCats[0].id);
      }
    });

    const unsubProds = subscribeProducts((loadedProds) => {
      setProducts(loadedProds);
    });

    return () => {
      unsubCats();
      unsubProds();
    };
  }, []);

  // Save user info changes
  useEffect(() => {
    localStorage.setItem('restaurant_user_name', userName);
    localStorage.setItem('restaurant_user_address', userAddress);
    localStorage.setItem('restaurant_user_phone', userPhone);
  }, [userName, userAddress, userPhone]);

  // Save wishlist changes
  useEffect(() => {
    localStorage.setItem('restaurant_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Find active category
  const activeCategory = categories.find(c => c.id === selectedCategoryId);
  const activeProducts = products.filter(p => p.categoryId === selectedCategoryId);

  // Trigger buzzer "Preguntar"
  const handleCallWaiter = async () => {
    if (buzzAnimationActive) return;

    if (!userName.trim() || !userAddress.trim() || !userPhone.trim()) {
      alert("Por favor, ingresa tu Nombre, Dirección y Teléfono para que podamos responderte.");
      return;
    }

    if (!config) {
      alert("Configuración no cargada.");
      return;
    }

    setBuzzAnimationActive(true);
    setIsFetchingGPS(true);
    
    // Normalize phone number to ensure it starts with 549
    const cleanDigits = userPhone.replace(/\D/g, '');
    let finalPhone = cleanDigits;
    if (!cleanDigits.startsWith('549')) {
      if (cleanDigits.startsWith('54')) {
        finalPhone = '549' + cleanDigits.slice(2);
      } else {
        finalPhone = '549' + cleanDigits;
      }
    }

    // Capture GPS coordinates
    let coords: { latitude: number; longitude: number } | null = null;
    if (navigator.geolocation) {
      try {
        coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (err) => {
              console.warn("Could not capture GPS:", err.message);
              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 6000,
              maximumAge: 0
            }
          );
        });
      } catch (e) {
        console.warn("Geolocation API call threw an error:", e);
      }
    }
    setIsFetchingGPS(false);

    try {
      if (activeCall) {
        // Update existing call with current wishlist (merging items)
        const mergedWishlist = [...activeCall.wishlist];
        wishlist.forEach(newItem => {
          const existing = mergedWishlist.find(m => m.productId === newItem.productId && m.selectedPriceLabel === newItem.selectedPriceLabel);
          if (existing) {
            existing.quantity += newItem.quantity;
          } else {
            mergedWishlist.push(newItem);
          }
        });

        const updatedCall: TableCall = {
          ...activeCall,
          userPhone: finalPhone, // Ensure updated phone too
          wishlist: mergedWishlist,
          timestamp: new Date().toISOString(),
          latitude: coords?.latitude ?? activeCall.latitude,
          longitude: coords?.longitude ?? activeCall.longitude
        };
        await saveCall(updatedCall);
      } else {
        // Create new question/call notification for history/admin panel
        const newCall: TableCall = {
          id: 'call_' + Date.now(),
          userName: userName.trim(),
          userAddress: userAddress.trim(),
          userPhone: finalPhone,
          timestamp: new Date().toISOString(),
          wishlist: wishlist,
          status: 'pending',
          latitude: coords?.latitude ?? undefined,
          longitude: coords?.longitude ?? undefined
        };
        await saveCall(newCall);
      }
      
      setBuzzAnimationActive(false);
      setShowBuzzSuccessModal(true);
      setWishlist([]); // Clear local wishlist after sending
    } catch (err) {
      setBuzzAnimationActive(false);
      alert("Hubo un error al registrar el pedido.");
    }
  };

  // Wishlist modifiers
  const handleAddToWishlist = (product: Product) => {
    const selectedPriceLabel = wishlistPrices[product.id] || product.prices[0]?.label || 'General';
    const selectedPriceObj = product.prices.find(p => p.label === selectedPriceLabel) || product.prices[0];
    const priceVal = selectedPriceObj ? selectedPriceObj.value : 0;

    const existingIndex = wishlist.findIndex(
      item => item.productId === product.id && item.selectedPriceLabel === selectedPriceLabel
    );

    if (existingIndex >= 0) {
      const next = [...wishlist];
      next[existingIndex].quantity += 1;
      setWishlist(next);
    } else {
      const newItem: WishlistItem = {
        productId: product.id,
        productName: product.name,
        selectedPriceLabel,
        selectedPriceValue: priceVal,
        quantity: 1
      };
      setWishlist([...wishlist, newItem]);
    }

    // Gentle flash trigger in tab
    const el = document.getElementById('wishlist-tab-btn');
    if (el) {
      el.classList.add('scale-110');
      setTimeout(() => el.classList.remove('scale-110'), 200);
    }
  };

  const updateWishlistQty = (index: number, delta: number) => {
    const next = [...wishlist];
    next[index].quantity += delta;
    if (next[index].quantity <= 0) {
      next.splice(index, 1);
    }
    setWishlist(next);
  };

  const handleClearWishlist = () => {
    setWishlist([]);
  };


  const handleLeafSelect = (catId: string) => {
    startTransition(() => {
      setSelectedCategoryId(catId);
    });
  };

  return (
    <>
      <PhoneContainer>
      
      {/* Dynamic Themed Content Container */}
      <ThemeBackground styleName={activeCategory?.backgroundStyle || 'luxury'}>
        {/* TOP COMPONENT: Logo status, Table selector & Ring buzzer bell */}
        <div className="flex flex-col bg-black/60 backdrop-blur-md px-4 py-3 sticky top-0 z-30 border-b border-white/5">
          
          {/* Top row: Restaurant Name with reservation action */}
          <div className="flex items-center justify-between">

            {/* Restaurant Logo Header (Clicking trigger Chef Suggestion menu popup!) */}
            <div 
              onClick={() => {
                if (config?.chefSuggestion?.active) {
                  setIsChefSuggestionOpened(true);
                } else {
                  alert("¡Bienvenido! El Chef aún no ha subido sugerencias para hoy.");
                }
              }}
              className="flex items-center space-x-3 cursor-pointer max-w-[70%] select-none active:scale-98 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/40 cursor-pointer group-hover:scale-105 transition-transform flex-shrink-0">
                <span className="font-serif italic font-bold text-lg text-white">
                  {(config?.restaurantName || 'L').trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="font-serif text-2xl font-black text-white tracking-tight truncate">
                  {(config?.restaurantName || 'Lumina Resto').toUpperCase()}
                </h1>
              </div>
            </div>

            {/* Status Button */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight shadow-sm border ${
                config?.isOpen !== false 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              }`}>
                {config?.isOpen !== false ? 'Abierto' : 'Cerrado'}
              </div>
            </div>
          </div>
        </div>

        {/* User Information & Action Panel (Now in normal document flow - scrolls up!) */}
        <div className="px-4 pt-3.5 pb-1 space-y-3">
          
          {/* Bottom row: User information & Preguntar action */}
          <div className="flex flex-col bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 space-y-3">
            <div className="flex flex-col space-y-2">
              <div className="flex flex-col items-start px-2">
                <span className="text-[9px] uppercase text-white/40 font-bold tracking-wider">Tu Nombre</span>
                <input 
                  type="text"
                  placeholder="Escribe tu nombre..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="bg-transparent text-sm font-bold w-full outline-none border-b border-amber-500/30 text-white focus:border-amber-400 transition-colors p-1"
                />
              </div>
              <div className="flex flex-col items-start px-2">
                <span className="text-[9px] uppercase text-white/40 font-bold tracking-wider">Tu Dirección</span>
                <input 
                  type="text"
                  placeholder="Escribe tu dirección..."
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  className="bg-transparent text-sm font-bold w-full outline-none border-b border-amber-500/30 text-white focus:border-amber-400 transition-colors p-1"
                />
              </div>
              <div className="flex flex-col items-start px-2">
                <span className="text-[9px] uppercase text-white/40 font-bold tracking-wider">Tu Teléfono (WhatsApp - Formato 549...)</span>
                <input 
                  type="tel"
                  placeholder="549 + número (ej: 5491122334455)"
                  value={userPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow deleting but keep 549 as a baseline or just digits
                    if (val.length < 3) {
                      setUserPhone('549');
                    } else if (val.startsWith('549')) {
                      setUserPhone(val);
                    } else {
                      setUserPhone('549' + val.replace(/\D/g, ''));
                    }
                  }}
                  className="bg-transparent text-sm font-bold w-full outline-none border-b border-amber-500/30 text-white focus:border-amber-400 transition-colors p-1"
                />
              </div>
            </div>
            
            {config?.isOpen === false ? (
              <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 flex items-center space-x-2 text-rose-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">
                  Local Cerrado por el momento. No se aceptan pedidos, pero puedes ver nuestra carta de precios.
                </p>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => {
                    if (!config?.whatsappNumber) return;
                    const phone = config.whatsappNumber.replace(/\D/g, '');
                    const msg = encodeURIComponent(`¡Hola! Quisiera realizar una consulta.`);
                    window.open(`https://wa.me/${phone}/?text=${msg}`, '_blank');
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="w-4 h-4 fill-black/20" />
                  <span className="text-[11px] uppercase font-black tracking-wider">WhatsApp</span>
                </button>
                
                <button 
                  onClick={() => setIsWishlistOpened(true)}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg border ${
                    wishlist.length > 0 
                      ? 'bg-rose-500 border-rose-400 text-white shadow-rose-500/20' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="relative">
                    <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-white' : ''}`} />
                    {wishlist.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-white text-rose-500 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-rose-500">
                        {wishlist.reduce((acc, x) => acc + x.quantity, 0)}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] uppercase font-black tracking-wider">MIS PEDIDOS</span>
                </button>
              </div>
            )}

            {/* Active Chat/Response section */}
            {activeCall && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`p-3 rounded-2xl border flex flex-col space-y-3 shadow-xl ${
                  activeCall.notes ? 'bg-indigo-950/40 border-indigo-500/30' : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center mb-0.5">
                      <Wifi className="w-2.5 h-2.5 mr-1.5 animate-pulse text-indigo-500" />
                      Estado del Pedido
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`block w-2 h-2 rounded-full animate-pulse ${
                        activeCall.status === 'pending' ? 'bg-amber-500' : 
                        activeCall.status === 'attending' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-xs font-black text-white uppercase tracking-tight">
                        {activeCall.status === 'pending' ? 'Pedido Recibido' : 
                         activeCall.status === 'attending' ? 'Preparando en Cocina' : 
                         activeCall.status === 'ready' ? '¡Pedido en Camino!' : 'Finalizado'}
                      </span>
                    </div>
                  </div>
                  
                  {(activeCall.status === 'attending' || activeCall.status === 'pending') && (
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <ShoppingBag className={`w-4 h-4 text-emerald-500 ${activeCall.status === 'attending' ? 'animate-bounce' : ''}`} />
                    </div>
                  )}
                  {activeCall.status === 'ready' && (
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <Check className="w-4 h-4 text-blue-500 animate-in zoom-in" />
                    </div>
                  )}
                </div>

                {activeCall.notes && activeCall.notes.trim() !== "" && (
                  <div className="flex flex-col space-y-1.5">
                    <span className="text-[8px] uppercase font-black text-indigo-400/70 tracking-widest ml-1">Mensaje del Local</span>
                    <div className="bg-indigo-500/20 backdrop-blur-md p-3 rounded-2xl rounded-tl-none border border-indigo-500/30 relative shadow-inner">
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-indigo-500/30 rotate-45" />
                      <p className="text-[11px] text-indigo-100 font-medium leading-relaxed italic">
                        "{activeCall.notes}"
                      </p>
                    </div>
                  </div>
                )}

                {!activeCall.notes && activeCall.status === 'pending' && (
                  <div className="px-1 space-y-2">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "35%" }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                        className="h-full bg-amber-500 rounded-full"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 italic">Enviado. Aguarda nuestra confirmación...</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

        </div>

        {/* SHEETS TABS NAVIGATION: categories at top and wishlist button (Optimized to fit at least 4 leaves easily) */}
        <div className="bg-black/60 backdrop-blur-md px-2.5 py-2 z-20 sticky top-[64px] border-b border-white/5 flex items-center gap-1 select-none overflow-x-auto no-scrollbar">
          
          {/* Categories Horizontal loop sheets */}
          {categories.length === 0 ? (
            <span className="text-[10px] text-slate-500 p-2 italic animate-pulse">Armando el menú...</span>
          ) : (
            categories.map((cat) => (
              <button 
                key={cat.id}
                onClick={() => handleLeafSelect(cat.id)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-full whitespace-nowrap transition-all duration-300 flex-shrink-0 relative ${
                  selectedCategoryId === cat.id 
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25 scale-102 z-10' 
                    : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))
          )}
        </div>

        {/* MAIN BODY: Menu list inside the dynamic themed background */}
        <div className="flex-1 py-4 px-4 pb-24">
          
          {/* Transition wrapper for leaf turning or flipping page animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategoryId}
              initial={{ rotateY: 30, opacity: 0, transformOrigin: "left center" }}
              animate={{ rotateY: 0, opacity: 1, transformOrigin: "left center" }}
              exit={{ rotateY: -30, opacity: 0, transformOrigin: "right center" }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-3"
            >
              
              {/* If empty state */}
              {activeProducts.length === 0 && (
                <div className="py-12 text-center bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 flex flex-col items-center justify-center space-y-2">
                  <Smile className="w-8 h-8 text-amber-500 animate-pulse" />
                  <p className="text-sm font-serif font-bold italic text-slate-300">¡Próximamente!</p>
                  <p className="text-[10px] text-slate-400">Estamos cocinando exquisiteces para esta hoja del menú.</p>
                </div>
              )}

              {/* Loop Category Leaf products */}
              {activeProducts.map((prod) => (
                <div 
                  key={prod.id}
                  className={`p-3.5 rounded-2xl border backdrop-blur-md transition-all relative flex flex-col justify-between overflow-hidden shadow-sm group ${
                    prod.isSuspended 
                      ? 'bg-black/40 border-slate-900/40 opacity-50' 
                      : activeCategory?.backgroundStyle === 'luxury' 
                        ? 'bg-white/5 border-white/10 text-white hover:bg-white/8' 
                        : activeCategory?.backgroundStyle === 'fastfood' 
                          ? 'bg-white/5 border-red-500/10 text-white' 
                          : activeCategory?.backgroundStyle === 'cafe'
                            ? 'bg-white/85 border-orange-200/50 shadow-sm text-amber-950'
                            : activeCategory?.backgroundStyle === 'neonbar'
                              ? 'bg-white/5 border-indigo-500/15 text-white'
                              : 'bg-white/90 border-rose-200/50 text-rose-950'
                  }`}
                >
                  
                  {/* Item Content Top */}
                  <div className="flex gap-4">
                    
                    {/* Responsive Thumbnail matching design layout */}
                    <div 
                      onClick={() => setSelectedProductForPopup(prod)}
                      className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 cursor-pointer border border-white/10 active:scale-95 transition-all relative group"
                    >
                      {prod.photo ? (
                        <img src={prod.photo} alt={prod.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl bg-slate-900/60">
                          🍽️
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <span className="text-[8px] uppercase text-white font-black tracking-widest font-sans">Ver</span>
                      </div>
                    </div>

                    {/* Meta info info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-bold tracking-tight leading-tight uppercase">
                          {prod.name}
                        </h4>
                        
                        {/* Info details toggle button */}
                        <button 
                          onClick={() => setSelectedProductForPopup(prod)}
                          className="p-1 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className={`text-[10px] mt-1 line-clamp-2 leading-relaxed opacity-60 italic`}>
                        {prod.description}
                      </p>
                    </div>

                  </div>

                  {/* Pricing variation selector and Add-to-wishlist button */}
                  <div className="mt-3.5 pt-3.5 border-t border-dashed border-white/10 flex items-center justify-between gap-2">
                    
                    {/* Price selector */}
                    <div className="flex-1 flex flex-wrap gap-1">
                      {prod.prices.map((pr, idx) => {
                        const isSelected = (wishlistPrices[prod.id] || prod.prices[0]?.label) === pr.label;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (prod.isSuspended) return;
                              setWishlistPrices({ ...wishlistPrices, [prod.id]: pr.label });
                            }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-black font-extrabold shadow-md'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                            disabled={prod.isSuspended}
                          >
                            {pr.label}: {formatCurrency(pr.value)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add desire button */}
                    {prod.isSuspended ? (
                      <span className="text-[9px] bg-red-950/40 text-red-400 px-2.5 py-1 rounded border border-red-900/30 font-semibold uppercase tracking-wider">
                        Agotado
                      </span>
                    ) : config?.isOpen === false ? (
                      <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600 opacity-50 cursor-not-allowed">
                        <span className="text-[9px] font-black uppercase tracking-tight">Cerrado</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleAddToWishlist(prod)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-[9px] font-black uppercase tracking-tight active:scale-95 transition-all shadow-md shadow-rose-500/10 flex items-center space-x-1.5"
                      >
                        <Heart className="w-3 h-3 fill-current" />
                        <span>AGREGAR AL PEDIDO</span>
                      </button>
                    )}

                  </div>

                </div>
              ))}

              {/* Chef suggestion promo card placed below product lists */}
              {config?.chefSuggestion?.active && (
                <div 
                  onClick={() => setIsChefSuggestionOpened(true)}
                  className="relative rounded-3xl overflow-hidden aspect-[4/3] group cursor-pointer border border-white/10 shadow-lg tracking-tight hover:border-amber-500/30 transition-all duration-300 mt-4"
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-102" 
                    style={{ backgroundImage: `url('${config.chefSuggestion.photo || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400'}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                  
                  <div className="absolute top-3 left-3 bg-amber-500/90 text-black text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-md">
                    <Sparkles className="w-2.5 h-2.5 animate-spin-slow" />
                    <span>SUGERENCIA</span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex justify-between items-end">
                      <div className="pr-2">
                        <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest">Recomendación Especial</span>
                        <h3 className="text-lg font-serif font-black italic mt-0.5 leading-tight text-white">
                          {config.chefSuggestion.name}
                        </h3>
                        <p className="text-[10px] text-white/70 line-clamp-1 mt-0.5 font-light">
                          {config.chefSuggestion.description}
                        </p>
                      </div>
                      <div className="text-sm font-extrabold text-amber-400 whitespace-nowrap bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
                        {formatCurrency(config.chefSuggestion.price)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Elegant/subtle icon button at the bottom of the menu for Back-Office Access */}
          <div className="flex justify-center items-center space-x-4 pt-12 pb-6">
            <button 
              onClick={() => setIsPasscodeOpened(true)}
              className="p-3.5 rounded-full bg-white/5 border border-white/10 text-white/45 hover:text-white hover:bg-white/10 active:scale-92 hover:scale-105 transition-all shadow-md focus:outline-none"
              title="Panel de Gestión"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsDeliveryPasscodeOpened(true)}
              className="p-3.5 rounded-full bg-white/5 border border-white/10 text-white/45 hover:text-white hover:bg-white/10 active:scale-92 hover:scale-105 transition-all shadow-md focus:outline-none"
              title="Panel Delivery"
            >
              <Truck className="w-4 h-4" />
            </button>
          </div>

        </div>

      </ThemeBackground>

      {/* --- OVERLAYS & MODALS SECTION --- */}

      {/* 1. PRODUCT DETAIL POPUP WINDOW (Full photo and details on click, tapped dismisses!) */}
      <AnimatePresence>
        {selectedProductForPopup && (
          <div 
            className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 select-text"
            onClick={() => setSelectedProductForPopup(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl static relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Product Large Image */}
              <div className="w-full h-56 bg-slate-950 relative overflow-hidden">
                {selectedProductForPopup.photo ? (
                  <img src={selectedProductForPopup.photo} alt={selectedProductForPopup.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-950">
                    🍲
                  </div>
                )}
                {/* Dismiss X button */}
                <button 
                  onClick={() => setSelectedProductForPopup(null)}
                  className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text metadata */}
              <div className="p-5 space-y-3 text-slate-200">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {categories.find(c => c.id === selectedProductForPopup.categoryId)?.name || 'Carta'}
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">{selectedProductForPopup.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedProductForPopup.description}</p>
                
                {/* Product Prices loop */}
                <div className="pt-3 border-t border-slate-800 space-y-1.5">
                  <span className="block text-[10px] text-slate-500 uppercase font-black uppercase tracking-wider">Precios de Porciones</span>
                  <div className="space-y-1">
                    {selectedProductForPopup.prices.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-xs text-white">
                        <span className="font-semibold text-slate-400">{p.label}</span>
                        <span className="font-extrabold text-amber-400">{formatCurrency(p.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (config?.isOpen === false) {
                      alert("Lo sentimos, no se pueden agregar deseos porque el local está cerrado.");
                      return;
                    }
                    handleAddToWishlist(selectedProductForPopup);
                    setSelectedProductForPopup(null);
                  }}
                  disabled={config?.isOpen === false}
                  className={`w-full mt-4 py-2.5 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-lg active:scale-95 transition-all ${
                    config?.isOpen === false ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${config?.isOpen === false ? 'fill-slate-600' : 'fill-white'}`} />
                  <span>{config?.isOpen === false ? 'Local Cerrado' : 'AGREGAR AL PEDIDO'}</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. CHEF SUGGESTION POPUP PANEL (opens on clicking logo header) */}
      <AnimatePresence>
        {isChefSuggestionOpened && config?.chefSuggestion?.active && (
          <div 
            className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 select-text"
            onClick={() => setIsChefSuggestionOpened(false)}
          >
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/25 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Badge */}
              <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-full flex items-center space-x-1 shadow-xl">
                <Sparkles className="w-3 h-3 fill-black animate-spin" />
                <span>RECOMENDACIÓN DE HOY</span>
              </div>

              {/* Suggestions Large Image */}
              <div className="w-full h-56 bg-slate-950 relative overflow-hidden">
                {config.chefSuggestion.photo ? (
                  <img src={config.chefSuggestion.photo} alt={config.chefSuggestion.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-950">
                    👨‍🍳
                  </div>
                )}
                {/* Dismiss X button */}
                <button 
                  onClick={() => setIsChefSuggestionOpened(false)}
                  className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all border border-white/10 z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions description metadata */}
              <div className="p-5 space-y-3.5 text-slate-200">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{config.chefSuggestion.name}</h3>
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-xl">
                    {formatCurrency(config.chefSuggestion.price)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{config.chefSuggestion.description}</p>
                
                <div className="pt-2">
                  <button 
                    onClick={() => {
                      if (config?.isOpen === false) {
                        alert("Lo sentimos, el local está cerrado.");
                        return;
                      }
                      // Add chef suggestion custom item to wishlist
                      const suggestionItem: WishlistItem = {
                        productId: 'chef_special',
                        productName: `✨ SUGERENCIA: ${config.chefSuggestion.name}`,
                        selectedPriceLabel: 'Especial',
                        selectedPriceValue: config.chefSuggestion.price,
                        quantity: 1
                      };
                      setWishlist([...wishlist, suggestionItem]);
                      setIsChefSuggestionOpened(false);
                      alert("¡Sugerencia agregada a tus deseos!");
                    }}
                    disabled={config?.isOpen === false}
                    className={`w-full py-2.5 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-lg active:scale-95 transition-all ${
                      config?.isOpen === false ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-400 text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${config?.isOpen === false ? 'fill-slate-600' : 'fill-white'}`} />
                    <span>{config?.isOpen === false ? 'Local Cerrado' : 'AGREGAR AL PEDIDO'}</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. WISHLIST POPUP PANEL WINDOW ("Lista de Deseos") */}
      <AnimatePresence>
        {isWishlistOpened && (
          <div 
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center select-text"
            onClick={() => setIsWishlistOpened(false)}
          >
            <motion.div 
              initial={{ translateY: "100%" }}
              animate={{ translateY: 0 }}
              exit={{ translateY: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full bg-slate-900 border-t border-slate-850 rounded-t-[32px] overflow-hidden max-h-[85vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header */}
              <div className="p-4 bg-slate-950/40 border-b border-slate-850 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Mi Lista de Deseos</h3>
                    <p className="text-[10px] text-slate-400">PRODUCTOS para revisar o enviar al Delivery</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsWishlistOpened(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wishlist item list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. ACTIVE ORDER STATUS (INTERNAL CHAT FEEDBACK) */}
                {activeCall && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-2xl border flex flex-col space-y-3 shadow-md mb-2 ${
                      activeCall.notes ? 'bg-indigo-950/40 border-indigo-500/30' : 'bg-slate-900/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center mb-0.5">
                          <Wifi className="w-2.5 h-2.5 mr-1.5 animate-pulse text-indigo-500" />
                          Tu Pedido en Curso
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`block w-1.5 h-1.5 rounded-full animate-pulse ${
                            activeCall.status === 'pending' ? 'bg-amber-500' : 
                            activeCall.status === 'attending' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`} />
                          <span className="text-[11px] font-black text-white uppercase tracking-tight">
                            {activeCall.status === 'pending' ? 'Recibido' : 
                             activeCall.status === 'attending' ? 'En Cocina' : 
                             activeCall.status === 'ready' ? '¡En Camino!' : 'Finalizado'}
                          </span>
                        </div>
                      </div>
                      
                      {activeCall.status === 'ready' && (
                        <Check className="w-4 h-4 text-blue-500 animate-bounce" />
                      )}
                    </div>

                    {activeCall.notes && activeCall.notes.trim() !== "" && (
                      <div className="flex flex-col space-y-1.5 pt-1 border-t border-white/5">
                        <span className="text-[7.5px] uppercase font-black text-indigo-400/70 tracking-[0.15em]">Mensaje del Local</span>
                        <p className="text-[10.5px] text-indigo-100 font-medium leading-relaxed italic">
                          "{activeCall.notes}"
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {wishlist.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2 uppercase tracking-tighter">
                    <ShoppingBag className="w-8 h-8 opacity-20" />
                    <p className="text-xs text-slate-400 font-black">No tienes productos seleccionados</p>
                    <p className="text-[9px] text-slate-500 font-medium">Agrega productos del menú para realizar un pedido.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Nuevos Deseos</span>
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                        {wishlist.length} item{wishlist.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {wishlist.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{item.productName}</p>
                          <p className="text-[9px] text-slate-400 leading-none mt-1">
                            Opción: {item.selectedPriceLabel} • {formatCurrency(item.selectedPriceValue)} c/u
                          </p>
                        </div>

                        {/* Quantity modifiers */}
                        <div className="flex items-center space-x-2.5 flex-shrink-0">
                          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                            <button 
                              onClick={() => updateWishlistQty(idx, -1)}
                              className="p-0.5 text-slate-400 hover:text-white"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[11px] font-bold text-white w-5 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateWishlistQty(idx, 1)}
                              className="p-0.5 text-slate-400 hover:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <span className="text-xs font-black text-amber-400 w-16 text-right font-mono">
                            {formatCurrency(item.selectedPriceValue * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary and buzzer bridge action */}
              <div className="p-4 bg-slate-950/80 border-t border-slate-850 space-y-4 pb-8">
                {(wishlist.length > 0 || activeCall) && (
                  <>
                    {/* Name and Address validation inside modal */}
                    <div className={`rounded-xl p-3 border transition-all ${wishlist.length > 0 ? 'bg-amber-500/5 border-amber-500/10' : 'bg-slate-950/40 border-slate-850 opacity-60'}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <User size={14} className={wishlist.length > 0 ? "text-amber-500" : "text-slate-500"} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${wishlist.length > 0 ? "text-amber-500" : "text-slate-500"}`}>Datos del Envío / Consulta</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase text-white/40 font-bold mb-1">Tu Nombre</span>
                          <input 
                            type="text"
                            placeholder="Tu nombre..."
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:border-amber-500/50 outline-none transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase text-white/40 font-bold mb-1">Tu Dirección</span>
                            <input 
                              type="text"
                              placeholder="Tu dirección..."
                              value={userAddress}
                              onChange={(e) => setUserAddress(e.target.value)}
                              className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:border-amber-500/50 outline-none transition-all"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase text-white/40 font-bold mb-1">Tu Teléfono (549...)</span>
                            <input 
                              type="tel"
                              placeholder="549 + número..."
                              value={userPhone}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val.length < 3) {
                                  setUserPhone('549');
                                } else if (val.startsWith('549')) {
                                  setUserPhone(val);
                                } else {
                                  setUserPhone('549' + val.replace(/\D/g, ''));
                                }
                              }}
                              className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:border-amber-500/50 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>Total estimado:</span>
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {formatCurrency(wishlist.reduce((acc, x) => acc + (x.selectedPriceValue * x.quantity), 0))}
                      </span>
                    </div>

                    <div className="flex gap-2.5 pt-1">
                      <button 
                        onClick={handleClearWishlist}
                        disabled={wishlist.length === 0}
                        className={`px-3.5 py-2.5 rounded-xl flex items-center justify-center transition-all ${
                          wishlist.length === 0 
                            ? 'bg-slate-900 border border-slate-800 text-slate-700 cursor-not-allowed' 
                            : 'bg-red-950/25 border border-red-900/40 hover:bg-red-950/40 text-red-400'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (buzzAnimationActive) return;
                          if (!userName.trim() || !userAddress.trim() || !userPhone.trim()) {
                            alert("¡Atención! Por favor ingresa tu NOMBRE, DIRECCIÓN y TELÉFONO antes de de realizar el pedido.");
                            return;
                          }
                          if (config?.isOpen === false) {
                            alert("El local está cerrado y no puede recibir pedidos en este momento.");
                            return;
                          }
                          setIsWishlistOpened(false);
                          handleCallWaiter();
                        }}
                        disabled={config?.isOpen === false || buzzAnimationActive || wishlist.length === 0}
                        className={`flex-1 py-2.5 font-extrabold rounded-xl text-[11px] flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-lg ${
                          config?.isOpen === false || buzzAnimationActive || wishlist.length === 0 
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
                            : 'bg-amber-500 hover:bg-amber-400 text-black'
                        }`}
                      >
                        {isFetchingGPS ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>OBTENIENDO GPS...</span>
                          </>
                        ) : wishlist.length === 0 && activeCall ? (
                          <>
                            <ShoppingBag className="w-4 h-4" />
                            <span>ESPERANDO...</span>
                          </>
                        ) : (
                          <>
                            <Bell className={`w-4 h-4 ${config?.isOpen === false ? 'fill-slate-600' : 'fill-black'}`} />
                            <span>{config?.isOpen === false ? 'Local Cerrado' : activeCall ? 'ACTUALIZAR PEDIDO' : 'PEDIR'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. PASSCODE PIN SECURITY OVERLAY FOR BACK-OFFICE */}
      <AnimatePresence>
        {isPasscodeOpened && (
          <PasscodeScreen 
            correctPin={config?.pinCode || '99999'}
            onSuccess={() => {
              setIsPasscodeOpened(false);
              setIsAdminOpened(true);
            }}
            onClose={() => setIsPasscodeOpened(false)}
            isAdmin={isAdmin}
            onGoogleLogin={async () => {
              try {
                const u = await loginWithGoogle();
                if (u) {
                  const check = await isAdminUser(u.uid);
                  if (check) {
                    setIsPasscodeOpened(false);
                    setIsAdminOpened(true);
                  } else {
                    alert("Acceso denegado: Tu cuenta no está autorizada como administrador.");
                  }
                }
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* 6. FIREBASE SETUPS OVERLAYS REMOVED */}

      {/* 7. WAITRESS BUZZ SUCCESS NOTIFICATION POPUP */}
      <AnimatePresence>
        {showBuzzSuccessModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-5 bg-slate-900 border-2 border-amber-500/20 rounded-3xl max-w-xs space-y-4"
            >
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/35 text-amber-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Bell className="w-7 h-7 fill-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-white text-sm uppercase">¡Consulta Enviada!</h3>
                <p className="text-xs text-slate-300">Gracias <span className="text-amber-400 font-extrabold">{userName}</span>, recibimos tu mensaje.</p>
                {wishlist.length > 0 ? (
                  <p className="text-[10px] text-slate-400 italic">El personal ya fue notificado de tu lista de {wishlist.reduce((acc, x) => acc + x.quantity, 0)} deseos.</p>
                ) : (
                  <p className="text-[10px] text-slate-400">¿Deseas agregar PRODUCTOS al pedido en camino mientras tanto?</p>
                )}
              </div>
              <button 
                onClick={() => setShowBuzzSuccessModal(false)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs active:scale-95 transition-all uppercase"
              >
                Cerrar Aviso
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </PhoneContainer>

    {/* 5. BACK-OFFICE PANEL COMPONENT - RENDERED OUTSIDE FOR PC FULLSCREEN WIDESCREEN DASHBOARD */}
    <AnimatePresence>
      {isAdminOpened && config && (
        <AdminPanel 
          categories={categories}
          products={products}
          config={config}
          isAdmin={isAdmin}
          onClose={() => setIsAdminOpened(false)}
          onRefreshData={loadData}
        />
      )}
    </AnimatePresence>
      {/* 5. PASSCODE LOCK SCREEN FOR DELIVERY */}
      <AnimatePresence>
        {isDeliveryPasscodeOpened && (
          <PasscodeScreen 
            correctPin="11111"
            onSuccess={() => {
              setIsDeliveryPasscodeOpened(false);
              setIsDeliveryOpened(true);
            }}
            onClose={() => setIsDeliveryPasscodeOpened(false)}
          />
        )}
      </AnimatePresence>

      {/* 6. DELIVERY PANEL OVERLAY */}
      {isDeliveryOpened && (
        <DeliveryPanel 
          onClose={() => setIsDeliveryOpened(false)}
        />
      )}
    </>
  );
}
