import React from 'react';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export default function PhoneContainer({ children }: PhoneContainerProps) {
  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] relative flex items-center justify-center p-0 md:p-6 select-none overflow-hidden">
      
      {/* Immersive Theme Decorative Background Elements */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* iPhone Mockup (active on desktop/tablet, invisible on actual small mobile viewports) */}
      <div className="w-full h-screen md:h-[860px] md:w-[410px] md:rounded-[56px] bg-[#0c0d12] md:p-3.5 relative shadow-[0_0_80px_rgba(0,0,0,0.85)] md:ring-12 md:ring-[#282930] flex flex-col overflow-hidden">
        
        {/* Physical phone camera island, buttons, etc (desktop only) */}
        <div className="hidden md:block absolute -left-1 top-28 w-1 h-14 bg-[#393a40] rounded-r-sm z-30" /> {/* Vol + */}
        <div className="hidden md:block absolute -left-1 top-46 w-1 h-14 bg-[#393a40] rounded-r-sm z-30" /> {/* Vol - */}
        <div className="hidden md:block absolute -right-1 top-36 w-1 w-1 h-20 bg-[#393a40] rounded-l-sm z-30" /> {/* Power */}

        {/* Dynamic Island Notch (desktop only) */}
        <div className="hidden md:flex absolute top-5 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-3xl z-40 items-center justify-between px-3.5 pointer-events-none">
          <div className="w-2.5 h-2.5 bg-[#0b172a] rounded-full border border-slate-900/40" />
          <div className="w-4 h-1.5 bg-[#0d1e36] rounded-full opacity-60" />
        </div>

        {/* Core Mobile Application viewport */}
        <div id="phone-screen" className="flex-1 w-full bg-black relative flex flex-col overflow-hidden md:rounded-[40px] rounded-none">
          {children}
        </div>

        {/* Simulated iPhone Home Indicator bar (fixed at bottom on desktop, looks premium) */}
        <div className="hidden md:flex h-6 w-full items-center justify-center bg-black/20 z-40 pointer-events-none flex-shrink-0 pb-1.5">
          <div className="w-32 h-1 bg-white/40 rounded-full" />
        </div>

      </div>
    </div>
  );
}
