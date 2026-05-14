/**
 * LUXORA Header - Barra de navegación superior de la aplicación
 */

import { Car, Shield, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleScroll = () => setScrolled(window.scrollY > 8);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-[hsl(222,47%,4%)]/95 backdrop-blur-xl border-b border-[hsl(38,92%,50%)]/10 shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 opacity-20" />
              <div className="absolute inset-0 rounded-xl border border-amber-500/30" />
              <Car className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 relative z-10" />
            </div>

            {/* Brand text */}
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl sm:text-2xl tracking-[0.15em] text-gold-gradient leading-none">
                LUXORA
              </span>
              <span className="text-[9px] sm:text-[10px] text-amber-500/60 tracking-[0.3em] uppercase font-medium leading-tight">
                Cotizador VIP
              </span>
            </div>
          </div>

          {/* Right side indicators */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Connection status */}
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all",
                isOnline
                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8"
                  : "text-amber-400 border-amber-500/20 bg-amber-500/8"
              )}
            >
              {isOnline ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">
                {isOnline ? "En línea" : "Sin conexión"}
              </span>
            </div>

            {/* VIP badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold tracking-widest text-amber-400/70 border border-amber-500/15 rounded-full px-3 py-1.5">
              <Shield className="w-3 h-3" />
              <span>VIP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
    </header>
  );
}
