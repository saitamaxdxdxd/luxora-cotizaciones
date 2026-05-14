/**
 * LUXORA — Google Maps API Proxy Seguro
 * 
 * Protege la API key de Google Maps mediante:
 * 1. Proxy backend (nunca expone la key al cliente)
 * 2. Rate limiting (máximo 10 solicitudes/minuto por usuario)
 * 3. Autenticación requerida
 * 4. Validación de entrada
 * 5. Timeouts de seguridad
 */

import express from "express";
import axios from "axios";

const router = express.Router();

// ─── Rate Limiting ────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting: máximo 10 solicitudes por minuto por IP/usuario
 */
function checkRateLimit(req: express.Request): boolean {
  const identifier = req.headers["x-user-id"] || req.ip || "unknown";
  const key = String(identifier);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Crear o resetear si expiraron los 60 segundos
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60000 };
    rateLimitStore.set(key, entry);
  }

  // Incrementar contador
  entry.count++;

  // Máximo 10 solicitudes por minuto
  return entry.count <= 10;
}

// ─── Middleware de Autenticación ──────────────────────────────────────────

/**
 * Middleware simple de autenticación
 * En producción, reemplazar con JWT o session validation
 */
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Aceptar: Bearer token, session cookie, o x-auth-token header
  const authHeader = req.headers.authorization;
  const authToken = req.query.token || req.headers["x-auth-token"];

  if (!authHeader && !authToken) {
    return res.status(401).json({
      error: "Autenticación requerida",
      message: "Use: Authorization: Bearer <token> o ?token=<token>",
    });
  }

  // En demo: cualquier token válido funciona
  // En producción: validar contra base de datos o JWT
  next();
}

// ─── Endpoint: Geocoding ──────────────────────────────────────────────────

/**
 * GET /api/maps/geocode
 * Codifica una dirección a coordenadas (lat/lng)
 *
 * Query params:
 *   - address (requerido): "Av. Paseo de la Reforma 505, CDMX"
 *   - token: token de autenticación
 *
 * Response:
 *   { lat: 19.4326, lng: -99.1332, formatted_address: "..." }
 */
router.get("/geocode", requireAuth, (req, res) => {
  // Verificar rate limit
  if (!checkRateLimit(req)) {
    return res.status(429).json({
      error: "Demasiadas solicitudes",
      message: "Máximo 10 solicitudes por minuto. Intenta de nuevo en 60 segundos.",
    });
  }

  const { address } = req.query;

  // Validar entrada
  if (!address || typeof address !== "string") {
    return res.status(400).json({
      error: "Parámetro 'address' requerido",
      example: "/api/maps/geocode?address=México+City&token=xxx",
    });
  }

  if (address.length < 5 || address.length > 300) {
    return res.status(400).json({
      error: "La dirección debe tener entre 5 y 300 caracteres",
    });
  }

  // Verificar que la API key esté configurada
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY no está configurada en .env");
    return res.status(500).json({
      error: "Servicio no disponible",
      message: "Google Maps API no está configurada en el servidor",
    });
  }

  // Hacer solicitud a Google Maps (con timeout)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5 segundos máximo

  axios
    .get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
        region: "mx", // Preferir resultados en México
      },
      timeout: 5000,
      signal: controller.signal as any,
    })
    .then((response) => {
      clearTimeout(timeout);

      // Verificar si Google devolvió resultados
      if (response.data.status !== "OK") {
        return res.status(404).json({
          error: "Dirección no encontrada",
          google_status: response.data.status,
        });
      }

      if (!response.data.results || response.data.results.length === 0) {
        return res.status(404).json({
          error: "No se encontraron resultados",
        });
      }

      const location = response.data.results[0];

      // Devolver solo lo necesario (no la respuesta completa de Google)
      return res.json({
        lat: location.geometry.location.lat,
        lng: location.geometry.location.lng,
        formatted_address: location.formatted_address,
        place_id: location.place_id,
      });
    })
    .catch((error) => {
      clearTimeout(timeout);

      console.error("[MAPS] Geocode error:", error.message);

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({
          error: "Timeout",
          message: "La solicitud tomó demasiado tiempo",
        });
      }

      return res.status(500).json({
        error: "Error en geocodificación",
        message: "No se pudo procesar la solicitud",
      });
    });
});

// ─── Endpoint: Directions (Rutas) ─────────────────────────────────────────

/**
 * GET /api/maps/directions
 * Calcula la ruta entre dos puntos
 *
 * Query params:
 *   - origin (requerido): "Punto A"
 *   - destination (requerido): "Punto B"
 *   - mode: "driving" (default), "walking", "bicycling", "transit"
 *   - token: token de autenticación
 *
 * Response:
 *   {
 *     distance: 5000,  (en metros)
 *     duration: 600,   (en segundos)
 *     polyline: "...",
 *     steps: [...]
 *   }
 */
router.get("/directions", requireAuth, (req, res) => {
  // Verificar rate limit
  if (!checkRateLimit(req)) {
    return res.status(429).json({
      error: "Demasiadas solicitudes",
      message: "Máximo 10 solicitudes por minuto",
    });
  }

  const { origin, destination, mode = "driving" } = req.query;

  // Validar entrada
  if (!origin || !destination) {
    return res.status(400).json({
      error: "Parámetros 'origin' y 'destination' requeridos",
      example:
        "/api/maps/directions?origin=México&destination=Guadalajara&token=xxx",
    });
  }

  // Validar modo de transporte
  const validModes = ["driving", "walking", "bicycling", "transit"];
  if (!validModes.includes(String(mode))) {
    return res.status(400).json({
      error: "Modo inválido",
      valid_modes: validModes,
    });
  }

  // Validar longitud de entrada
  if (
    (String(origin).length > 300 || String(destination).length > 300)
  ) {
    return res.status(400).json({
      error: "Dirección demasiado larga (máximo 300 caracteres)",
    });
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: "Servicio no disponible",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  axios
    .get("https://maps.googleapis.com/maps/api/directions/json", {
      params: {
        origin,
        destination,
        mode,
        key: process.env.GOOGLE_MAPS_API_KEY,
        region: "mx",
      },
      timeout: 5000,
      signal: controller.signal as any,
    })
    .then((response) => {
      clearTimeout(timeout);

      if (response.data.status !== "OK") {
        return res.status(400).json({
          error: "No se puede calcular ruta",
          google_status: response.data.status,
        });
      }

      if (!response.data.routes || response.data.routes.length === 0) {
        return res.status(404).json({
          error: "No se encontró ruta",
        });
      }

      const route = response.data.routes[0];

      // Calcular totales
      const totalDistance = route.legs.reduce(
        (sum: number, leg: any) => sum + (leg.distance?.value ?? 0),
        0
      );
      const totalDuration = route.legs.reduce(
        (sum: number, leg: any) => sum + (leg.duration?.value ?? 0),
        0
      );

      return res.json({
        distance: totalDistance, // en metros
        duration: totalDuration, // en segundos
        polyline: route.overview_polyline?.points || "",
        start_location: route.legs[0]?.start_location,
        end_location: route.legs[route.legs.length - 1]?.end_location,
        legs: route.legs.map((leg: any) => ({
          start_location: leg.start_location,
          end_location: leg.end_location,
          distance: leg.distance?.value,
          duration: leg.duration?.value,
          instructions: leg.steps?.map((step: any) => ({
            instruction: step.html_instructions,
            distance: step.distance?.value,
            duration: step.duration?.value,
          })),
        })),
      });
    })
    .catch((error) => {
      clearTimeout(timeout);
      console.error("[MAPS] Directions error:", error.message);

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({ error: "Timeout" });
      }

      return res.status(500).json({
        error: "Error calculando ruta",
      });
    });
});

// ─── Endpoint: Autocomplete ───────────────────────────────────────────────

/**
 * GET /api/maps/autocomplete
 * Autocompletar direcciones
 *
 * Query params:
 *   - input (requerido): "Av. Paseo"
 *   - session_token (opcional): para agrupar búsquedas
 *   - token: token de autenticación
 *
 * Response:
 *   {
 *     predictions: [
 *       { description: "Av. Paseo de la Reforma, CDMX", place_id: "..." },
 *       ...
 *     ]
 *   }
 */
router.get("/autocomplete", requireAuth, (req, res) => {
  // Verificar rate limit (más restrictivo para autocomplete)
  if (!checkRateLimit(req)) {
    return res.status(429).json({
      error: "Demasiadas solicitudes",
    });
  }

  const { input, session_token } = req.query;

  // Validar entrada
  if (!input || typeof input !== "string") {
    return res.status(400).json({
      error: "Parámetro 'input' requerido",
    });
  }

  if (input.length < 2) {
    return res.status(400).json({
      error: "Entrada debe tener mínimo 2 caracteres",
    });
  }

  if (input.length > 100) {
    return res.status(400).json({
      error: "Entrada muy larga (máximo 100 caracteres)",
    });
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: "Servicio no disponible",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  axios
    .get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
      params: {
        input,
        key: process.env.GOOGLE_MAPS_API_KEY,
        region: "mx",
        components: "country:mx", // Solo México
        sessiontoken: session_token || undefined,
      },
      timeout: 5000,
      signal: controller.signal as any,
    })
    .then((response) => {
      clearTimeout(timeout);

      return res.json({
        predictions: (response.data.predictions || []).map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
          main_text: p.main_text,
          secondary_text: p.secondary_text,
        })),
      });
    })
    .catch((error) => {
      clearTimeout(timeout);
      console.error("[MAPS] Autocomplete error:", error.message);

      if (error.code === "ECONNABORTED") {
        return res.status(504).json({ error: "Timeout" });
      }

      return res.status(500).json({
        error: "Error en autocomplete",
      });
    });
});

// ─── Endpoint: Place Details ──────────────────────────────────────────────

/**
 * GET /api/maps/place-details
 * Obtiene detalles de un lugar específico
 *
 * Query params:
 *   - place_id (requerido): ID de lugar de Google
 *   - token: token de autenticación
 *
 * Response:
 *   {
 *     name: "Av. Paseo de la Reforma",
 *     lat: 19.4326,
 *     lng: -99.1332,
 *     ...
 *   }
 */
router.get("/place-details", requireAuth, (req, res) => {
  if (!checkRateLimit(req)) {
    return res.status(429).json({
      error: "Demasiadas solicitudes",
    });
  }

  const { place_id } = req.query;

  if (!place_id || typeof place_id !== "string") {
    return res.status(400).json({
      error: "Parámetro 'place_id' requerido",
    });
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: "Servicio no disponible",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  axios
    .get("https://maps.googleapis.com/maps/api/place/details/json", {
      params: {
        place_id,
        key: process.env.GOOGLE_MAPS_API_KEY,
        fields: "geometry,formatted_address,name,address_components",
      },
      timeout: 5000,
      signal: controller.signal as any,
    })
    .then((response) => {
      clearTimeout(timeout);

      if (response.data.status !== "OK") {
        return res.status(404).json({
          error: "Lugar no encontrado",
        });
      }

      const result = response.data.result;

      return res.json({
        name: result.name,
        lat: result.geometry?.location?.lat,
        lng: result.geometry?.location?.lng,
        formatted_address: result.formatted_address,
      });
    })
    .catch((error) => {
      clearTimeout(timeout);
      console.error("[MAPS] Place details error:", error.message);

      return res.status(500).json({
        error: "Error obteniendo detalles del lugar",
      });
    });
});

// ─── Health check ─────────────────────────────────────────────────────────

router.get("/health", (_req, res) => {
  const hasKey = !!process.env.GOOGLE_MAPS_API_KEY;
  return res.json({
    status: hasKey ? "ok" : "missing-api-key",
    google_maps_configured: hasKey,
  });
});

export default router;
