/**
 * Decodificador de polilíneas codificadas de Google Maps.
 * Implementación del algoritmo de codificación de polilíneas de Google.
 *
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Decodifica una polilínea codificada de Google Maps a una lista de coordenadas lat/lng.
 * @param encoded - Cadena de polilínea codificada
 * @returns Array de coordenadas {lat, lng}
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    // Decodificar latitud
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    // Decodificar longitud
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Calcula el bounding box (caja delimitadora) de una lista de puntos.
 * Se usa para construir la consulta a Overpass API.
 */
export function getBoundingBox(points: LatLng[]): {
  south: number;
  west: number;
  north: number;
  east: number;
} {
  if (points.length === 0) {
    return { south: 0, west: 0, north: 0, east: 0 };
  }
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  // Añadir un pequeño buffer para capturar vías adyacentes
  const buffer = 0.01; // ~1 km
  return {
    south: minLat - buffer,
    west: minLng - buffer,
    north: maxLat + buffer,
    east: maxLng + buffer,
  };
}
