/**
 * NavShell — Barra de navegación persistente de LUXORA.
 * Envuelve todas las páginas y provee acceso entre módulos.
 */

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calculator, Users, FileText,
  Shield, ChevronRight, Car, FolderKanban, Database, Trash2, X, Building2,
  LogOut, User,
} from "lucide-react";
import { getStorageUsedBytes, getStorageUsedLabel, clearStorageImages } from "@/lib/imageUtils";
import { useAuth } from "@/lib/auth";

// ─── Módulos de navegación ───────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: "/",             label: "Dashboard",     icon: LayoutDashboard, color: "text-amber-400"  },
  { path: "/reservaciones",label: "Reservaciones", icon: FolderKanban,    color: "text-emerald-400" },
  { path: "/usuarios",     label: "Usuarios",      icon: Users,           color: "text-blue-400"   },
  { path: "/empresas",     label: "Empresas",      icon: Building2,       color: "text-purple-400" },
  { path: "/vehiculos",    label: "Vehículos",     icon: Car,             color: "text-purple-400" },
  { path: "/operadores",   label: "Operadores",    icon: Users,           color: "text-amber-400"  },
  { path: "/cotizaciones", label: "Cotizaciones",  icon: Calculator,      color: "text-amber-400"  },
];

// localStorage limit is ~5 MB per origin (browsers may vary)
const QUOTA_BYTES = 5_000_000;

// ─── Storage indicator ────────────────────────────────────────────────────────

function StorageIndicator() {
  const [used, setUsed]         = useState(getStorageUsedBytes);
  const [showPanel, setShowPanel] = useState(false);
  const [cleaned, setCleaned]   = useState(false);

  // Refresh every 10 s or when panel opens
  useEffect(() => {
    const id = setInterval(() => setUsed(getStorageUsedBytes()), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (showPanel) setUsed(getStorageUsedBytes());
  }, [showPanel]);

  const pct     = Math.min(100, Math.round((used / QUOTA_BYTES) * 100));
  const label   = getStorageUsedLabel();
  const isHigh  = pct >= 75;
  const isCrit  = pct >= 90;

  if (pct < 50 && !showPanel) return null; // hidden when plenty of space

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel((v) => !v)}
        title={`Almacenamiento: ${label} / ~5 MB (${pct}%)`}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all",
          isCrit ? "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse"
          : isHigh ? "bg-amber-500/12 border-amber-500/25 text-amber-400"
          : "bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)] text-[hsl(215,20%,45%)]"
        )}>
        <Database className="w-3 h-3" />
        <span className="hidden sm:block">{pct}%</span>
      </button>

      {showPanel && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-10 z-50 w-72 glass-card rounded-2xl p-4 flex flex-col gap-3 border border-[hsl(217,25%,18%)] shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[hsl(210,40%,90%)] flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Almacenamiento local
              </p>
              <button onClick={() => setShowPanel(false)}
                className="text-[hsl(215,20%,40%)] hover:text-[hsl(215,20%,60%)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-[hsl(215,20%,50%)]">Usado</span>
                <span className={cn("font-bold", isCrit ? "text-red-400" : isHigh ? "text-amber-400" : "text-emerald-400")}>
                  {label} / ~5 MB ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-[hsl(217,25%,12%)] overflow-hidden">
                <div className={cn("h-full rounded-full transition-all",
                  isCrit ? "bg-red-500" : isHigh ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Info */}
            <p className="text-[10px] text-[hsl(215,20%,45%)] leading-relaxed">
              El almacenamiento está {isCrit ? "crítico" : isHigh ? "casi lleno" : "en uso"}. Las fotos de documentos y selfies ocupan la mayor parte del espacio.
            </p>

            {/* Actions */}
            {!cleaned ? (
              <button onClick={() => {
                if (confirm("¿Eliminar todas las imágenes almacenadas (fotos de documentos y selfies)? Los datos de texto (nombre, CURP, etc.) se conservan.")) {
                  clearStorageImages();
                  setUsed(getStorageUsedBytes());
                  setCleaned(true);
                }
              }}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold bg-red-500/12 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
                Liberar espacio — borrar imágenes
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                ✓ Imágenes eliminadas. Nuevo uso: {label}
              </div>
            )}

            <p className="text-[9px] text-[hsl(215,20%,30%)] text-center">
              Los datos de texto, reservaciones y vehículos no se borran.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface NavShellProps {
  children: React.ReactNode;
}

export function NavShell({ children }: NavShellProps) {
  const location = useNavigate ? useLocation() : { pathname: "/" };
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = (user?.user_metadata?.nombre as string | undefined) ?? "";
  const displayApellido = (user?.user_metadata?.apellido_paterno as string | undefined) ?? "";
  const displayEmail = user?.email ?? "";

  const current = NAV_ITEMS.find((n) => {
    if (n.path === "/") return location.pathname === "/";
    return location.pathname.startsWith(n.path);
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top bar ── */}
      <header className="border-b border-amber-500/10 bg-[hsl(222,47%,4%)] sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-display font-bold text-base tracking-widest text-gold-gradient">
                LUXORA
              </span>
            </button>

            {/* Breadcrumb */}
            {current && current.path !== "/" && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-[hsl(215,20%,45%)]">
                <span>LUXORA</span>
                <ChevronRight className="w-3 h-3" />
                <span className={cn("font-semibold", current.color)}>{current.label}</span>
              </div>
            )}

            {/* Nav + user menu + storage indicator */}
            <div className="flex items-center gap-1.5">
              <StorageIndicator />

              {/* User menu */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-[hsl(215,20%,50%)] hover:text-foreground hover:bg-[hsl(217,25%,11%)] transition-all"
                    title={`${displayName} ${displayApellido}`.trim() || displayEmail}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:block truncate max-w-[100px]">
                      {displayName || displayEmail.split("@")[0]}
                    </span>
                  </button>

                  {showUserMenu && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />

                      {/* Menu */}
                      <div className="absolute right-0 top-10 z-50 w-48 glass-card rounded-xl p-2 border border-[hsl(217,25%,18%)] shadow-xl">
                        <div className="px-3 py-2 border-b border-white/10 mb-2">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {`${displayName} ${displayApellido}`.trim() || displayEmail}
                          </p>
                          <p className="text-[10px] text-[hsl(215,20%,50%)] truncate">
                            {displayEmail}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            void handleLogout();
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Cerrar sesión
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <nav className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.path === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200",
                        active
                          ? "bg-amber-500/15 border border-amber-500/25 text-amber-300"
                          : "text-[hsl(215,20%,50%)] hover:text-[hsl(210,40%,80%)] hover:bg-[hsl(217,25%,11%)]"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", active ? "text-amber-400" : item.color + "/60")} />
                      <span className="hidden sm:block">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
