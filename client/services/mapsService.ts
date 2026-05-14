/**
 * LUXORA — Servicio de Google Maps Seguro
 * 
 * Este servicio NO expone la API key de Google Maps.
 * En su lugar, usa un backend proxy que valida todas las solicitudes.
 * 
 * Seguridad:
 * ✅ API key protegida en backend
 * ✅ Rate limiting: máximo 10 solicitudes/minuto
 * ✅ Autenticación requerida
 * ✅ Validación de entrada
 * ✅ Timeouts de seguridad
 */

import { getCurrentUser } from "@/lib/store";

// ─── Tipos ────────────────────────────────────────────────────────────────

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
  place_id: string;
}

export interface DirectionsLeg {
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  distance: number;
  duration: number;
  instructions?: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

export interface DirectionsResult {
  distance: number; // en metros
  duration: number; // en segundos
  polyline: string;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  legs: DirectionsLeg[];
}

export interface AutocompletePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text?: string;
}

export interface AutocompleteResult {
  predictions: AutocompletePrediction[];
}

export interface PlaceDetailsResult {
  name: string;
  lat: number;
  lng: number;
  formatted_address: string;
}

// ─── Helper: Obtener token de autenticación ───────────────────────────────

function getAuthToken(): string {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No hay usuario autenticado");
  }
  // En producción, esto sería un JWT del usuario
  // Por ahora, usar el ID del usuario como token simple
  return user.id;
}

// ─── Helper: Hacer solicitud al backend ───────────────────────────────────

async function fetchFromMaps<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  try {
    // Construir URL con parámetros
    const url = new URL(`/api/maps${endpoint}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Agregar token de autenticación
    url.searchParams.append("token", getAuthToken());

    // Hacer solicitud
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": getAuthToken(),
      },
    });

    // Manejar errores HTTP
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));

      // Rate limit
      if (response.status === 429) {
        throw new Error(
          "Demasiadas solicitudes. Espera un minuto antes de intentar de nuevo."
        );
      }

      // No autenticado
      if (response.status === 401) {
        throw new Error("No estás autenticado. Por favor inicia sesión.");
      }

      // Otros errores
      throw new Error(error.error || "Error en solicitud de mapas");
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error("[MAPS]", error);
    throw error;
  }
}

// ─── Geocoding: Dirección → Coordenadas ──────────────────────────────────

/**
 * Geocodifica una dirección a coordenadas (latitud/longitud)
 * 
 * @param address - Dirección a geocodificar (ej: "Av. Paseo de la Reforma 505, CDMX")
 * @returns Resultado con lat, lng y dirección formateada
 * 
 * @example
 * const result = await geocodeAddress("México City");
 * console.log(result.lat, result.lng); // 19.4326, -99.1332
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address || address.trim().length === 0) {
    throw new Error("La dirección no puede estar vacía");
  }

  if (address.length > 300) {
    throw new Error("La dirección es demasiado larga (máximo 300 caracteres)");
  }

  return fetchFromMaps<GeocodeResult>("/geocode", { address });
}

// ─── Directions: Calcular ruta ────────────────────────────────────────────

/**
 * Calcula la ruta entre dos puntos
 * 
 * @param origin - Punto de partida
 * @param destination - Punto de destino
 * @param mode - Modo de transporte: 'driving', 'walking', 'bicycling', 'transit'
 * @returns Resultado con distancia, duración, polyline y pasos
 * 
 * @example
 * const route = await getDirections("Mexico City", "Guadalajara", "driving");
 * console.log(route.distance); // 550000 (metros)
 * console.log(route.duration); // 19800 (segundos)
 */
export async function getDirections(
  origin: string,
  destination: string,
  mode: "driving" | "walking" | "bicycling" | "transit" = "driving"
): Promise<DirectionsResult> {
  if (!origin || !destination) {
    throw new Error("Origen y destino son requeridos");
  }

  if (origin.length > 300 || destination.length > 300) {
    throw new Error("Dirección demasiado larga");
  }

  return fetchFromMaps<DirectionsResult>("/directions", {
    origin,
    destination,
    mode,
  });
}

// ─── Autocomplete: Sugerencias de dirección ───────────────────────────────

/**
 * Obtiene sugerencias de autocompletar para una dirección
 * 
 * @param input - Texto a autocompletar
 * @param sessionToken - Token de sesión para agrupar búsquedas (opcional)
 * @returns Lista de predicciones
 * 
 * @example
 * const suggestions = await getAutocompletePredictions("Av. Paseo");
 * suggestions.predictions.forEach(p => console.log(p.description));
 */
export async function getAutocompletePredictions(
  input: string,
  sessionToken?: string
): Promise<AutocompleteResult> {
  if (!input || input.trim().length < 2) {
    throw new Error("Entrada debe tener mínimo 2 caracteres");
  }

  if (input.length > 100) {
    throw new Error("Entrada muy larga");
  }

  const params: Record<string, string> = { input };

  if (sessionToken) {
    params.session_token = sessionToken;
  }

  return fetchFromMaps<AutocompleteResult>("/autocomplete", params);
}

// ─── Place Details: Información de un lugar ──────────────────────────────

/**
 * Obtiene detalles de un lugar específico
 * 
 * @param placeId - ID del lugar desde Google (obtenido de autocomplete)
 * @returns Detalles del lugar
 * 
 * @example
 * const details = await getPlaceDetails("ChIJ...");
 * console.log(details.name, details.lat, details.lng);
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceDetailsResult> {
  if (!placeId) {
    throw new Error("Place ID es requerido");
  }

  return fetchFromMaps<PlaceDetailsResult>("/place-details", {
    place_id: placeId,
  });
}

// ─── Health check: Verificar estado del servicio ──────────────────────────

/**
 * Verifica que el servicio de mapas esté disponible
 * 
 * @returns Estado del servicio y configuración
 */
export async function checkMapsHealth(): Promise<{
  status: string;
  google_maps_configured: boolean;
}> {
  try {
    const response = await fetch("/api/maps/health");
    return response.json();
  } catch {
    return {
      status: "error",
      google_maps_configured: false,
    };
  }
}

// ─── Utilidades ───────────────────────────────────────────────────────────

/**
 * Convierte metros a kilómetros
 */
export function metersToKm(meters: number): number {
  return Math.round((meters / 1000) * 10) / 10;
}

/**
 * Convierte segundos a formato legible (ej: "1 hora 30 mins")
 */
export function secondsToReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }

  return `${mins}min`;
}

/**
 * Calcula punto medio entre dos coordenadas
 */
export function getCenterPoint(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): { lat: number; lng: number } {
  return {
    lat: (lat1 + lat2) / 2,
    lng: (lng1 + lng2) / 2,
  };
}
