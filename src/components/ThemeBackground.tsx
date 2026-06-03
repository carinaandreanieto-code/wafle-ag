import React from 'react';

interface ThemeBackgroundProps {
  styleName: 'luxury' | 'fastfood' | 'cafe' | 'neonbar' | 'dessert';
  children: React.ReactNode;
}

export default function ThemeBackground({ styleName, children }: ThemeBackgroundProps) {
  // Return different tailwind styles and design tokens per category
  switch (styleName) {
    case 'luxury':
      return (
        <div className="absolute inset-0 bg-[#09090b] text-[#f4f4f5] overflow-y-auto font-sans flex flex-col transition-all duration-700">
          {/* Gold glowing geometric accent lines */}
          <div className="absolute top-0 left-0 w-full h-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 left-10 w-44 h-44 rounded-full bg-amber-500/3 blur-[100px] pointer-events-none" />
          
          {/* Subtle marble dust pattern or classy borders */}
          <div className="absolute inset-4 border border-amber-950/20 rounded-3xl pointer-events-none z-10" />
          <div className="relative z-20 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      );

    case 'fastfood':
      return (
        <div className="absolute inset-0 bg-[#0c0404] text-[#fffffa] overflow-y-auto font-sans flex flex-col transition-all duration-700">
          {/* Hot red and yellow burger stand neon background vibes */}
          <div className="absolute top-1/4 left-0 w-full h-80 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-950/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />
          
          {/* Comic halftone or neon active grid stripes */}
          <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="absolute inset-4 border border-red-500/10 rounded-3xl pointer-events-none z-10" />
          <div className="relative z-20 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      );

    case 'cafe':
      return (
        <div className="absolute inset-0 bg-[#faf6f0] text-[#3e2723] overflow-y-auto font-sans flex flex-col transition-all duration-700">
          {/* Soft cinnamon and organic clay pastel earth vibes */}
          <div className="absolute top-0 left-0 w-full h-36 bg-gradient-to-b from-orange-100/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-36 h-36 rounded-full bg-orange-200/20 blur-3xl pointer-events-none" />
          
          {/* Warm retro organic dotted texture */}
          <div className="absolute inset-0 opacity-[0.1] bg-[radial-gradient(#d7ccc8_1.5px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none" />
          <div className="absolute inset-4 border border-orange-200/30 rounded-3xl pointer-events-none z-10" />
          <div className="relative z-20 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      );

    case 'neonbar':
      return (
        <div className="absolute inset-0 bg-[#030008] text-[#f5f3ff] overflow-y-auto font-mono flex flex-col transition-all duration-700">
          {/* High-intensity cyberpunk ultraviolet glows and gridlines */}
          <div className="absolute top-0 left-10 w-44 h-44 rounded-full bg-violet-600/10 blur-[80px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-20 right-10 w-44 h-44 rounded-full bg-indigo-600/10 blur-[90px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="absolute inset-4 border border-violet-500/10 rounded-3xl pointer-events-none z-10" />
          <div className="relative z-20 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      );

    case 'dessert':
      return (
        <div className="absolute inset-0 bg-[#fff5f5] text-[#b91c1c] overflow-y-auto font-sans flex flex-col transition-all duration-700">
          {/* Candy pink strawberry-cream and marshmallow sweet gradients */}
          <div className="absolute top-0 left-0 w-full h-44 bg-gradient-to-b from-pink-100/60 to-transparent pointer-events-none" />
          <div className="absolute top-1/2 left-10 w-44 h-44 rounded-full bg-pink-200/20 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-10 right-5 w-48 h-48 rounded-full bg-pink-300/10 blur-3xl pointer-events-none" />
          
          {/* Sweet bubbly cloud dots */}
          <div className="absolute inset-0 opacity-[0.2] bg-[radial-gradient(#fecdd3_2px,transparent_2px)] [background-size:24px_24px] pointer-events-none" />
          <div className="absolute inset-4 border border-rose-200/40 rounded-3xl pointer-events-none z-10" />
          <div className="relative z-20 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      );

    default:
      return (
        <div className="absolute inset-0 bg-slate-900 text-slate-100 overflow-y-auto font-sans flex flex-col transition-all duration-700">
          <div className="relative z-20 flex-1 flex flex-col">
            {children}
          </div>
        </div>
      );
  }
}
