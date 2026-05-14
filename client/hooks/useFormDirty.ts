/**
 * useFormDirty — Detecta si un formulario tiene cambios sin guardar
 * Compara el estado actual con el estado original
 */

import { useEffect, useState } from "react";

export function useFormDirty<T extends Record<string, any>>(
  original: T,
  current: T
): boolean {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Deep comparison (simple version for forms)
    const isDifferent =
      JSON.stringify(original) !== JSON.stringify(current);
    setIsDirty(isDifferent);
  }, [original, current]);

  return isDirty;
}
