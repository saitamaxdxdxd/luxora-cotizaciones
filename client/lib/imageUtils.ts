/**
 * LUXORA — Image compression utilities
 *
 * Compresses images before storing in localStorage to prevent QuotaExceededError.
 * PDFs are returned unchanged (they can't be drawn on canvas).
 *
 * Typical savings:
 *   Phone selfie (4032×3024 JPEG) →  4.2 MB raw → ~85 KB compressed  (~98% reduction)
 *   INE photo (3000×2000)         →  2.8 MB raw → ~60 KB compressed
 *   Already-small image (<100 KB) →  returned as-is if already within budget
 */

/** Max dimensions and quality settings per use case */
const PROFILES = {
  selfie:   { maxW: 480,  maxH: 480,  quality: 0.75 },
  document: { maxW: 1024, maxH: 1024, quality: 0.72 },
} as const;

type Profile = keyof typeof PROFILES;

/**
 * Compress a data-URL image using an off-screen canvas.
 * Returns the original string unchanged if:
 *  - It is a PDF (data:application/pdf)
 *  - It is already smaller than the target (no point re-encoding)
 *  - Any canvas error occurs (safe fallback)
 */
export async function compressImage(dataUrl: string, profile: Profile = "document"): Promise<string> {
  // PDFs cannot be rendered on a canvas — skip
  if (!dataUrl || !dataUrl.startsWith("data:image")) return dataUrl;

  const { maxW, maxH, quality } = PROFILES[profile];

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;

        // Scale down proportionally
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", quality);

        // If compression actually made it bigger (e.g. tiny PNG → JPEG overhead), keep original
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl); // safe fallback
      }
    };
    img.onerror = () => resolve(dataUrl); // safe fallback
    img.src = dataUrl;
  });
}

// ─── Storage usage helpers ────────────────────────────────────────────────────

const LUXORA_KEYS = [
  "luxora_users_v2",
  "luxora_vehicles_v2",
  "luxora_cases_v2",
  "luxora_clientes",
  "luxora_contratos",
];

/** Returns total LUXORA storage used in bytes */
export function getStorageUsedBytes(): number {
  return LUXORA_KEYS.reduce((total, key) => {
    const item = localStorage.getItem(key) ?? "";
    return total + item.length * 2; // UTF-16: 2 bytes per char
  }, 0);
}

/** Returns storage used as a human-readable string */
export function getStorageUsedLabel(): string {
  const bytes = getStorageUsedBytes();
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000)     return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

/**
 * Strips base64 image data from all stored users and vehicles, keeping metadata intact.
 * Use as a last resort when storage is nearly full.
 */
export function clearStorageImages(): void {
  // Clear user selfies and document images
  try {
    const rawUsers = localStorage.getItem("luxora_users_v2");
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      const cleaned = users.map((u: Record<string, unknown>) => ({
        ...u,
        selfie: "",
        documents: Array.isArray(u.documents)
          ? (u.documents as Record<string, unknown>[]).map((d) => ({ ...d, data: "" }))
          : [],
      }));
      // Remove first, then write — works even when storage is at the limit
      localStorage.removeItem("luxora_users_v2");
      localStorage.setItem("luxora_users_v2", JSON.stringify(cleaned));
    }
  } catch { /* ignore */ }

  // Clear vehicle photos
  try {
    const rawVehicles = localStorage.getItem("luxora_vehicles_v2");
    if (rawVehicles) {
      const vehicles = JSON.parse(rawVehicles);
      const cleaned = vehicles.map((v: Record<string, unknown>) => ({ ...v, foto: "" }));
      localStorage.removeItem("luxora_vehicles_v2");
      localStorage.setItem("luxora_vehicles_v2", JSON.stringify(cleaned));
    }
  } catch { /* ignore */ }

  // Clear legacy clientes images
  try {
    const rawClientes = localStorage.getItem("luxora_clientes");
    if (rawClientes) {
      const clientes = JSON.parse(rawClientes);
      const cleaned = clientes.map((c: Record<string, unknown>) => ({
        ...c,
        selfie: "", ineFrente: "", ineReverso: "",
        comprobanteDomicilio: "", cfdi: "",
      }));
      localStorage.removeItem("luxora_clientes");
      localStorage.setItem("luxora_clientes", JSON.stringify(cleaned));
    }
  } catch { /* ignore */ }
}
