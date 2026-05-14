/**
 * LUXORA — Autenticación con Supabase Auth.
 * Flujo: mode → form (login | signup) → check-email (signup) → redirige a /
 *
 * Supabase maneja:
 *  - Hash de contraseña (bcrypt)
 *  - Email confirmation real (link enviado por correo, no códigos fake)
 *  - Sesión + refresh tokens
 */

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

type AuthStep = "mode" | "form" | "check-email";

export default function Auth() {
  const { signIn, signUp, resendVerification, session, loading: authLoading } = useAuth();
  const [authStep, setAuthStep] = useState<AuthStep>("mode");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nombre: "",
    apellidoPaterno: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [resentOk, setResentOk] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Si ya hay sesión, redirige al destino original (o "/").
  useEffect(() => {
    if (!authLoading && session) {
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
      navigate(from, { replace: true });
    }
  }, [authLoading, session, navigate, location.state]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateSignupForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) newErrors.email = "El correo es requerido";
    else if (!validateEmail(formData.email)) newErrors.email = "Correo inválido";
    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido";
    if (!formData.apellidoPaterno.trim()) newErrors.apellidoPaterno = "El apellido paterno es requerido";
    if (!formData.password.trim()) newErrors.password = "La contraseña es requerida";
    else if (formData.password.length < 6) newErrors.password = "Mínimo 6 caracteres";
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = "Confirma tu contraseña";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    if (!formData.acceptTerms) newErrors.acceptTerms = "Debes aceptar los términos de uso";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLoginForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) newErrors.email = "El correo es requerido";
    else if (!validateEmail(formData.email)) newErrors.email = "Correo inválido";
    if (!formData.password.trim()) newErrors.password = "La contraseña es requerida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (!validateSignupForm()) return;
    setIsLoading(true);
    try {
      const { error, needsConfirmation } = await signUp(formData.email, formData.password, {
        nombre: formData.nombre,
        apellidoPaterno: formData.apellidoPaterno,
      });
      if (error) {
        setApiError(error.message);
        return;
      }
      if (needsConfirmation) {
        setAuthStep("check-email");
      } else {
        // Si "Confirm email" está desactivado en Supabase, ya hay sesión → redirige.
        navigate("/", { replace: true });
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Error al procesar la solicitud");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (!validateLoginForm()) return;
    setIsLoading(true);
    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        // Mensajes amigables
        const msg = /invalid login credentials/i.test(error.message)
          ? "Correo o contraseña incorrectos"
          : /email not confirmed/i.test(error.message)
            ? "Debes confirmar tu correo antes de iniciar sesión"
            : error.message;
        setApiError(msg);
        return;
      }
      // onAuthStateChange en AuthProvider actualiza session, y el useEffect de arriba redirige.
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Error en la autenticación");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setApiError("");
    setResentOk(false);
    setIsLoading(true);
    try {
      const { error } = await resendVerification(formData.email);
      if (error) setApiError(error.message);
      else setResentOk(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      nombre: "",
      apellidoPaterno: "",
      acceptTerms: false,
    });
    setErrors({});
    setApiError("");
    setResentOk(false);
    setAuthStep("mode");
  };

  // ─── Render: Mode Selection ───────────────────────────────────────────────

  if (authStep === "mode") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[hsl(222,47%,4%)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-amber-500/10 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="w-full max-w-md px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-2">LUXORA</h1>
            <p className="text-muted-foreground text-sm">Sistema de Renta de Vehículos</p>
          </div>

          <div className="glass-card rounded-2xl p-8 border border-white/10 backdrop-blur-xl">
            <p className="text-center text-sm text-muted-foreground mb-6">¿Cómo deseas continuar?</p>

            <div className="space-y-3">
              <button
                onClick={() => { setAuthMode("login"); setAuthStep("form"); }}
                className="w-full py-3 px-4 rounded-lg border border-white/10 hover:border-amber-500/50 hover:bg-white/5 transition-all text-foreground font-medium flex items-center gap-3 justify-center group"
              >
                <Mail className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                Iniciar Sesión
              </button>

              <button
                onClick={() => { setAuthMode("signup"); setAuthStep("form"); }}
                className="w-full py-3 px-4 rounded-lg bg-gold-gradient hover:brightness-110 text-[hsl(222,47%,4%)] font-semibold transition-all flex items-center gap-3 justify-center group"
              >
                <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Crear Cuenta
              </button>
            </div>

            <p className="text-center text-muted-foreground text-xs mt-8 border-t border-white/10 pt-6">
              Al continuar, aceptas nuestros{" "}
              <a href="#" className="text-amber-400 hover:text-amber-300">Términos</a>{" "}y{" "}
              <a href="#" className="text-amber-400 hover:text-amber-300">Privacidad</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Form (Login or Signup) ───────────────────────────────────────

  if (authStep === "form") {
    const isSignup = authMode === "signup";

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[hsl(222,47%,4%)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-amber-500/10 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="w-full max-w-md px-4 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {isSignup ? "Crear Cuenta" : "Iniciar Sesión"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isSignup ? "Ingresa tus datos para registrarte" : "Ingresa tus credenciales"}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 border border-white/10 backdrop-blur-xl">
            {apiError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{apiError}</p>
              </div>
            )}

            <form onSubmit={isSignup ? handleSignupSubmit : handleLoginSubmit} className="space-y-5">
              {isSignup && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange("nombre", e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all",
                      errors.nombre && "border-red-500/50 bg-red-500/5",
                    )}
                    placeholder="Tu nombre"
                    disabled={isLoading}
                  />
                  {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
                </div>
              )}

              {isSignup && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Apellido Paterno *</label>
                  <input
                    type="text"
                    value={formData.apellidoPaterno}
                    onChange={(e) => handleInputChange("apellidoPaterno", e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all",
                      errors.apellidoPaterno && "border-red-500/50 bg-red-500/5",
                    )}
                    placeholder="Tu apellido paterno"
                    disabled={isLoading}
                  />
                  {errors.apellidoPaterno && (
                    <p className="text-red-400 text-xs mt-1">{errors.apellidoPaterno}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Correo Electrónico *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all",
                      errors.email && "border-red-500/50 bg-red-500/5",
                    )}
                    placeholder="tu@email.com"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contraseña *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all",
                      errors.password && "border-red-500/50 bg-red-500/5",
                    )}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isLoading}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              {isSignup && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirmar Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg",
                        "text-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all",
                        errors.confirmPassword && "border-red-500/50 bg-red-500/5",
                      )}
                      placeholder="Repite tu contraseña"
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {isSignup && (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={(e) => handleInputChange("acceptTerms", e.target.checked)}
                      className="w-5 h-5 rounded border border-amber-500/30 bg-white/10 checked:bg-amber-500 checked:border-amber-500 cursor-pointer mt-0.5 transition-colors"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">Aceptar términos de uso</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        He leído y acepto los{" "}
                        <a href="#" className="text-amber-400 hover:text-amber-300 underline transition-colors">términos de servicio</a>{" "}y la{" "}
                        <a href="#" className="text-amber-400 hover:text-amber-300 underline transition-colors">política de privacidad</a>.
                      </p>
                    </div>
                  </label>
                  {errors.acceptTerms && <p className="text-red-400 text-xs mt-3">{errors.acceptTerms}</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-8 py-3 bg-gold-gradient hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[hsl(222,47%,4%)] font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : isSignup ? "Crear Cuenta" : "Iniciar Sesión"}
              </button>
            </form>

            <button
              onClick={resetForm}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Check Email (después de signup con confirmación habilitada) ──

  if (authStep === "check-email") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[hsl(222,47%,4%)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-t from-blue-500/10 to-transparent rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="w-full max-w-md px-4 relative z-10">
          <div className="glass-card rounded-2xl p-8 border border-white/10 backdrop-blur-xl">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Mail className="w-10 h-10 text-amber-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-foreground mb-2">
              Confirma tu correo
            </h1>
            <p className="text-center text-muted-foreground text-sm mb-6">
              Te enviamos un link de confirmación a{" "}
              <span className="font-semibold text-foreground">{formData.email}</span>.
              Ábrelo desde tu correo para activar la cuenta.
            </p>

            {apiError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{apiError}</p>
              </div>
            )}

            {resentOk && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-emerald-300 text-sm">Reenviamos el link de confirmación.</p>
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={isLoading}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reenviar correo de confirmación"}
            </button>

            <button
              onClick={resetForm}
              className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
