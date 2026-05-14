/**
 * useUnsavedChanges — Protege contra pérdida de datos sin guardar
 * Alerta al usuario si intenta salir con cambios sin guardar
 */

import { useEffect } from "react";
import { useBeforeUnload } from "react-router-dom";

interface UseUnsavedChangesOptions {
  isDirty: boolean;
  message?: string;
}

export function useUnsavedChanges({
  isDirty,
  message = "Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?",
}: UseUnsavedChangesOptions) {
  // Prevent browser close/refresh if there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, message]);

  // Prevent navigation away if there are unsaved changes
  useBeforeUnload(({ currentLocation, nextLocation }: any) => {
    if (isDirty && currentLocation.pathname !== nextLocation.pathname) {
      return message;
    }
  });
}
