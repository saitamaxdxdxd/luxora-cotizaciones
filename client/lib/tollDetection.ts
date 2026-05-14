/**
 * Detección de Peajes — estrategia en dos fases:
 *
 * FASE 1 (inmediata, <0ms): Estimación basada en distancia.
 *   Porcentajes calibrados para autopistas federales de México donde la mayoría
 *   de rutas largas circulan por carreteras de cuota (Autopista del Sol, etc.).
 *
 * FASE 2 (async): Refinamiento con OSM Overpass API.
 *   Usa consultas "around" sobre puntos muestreados de la ruta para evitar el
 *   problema del bounding box grande. Desduplicadas por ID de vía.
 */

import { decodePolyline, type LatLng } from "./polylineDecoder";
import { haversineDistanceKm } from "./geolocation";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface TollDetectionResult {
  tollKmOneWay: number;
  tollWaysCount: number;
  /** true = estimación basada en distancia, false = dato de OSM */
  usedFallback: boolean;
  fallbackReason?: string;
}

// ─── FASE 1: Estimación inmediata ─────────────────────────────────────────────

/**
 * Estima los km de peaje de forma síncrona basándose en la distancia.
 *
 * Calibrado para carreteras federales de México:
 *  - Rutas cortas (<50 km):   ~20% — trayectos urbanos/suburbanos
 *  - Rutas medias (50-150):   ~45% — mezcla libre + cuota
 *  - Rutas largas (150-300):  ~62% — mayoría en autopistas de cuota
 *  - Rutas muy largas (>300): ~68% — casi todo en autopistas federales
 *
 * Ejemplos reales:
 *   CDMX → Acapulco  420 km → ~262 km cuota (63%)
 *   CDMX → Querétaro 220 km → ~200 km cuota (91%)
 *   CDMX → Guadalajara 540 km → ~400 km cuota (74%)
 */
export function estimateTollKm(distanceOneWayKm: number): number {
  if (distanceOneWayKm <= 0) return 0;
  const ratio =
    distanceOneWayKm > 300 ? 0.68
    : distanceOneWayKm > 150 ? 0.62
    : distanceOneWayKm > 50  ? 0.45
    : 0.20;
  return Math.round(distanceOneWayKm * ratio * 10) / 10;
}

// ─── FASE 2: Refinamiento con OSM Overpass (background) ─────────────────────

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const OVERPASS_TIMEOUT_MS = 20_000;
/** Puntos muestreados de la polilínea para la consulta around */
const SAMPLE_POINTS = 30;
/** Radio en metros alrededor de cada punto para buscar vías de cuota */
const AROUND_RADIUS_M = 500;

function calcWayLengthKm(geometry: { lat: number; lon: number }[]): number {
  let total = 0;
  for (let i = 1; i < geometry.length; i++) {
    total += haversineDistanceKm(
      geometry[i - 1].lat, geometry[i - 1].lon,
      geometry[i].lat, geometry[i].lon
    );
  }
  return total;
}

/**
 * Consulta OSM Overpass API usando consultas "around" sobre puntos de la ruta.
 * Más preciso que el bounding box: solo encuentra vías de cuota dentro de
 * AROUND_RADIUS_M metros del trazado real de la ruta.
 */
export async function refineTollsWithOSM(
  encodedPolylineRaw: string | any,
  distanceOneWayKm: number
): Promise<TollDetectionResult | null> {
  try {
    // Normalizar polilínea (string o {points: string})
    const encoded: string =
      typeof encodedPolylineRaw === "string"
        ? encodedPolylineRaw
        : encodedPolylineRaw?.points ?? "";

    if (!encoded || encoded.length < 10) return null;

    const routePoints = decodePolyline(encoded);
    if (routePoints.length < 2) return null;

    // Muestrear hasta SAMPLE_POINTS puntos distribuidos a lo largo de la ruta
    const step = Math.max(1, Math.floor(routePoints.length / SAMPLE_POINTS));
    const sampled: LatLng[] = routePoints.filter((_, i) => i % step === 0).slice(0, SAMPLE_POINTS);

    // Asegurar que el último punto también esté incluido
    const last = routePoints[routePoints.length - 1];
    if (sampled[sampled.length - 1] !== last) sampled.push(last);

    // Construir cláusulas "around" para toll=yes y fee=yes
    const tollAround = sampled.map(p =>
      `  way(around:${AROUND_RADIUS_M},${p.lat.toFixed(5)},${p.lng.toFixed(5)})["toll"="yes"]["highway"];`
    );
    const feeAround = sampled.map(p =>
      `  way(around:${AROUND_RADIUS_M},${p.lat.toFixed(5)},${p.lng.toFixed(5)})["fee"="yes"]["highway"];`
    );

    const query = [
      "[out:json][timeout:25];",
      "(",
      ...tollAround,
      ...feeAround,
      ");",
      "out geom;",
    ].join("\n");

    let data: any = null;
    for (const url of OVERPASS_MIRRORS) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), OVERPASS_TIMEOUT_MS);
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (resp.ok) { data = await resp.json(); break; }
      } catch { /* siguiente mirror */ }
    }

    if (!data?.elements?.length) return null;

    // Desduplicar por ID de vía para no contar el mismo tramo dos veces
    const seenIds = new Set<number>();
    let totalKm = 0;
    let count = 0;

    for (const way of data.elements) {
      if (!way.geometry || way.geometry.length < 2) continue;
      if (seenIds.has(way.id)) continue;
      seenIds.add(way.id);
      totalKm += calcWayLengthKm(way.geometry);
      count++;
    }

    if (totalKm < 1 || count === 0) return null;

    // Sanity check: los km de peaje no deben exceder la distancia total de la ruta
    const cappedKm = Math.min(totalKm, distanceOneWayKm * 0.95);

    return {
      tollKmOneWay: Math.round(cappedKm * 10) / 10,
      tollWaysCount: count,
      usedFallback: false,
    };
  } catch (err) {
    console.warn("[LUXORA] OSM refinement failed:", err);
    return null;
  }
}
