/**
 * AddressSearchExample — Ejemplo de uso del servicio seguro de Google Maps
 * 
 * Demuestra cómo:
 * ✅ Buscar direcciones sin exponer API key
 * ✅ Manejar autocompletar
 * ✅ Obtener coordenadas
 * ✅ Calcular rutas
 * ✅ Gestionar errores y rate limiting
 */

import { useState } from "react";
import { Search, Loader2, AlertCircle, MapPin, Clock, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  geocodeAddress,
  getAutocompletePredictions,
  getPlaceDetails,
  getDirections,
  metersToKm,
  secondsToReadable,
} from "@/services/mapsService";

interface Location {
  address: string;
  lat: number;
  lng: number;
}

export function AddressSearchExample() {
  // Estado de búsqueda
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Ubicaciones seleccionadas
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);

  // Resultado de ruta
  const [route, setRoute] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Errores
  const [error, setError] = useState("");

  // ─── Autocompletar direcciones ────────────────────────────────────────

  const handleSearch = async (value: string) => {
    setSearchInput(value);
    setError("");

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      const result = await getAutocompletePredictions(value);
      setSuggestions(result.predictions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error en búsqueda";
      setError(message);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // ─── Seleccionar sugerencia ───────────────────────────────────────────

  const selectSuggestion = async (prediction: any) => {
    setError("");
    setIsSearching(true);

    try {
      // Obtener detalles completos (lat/lng) del lugar
      const details = await getPlaceDetails(prediction.place_id);

      const location: Location = {
        address: details.formatted_address,
        lat: details.lat,
        lng: details.lng,
      };

      // Alternar entre origen y destino
      if (!origin) {
        setOrigin(location);
      } else if (!destination) {
        setDestination(location);
      } else {
        // Si ambos están llenos, reemplazar destino
        setDestination(location);
        setRoute(null);
      }

      // Limpiar búsqueda
      setSearchInput("");
      setSuggestions([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al seleccionar";
      setError(message);
    } finally {
      setIsSearching(false);
    }
  };

  // ─── Calcular ruta ───────────────────────────────────────────────────

  const calculateRoute = async () => {
    if (!origin || !destination) {
      setError("Selecciona origen y destino");
      return;
    }

    setError("");
    setIsCalculating(true);

    try {
      const result = await getDirections(origin.address, destination.address);
      setRoute(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error calculando ruta";
      setError(message);
    } finally {
      setIsCalculating(false);
    }
  };

  // ─── Limpiar búsqueda ────────────────────────────────────────────────

  const clearLocations = () => {
    setOrigin(null);
    setDestination(null);
    setRoute(null);
    setSearchInput("");
    setSuggestions([]);
    setError("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Título */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          🗺️ Buscador de Direcciones Seguro
        </h2>
        <p className="text-sm text-muted-foreground">
          Tu API key de Google Maps está protegida en el servidor. Nunca se expone al navegador.
        </p>
      </div>

      {/* Campo de búsqueda */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Busca una dirección..."
            className={cn(
              "w-full pl-10 pr-4 py-3 rounded-lg border bg-[hsl(217,25%,10%)] text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:border-amber-500/50 transition-all",
              error ? "border-red-500/50" : "border-[hsl(217,25%,18%)]"
            )}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-3 w-5 h-5 text-amber-400 animate-spin" />
          )}
        </div>

        {/* Sugerencias */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(217,25%,10%)] border border-[hsl(217,25%,18%)] rounded-lg shadow-lg z-10">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => selectSuggestion(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-amber-500/10 transition-colors border-b border-[hsl(217,25%,18%)] last:border-b-0"
              >
                <p className="font-medium text-foreground text-sm">
                  {suggestion.main_text}
                </p>
                <p className="text-muted-foreground text-xs">
                  {suggestion.secondary_text}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ubicaciones seleccionadas */}
      <div className="space-y-3">
        {/* Origen */}
        {origin && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-400">ORIGEN</p>
              <p className="text-foreground text-sm">{origin.address}</p>
              <p className="text-muted-foreground text-xs">
                {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
              </p>
            </div>
            <button
              onClick={() => setOrigin(null)}
              className="text-red-400/60 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Destino */}
        {destination && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <MapPin className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-400">DESTINO</p>
              <p className="text-foreground text-sm">{destination.address}</p>
              <p className="text-muted-foreground text-xs">
                {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
              </p>
            </div>
            <button
              onClick={() => setDestination(null)}
              className="text-red-400/60 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      {(origin || destination) && (
        <div className="flex gap-2">
          <button
            onClick={calculateRoute}
            disabled={!origin || !destination || isCalculating}
            className="flex-1 py-2 px-4 rounded-lg bg-gold-gradient hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[hsl(222,47%,4%)] font-semibold transition-all flex items-center justify-center gap-2"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Route className="w-4 h-4" />
                Calcular ruta
              </>
            )}
          </button>
          <button
            onClick={clearLocations}
            className="px-4 py-2 rounded-lg border border-[hsl(217,25%,18%)] hover:bg-[hsl(217,25%,12%)] text-muted-foreground hover:text-foreground transition-all"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Resultado de ruta */}
      {route && (
        <div className="space-y-3 p-4 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <p className="text-xs font-bold text-amber-400 uppercase">RUTA CALCULADA</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Distancia */}
            <div className="flex items-start gap-2">
              <span className="text-2xl font-bold text-foreground">
                {metersToKm(route.distance)}
              </span>
              <div>
                <p className="text-xs text-muted-foreground">kilómetros</p>
              </div>
            </div>

            {/* Duración */}
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">
                  {secondsToReadable(route.duration)}
                </p>
                <p className="text-xs text-muted-foreground">tiempo estimado</p>
              </div>
            </div>
          </div>

          {/* Puntos */}
          {route.start_location && route.end_location && (
            <div className="text-xs text-muted-foreground space-y-1 border-t border-amber-500/10 pt-2 mt-2">
              <p>
                Inicio: {route.start_location.lat.toFixed(4)},{" "}
                {route.start_location.lng.toFixed(4)}
              </p>
              <p>
                Fin: {route.end_location.lat.toFixed(4)},
                {route.end_location.lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400">Error</p>
            <p className="text-sm text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {/* Info de seguridad */}
      <div className="p-4 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
        <p className="text-xs font-semibold text-emerald-400 mb-2">🔒 SEGURIDAD</p>
        <ul className="text-xs text-emerald-300/80 space-y-1">
          <li>✅ API key protegida en el servidor (nunca en el navegador)</li>
          <li>✅ Rate limiting: máximo 10 solicitudes por minuto</li>
          <li>✅ Autenticación requerida para cada solicitud</li>
          <li>✅ Validación de entrada en el servidor</li>
          <li>✅ Timeouts de seguridad (5 segundos máximo)</li>
        </ul>
      </div>
    </div>
  );
}
