/**
 * Utilidades de Geolocalización para LUXORA Cotizador
 */

import { BASE_COORDS, BASE_RADIUS_KM } from "@/data/config";

/** Convierte grados a radianes */
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Calcula la distancia en kilómetros entre dos puntos usando la fórmula de Haversine.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verifica si un punto está dentro del radio permitido desde la base.
 */
export function isWithinBaseRadius(lat: number, lng: number): boolean {
  const dist = haversineDistanceKm(BASE_COORDS.lat, BASE_COORDS.lng, lat, lng);
  return dist <= BASE_RADIUS_KM;
}

/**
 * Calcula el LatLngBounds cuadrado aproximado para un radio en km desde un punto central.
 * Se usa para configurar el Autocomplete de Google Places con strictBounds.
 */
export function radiusToBounds(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): { north: number; south: number; east: number; west: number } {
  const latDelta = radiusKm / 111;
  const lngDelta =
    radiusKm / (111 * Math.cos(toRad(centerLat)));
  return {
    north: centerLat + latDelta,
    south: centerLat - latDelta,
    east: centerLng + lngDelta,
    west: centerLng - lngDelta,
  };
}

/** Bounds para el Autocomplete de origen (restringido a radio de la base) */
export const originBounds = radiusToBounds(
  BASE_COORDS.lat,
  BASE_COORDS.lng,
  BASE_RADIUS_KM
);
