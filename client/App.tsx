import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Casos from "./pages/Casos";
import Reservaciones from "./pages/Reservaciones";
import Usuarios from "./pages/Usuarios";
import Empresas from "./pages/Empresas";
import Vehiculos from "./pages/Vehiculos";
import Operadores from "./pages/Operadores";
import Cotizaciones from "./pages/Cotizaciones";
import Clientes from "./pages/Clientes";
import Contratos from "./pages/Contratos";
import KycPublico from "./pages/KycPublico";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
          {/* ── Authentication (public) ── */}
          <Route path="/auth" element={<Auth />} />

          {/* ── KYC público (link enviado por WhatsApp, public) ── */}
          <Route path="/kyc/:caseId/:role/:token" element={<KycPublico />} />

          {/* ── Protected core v2 routes ── */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/reservaciones" element={<ProtectedRoute><Reservaciones /></ProtectedRoute>} />
          <Route path="/casos" element={<ProtectedRoute><Casos /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
          <Route path="/vehiculos" element={<ProtectedRoute><Vehiculos /></ProtectedRoute>} />
          <Route path="/operadores" element={<ProtectedRoute><Operadores /></ProtectedRoute>} />
          <Route path="/cotizaciones" element={<ProtectedRoute><Cotizaciones /></ProtectedRoute>} />

          {/* ── Legacy protected routes ── */}
          <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
          <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />

          {/* ── Catch all ── */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
