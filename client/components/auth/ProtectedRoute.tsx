/**
 * ProtectedRoute — Envuelve rutas que requieren autenticación.
 * Lee la sesión del AuthContext (Supabase). Redirige a /auth si no hay sesión.
 */

import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[hsl(222,47%,4%)]">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
