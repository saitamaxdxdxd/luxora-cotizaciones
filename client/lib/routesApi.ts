/**
 * Google Routes API v2 — Ruta con paradas intermedias + regreso separado.
 *
 * Estrategia de cálculo:
 *  1. Ruta de IDA: Origin → [Paradas] → Destino (con waypoints)
 *  2. Ruta de REGRESO: Destino → Origin (cálculo separado, no solo × 2)
 *  3. Sugerencia: si hay paradas, verificar si un orden diferente ahorra distancia
 *
 * Resultado: distancias y casetas correctas para ida y regreso por separado.
 */

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

const FIELD_MASK = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.legs.distanceMeters",
  "routes.legs.duration",
  "routes.polyline.encodedPolyline",
  "routes.travelAdvisory.tollInfo",
  "routes.optimizedIntermediateWaypointIndex",
].join(",");

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteWaypoint {
  latLng: LatLng;
  label: string; // para mostrar en UI
}

/** Un tramo de la ruta (leg) */
export interface RouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationText: string;
  tollCostMXN: number | null;
}

/** Resultado completo: ida + regreso */
export interface FullRouteResult {
  // Ida: Origin → [paradas] → Destino
  outboundLegs: RouteLeg[];
  outboundDistanceKm: number;
  outboundDurationText: string;
  outboundTollCostMXN: number | null;

  // Regreso: Destino → Origin (calculado por separado)
  returnLeg: RouteLeg;
  returnDistanceKm: number;
  returnDurationText: string;
  returnTollCostMXN: number | null;

  // Totales combinados
  totalDistanceKm: number;
  totalTollCostMXN: number | null;
  tollSource: "google" | "estimation";

  // Sugerencia de optimización (si hay paradas intermedias)
  suggestion?: {
    message: string;
    suggestedLabels: string[]; // orden sugerido de las paradas
    savingKm: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDuration(durationStr: string): string {
  const seconds = parseInt((durationStr ?? "0").replace("s", ""), 10);
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function extractTollMXN(tollInfo: any): number | null {
  if (!tollInfo?.estimatedPrice?.length) return null;
  for (const price of tollInfo.estimatedPrice) {
    if (price.currencyCode === "MXN") {
      const total = parseFloat(price.units ?? "0") + (price.nanos ?? 0) / 1e9;
      return total > 0 ? total : null;
    }
  }
  return null;
}

async function callRoutesAPI(body: object, apiKey: string): Promise<any | null> {
  try {
    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.warn("[LUXORA] Routes API error:", resp.status);
      return null;
    }
    const data = await resp.json();
    if (data.error) { console.warn("[LUXORA] Routes API error:", data.error); return null; }
    return data;
  } catch (err) {
    console.error("[LUXORA] Routes API fetch failed:", err);
    return null;
  }
}

function makeLocation(ll: LatLng) {
  return { location: { latLng: { latitude: ll.lat, longitude: ll.lng } } };
}

const ROUTE_MODIFIERS = { avoidTolls: false, avoidHighways: false, avoidFerries: true };

// ─── Función principal ───────────────────────────────────────────────────────

/**
 * Calcula la ruta completa (ida + regreso) con paradas opcionales.
 * La ruta de regreso siempre va del último punto de la ida al origen.
 *
 * @param origin        Punto de origen (base)
 * @param stops         Paradas intermedias (puede ser vacío)
 * @param destination   Destino final
 * @param apiKey        Google Maps API key
 */
export async function computeFullRoute(
  origin: RouteWaypoint,
  stops: RouteWaypoint[],
  destination: RouteWaypoint,
  apiKey: string
): Promise<FullRouteResult | null> {
  // ── Construir nodos en orden: origin, stops[], destination ────────────────
  const allNodes: RouteWaypoint[] = [origin, ...stops, destination];

  // ── 1. Ruta de IDA ────────────────────────────────────────────────────────
  const outboundBody: any = {
    origin: makeLocation(origin.latLng),
    destination: makeLocation(destination.latLng),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    extraComputations: ["TOLLS"],
    routeModifiers: ROUTE_MODIFIERS,
  };

  if (stops.length > 0) {
    outboundBody.intermediates = stops.map((s) => makeLocation(s.latLng));
  }

  // ── 2. Ruta de REGRESO (destino → origen, siempre directa) ───────────────
  const returnBody = {
    origin: makeLocation(destination.latLng),
    destination: makeLocation(origin.latLng),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    extraComputations: ["TOLLS"],
    routeModifiers: ROUTE_MODIFIERS,
  };

  // ── 3. Si hay paradas, calcular orden óptimo para sugerencia ─────────────
  let optimizeBody: any = null;
  if (stops.length > 1) {
    optimizeBody = {
      ...outboundBody,
      optimizeWaypointOrder: true,
    };
  }

  // Llamadas en paralelo
  const [outboundData, returnData, optimizeData] = await Promise.all([
    callRoutesAPI(outboundBody, apiKey),
    callRoutesAPI(returnBody, apiKey),
    optimizeBody ? callRoutesAPI(optimizeBody, apiKey) : Promise.resolve(null),
  ]);

  if (!outboundData?.routes?.[0] || !returnData?.routes?.[0]) return null;

  const outRoute = outboundData.routes[0];
  const retRoute = returnData.routes[0];

  // ── Procesar IDA ──────────────────────────────────────────────────────────
  const outLegs = (outRoute.legs ?? []) as any[];
  const outboundLegs: RouteLeg[] = outLegs.map((leg: any, i: number) => ({
    from: allNodes[i]?.label ?? "—",
    to: allNodes[i + 1]?.label ?? "—",
    distanceKm: (leg.distanceMeters ?? 0) / 1000,
    durationText: parseDuration(leg.duration ?? "0s"),
    tollCostMXN: null, // Google solo da total de casetas por ruta, no por tramo
  }));

  const outboundDistanceKm = (outRoute.distanceMeters ?? 0) / 1000;
  const outboundDurationText = parseDuration(outRoute.duration ?? "0s");
  const outboundTollCostMXN = extractTollMXN(outRoute.travelAdvisory?.tollInfo);

  // Si hay un solo leg (sin paradas), asignarle el peaje total
  if (outboundLegs.length === 1 && outboundTollCostMXN !== null) {
    outboundLegs[0].tollCostMXN = outboundTollCostMXN;
  }

  // ── Procesar REGRESO ──────────────────────────────────────────────────────
  const returnDistanceKm = (retRoute.distanceMeters ?? 0) / 1000;
  const returnDurationText = parseDuration(retRoute.duration ?? "0s");
  const returnTollCostMXN = extractTollMXN(retRoute.travelAdvisory?.tollInfo);

  const returnLeg: RouteLeg = {
    from: destination.label,
    to: origin.label,
    distanceKm: returnDistanceKm,
    durationText: returnDurationText,
    tollCostMXN: returnTollCostMXN,
  };

  // ── Totales ───────────────────────────────────────────────────────────────
  const totalDistanceKm = outboundDistanceKm + returnDistanceKm;

  // Cálculo de peajes totales (ida + regreso)
  // Si ambas direcciones tienen datos: sumarlas
  // Si solo ida tiene datos: usar ida × 2 (asume peajes similares en ambas direcciones)
  // Si ninguna tiene datos: null (usar estimación)
  const totalTollCostMXN =
    outboundTollCostMXN !== null && returnTollCostMXN !== null
      ? outboundTollCostMXN + returnTollCostMXN
      : outboundTollCostMXN !== null
      ? outboundTollCostMXN * 2 // ← FIX: Si solo IDA tiene datos, duplicar (viaje redondo)
      : returnTollCostMXN !== null
      ? returnTollCostMXN * 2 // Si solo REGRESO tiene datos, duplicar
      : null;

  const tollSource: "google" | "estimation" =
    totalTollCostMXN !== null ? "google" : "estimation";

  // ── Sugerencia de optimización ────────────────────────────────────────────
  let suggestion: FullRouteResult["suggestion"] | undefined;

  if (optimizeData?.routes?.[0]) {
    const optRoute = optimizeData.routes[0];
    const optDistKm = (optRoute.distanceMeters ?? 0) / 1000;
    const optOrder: number[] = optRoute.optimizedIntermediateWaypointIndex ?? [];

    // ¿El orden óptimo es diferente al actual (0,1,2,...)?
    const isCurrentOrder = optOrder.every((v, i) => v === i);
    const savingKm = outboundDistanceKm - optDistKm;

    if (!isCurrentOrder && savingKm > 2) {
      // Construir lista de labels en el orden sugerido
      const suggestedLabels = optOrder.map((i) => stops[i]?.label ?? `Parada ${i + 1}`);
      suggestion = {
        message: `Reorganizar las paradas en este orden podría ahorrar ${savingKm.toFixed(1)} km en el trayecto de ida.`,
        suggestedLabels,
        savingKm,
      };
    }
  }

  return {
    outboundLegs,
    outboundDistanceKm,
    outboundDurationText,
    outboundTollCostMXN,
    returnLeg,
    returnDistanceKm,
    returnDurationText,
    returnTollCostMXN,
    totalDistanceKm,
    totalTollCostMXN,
    tollSource,
    suggestion,
  };
}
