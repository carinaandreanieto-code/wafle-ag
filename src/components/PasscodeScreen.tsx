import React, { useState } from 'react';
import { Lock, X, Delete, LogIn, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PasscodeScreenProps {
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
  isAdmin?: boolean;
  onGoogleLogin?: () => void;
}

export default function PasscodeScreen({ correctPin, onSuccess, onClose, isAdmin, onGoogleLogin }: PasscodeScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const pinLength = (correctPin || '99999').length;
  const pinValue = (correctPin || '99999');

  const handleNumberTap = (num: number) => {
    if (pin.length >= pinLength) return;
    setError(false);
    const nextPin = pin + num;
    setPin(nextPin);

    // Auto check once we hit the correct length
    if (nextPin.length === pinLength) {
      if (nextPin === pinValue) {
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#020205]/95 backdrop-blur-md flex flex-col justify-between p-6 text-white font-sans"
    >
      
      {/* Top section with cancel */}
      <div className="flex justify-between items-center pt-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Seguridad CRM</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Title & Dots indicator */}
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/25">
          <Lock className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold tracking-wider text-slate-200">Panel de Administración</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Ingresa el PIN de acceso</p>
        </div>

        {/* Google Login Shortcut if Admin is detected or as alternative */}
        <div className="w-full max-w-[240px] mt-2">
          {isAdmin ? (
            <button
              onClick={onSuccess}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-tighter rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <span>Entrar como Administrador</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : onGoogleLogin && (
            <button
              onClick={onGoogleLogin}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-tight rounded-xl flex items-center justify-center space-x-2 border border-slate-800 transition-all hover:border-slate-600 active:scale-95"
            >
              <LogIn className="w-3 h-3" />
              <span>Acceso Rápido con Google</span>
            </button>
          )}
        </div>

        {/* Pascode dots indicator */}
        <div className={`flex space-x-4 mt-8 ${error ? 'animate-bounce' : ''}`}>
          {[...Array(pinLength)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < pin.length 
                  ? error 
                    ? 'bg-rose-500 border-rose-500 scale-110 shadow-lg shadow-rose-500/20' 
                    : 'bg-amber-400 border-amber-400 scale-110 shadow-lg shadow-amber-400/20' 
                  : 'border-slate-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-[10px] text-rose-500 font-bold tracking-tight mt-1">
            PIN incorrecto. Inténtalo de nuevo.
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-[270px] mx-auto grid grid-cols-3 gap-y-4 gap-x-5 pb-12">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleNumberTap(num)}
            className="w-14 h-14 rounded-full bg-slate-900/60 border border-slate-800/60 active:bg-slate-800/80 hover:border-slate-600/50 flex flex-col items-center justify-center transition-all mx-auto shadow-sm"
          >
            <span className="text-xl font-bold text-white">{num}</span>
          </button>
        ))}

        {/* Clear/Delete */}
        <button
          type="button"
          onClick={() => setPin('')}
          className="w-14 h-14 rounded-full active:bg-slate-900/40 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center mx-auto"
        >
          Borrar
        </button>

        {/* Zero */}
        <button
          type="button"
          onClick={() => handleNumberTap(0)}
          className="w-14 h-14 rounded-full bg-slate-900/60 border border-slate-800/60 active:bg-slate-800/80 flex items-center justify-center mx-auto shadow-sm"
        >
          <span className="text-xl font-bold text-white">0</span>
        </button>

        {/* Delete button indicator */}
        <button
          type="button"
          onClick={handleDelete}
          className="w-14 h-14 rounded-full active:bg-slate-900/40 flex items-center justify-center mx-auto text-slate-400 hover:text-white"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

    </motion.div>
  );
}
