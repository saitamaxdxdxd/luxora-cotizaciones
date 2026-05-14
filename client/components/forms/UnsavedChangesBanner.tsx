/**
 * UnsavedChangesBanner — Banner de advertencia para cambios sin guardar
 * Se muestra fijo en la parte inferior cuando hay cambios sin guardar
 */

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnsavedChangesBannerProps {
  isDirty: boolean;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export function UnsavedChangesBanner({
  isDirty,
  onDismiss,
  showDismiss = true,
}: UnsavedChangesBannerProps) {
  if (!isDirty) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-amber-500/10 border-t border-amber-500/30 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        isDirty ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-100 font-medium">
            Tienes cambios sin guardar. No olvides guardar tu información
            antes de salir.
          </p>
        </div>
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors p-1"
            title="Descartar advertencia"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
