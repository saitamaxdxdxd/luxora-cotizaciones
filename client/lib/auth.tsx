/**
 * AuthContext basado en Supabase Auth.
 * Expone: session, user, loading, signIn, signUp, signOut, resendVerification.
 *
 * - Multi-tenant por cuenta: cada usuario autenticado es dueño de sus propios datos.
 * - El email confirmation flow real es manejado por Supabase (no más códigos fake).
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { nombre?: string; apellidoPaterno?: string },
  ) => Promise<{ error: AuthError | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      signUp: async (email, password, metadata) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre: metadata?.nombre ?? "",
              apellido_paterno: metadata?.apellidoPaterno ?? "",
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        // Si Supabase tiene "Confirm email" activado, data.session será null y
        // el usuario debe abrir el link de confirmación que llegó a su correo.
        const needsConfirmation = !error && !data.session;
        return { error, needsConfirmation };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      resendVerification: async (email) => {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        return { error };
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
