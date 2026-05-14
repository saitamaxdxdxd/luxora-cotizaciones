/**
 * LUXORA - Autocompletado de Lugares
 *
 * Usa el widget nativo google.maps.places.Autocomplete directamente sobre
 * el input, que es el método más confiable y compatible con cualquier
 * tipo de API key (nueva o clásica).
 *
 * El estilo del dropdown (.pac-container) se define en global.css.
 */

import { useEffect, useRef, useState } from "react";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface PlaceData {
  formatted_address?: string;
  name?: string;
  geometry?: { location: google.maps.LatLng | null };
}

export interface PlacesAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceData) => void;
  bounds?: google.maps.LatLngBoundsLiteral;
  strictBounds?: boolean;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
  isOrigin?: boolean;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function PlacesAutocomplete({
  label,
  placeholder = "Buscar dirección...",
  value,
  onChange,
  onPlaceSelect,
  bounds,
  strictBounds = false,
  disabled = false,
  error,
  icon,
  className,
  isOrigin = false,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Inicializar el widget de Autocomplete ────────────────────────────────
  useEffect(() => {
    if (!inputRef.current) return;
    if (typeof google === "undefined" || !google.maps?.places) return;
    // Evitar doble inicialización
    if (acRef.current) return;

    try {
      const options: google.maps.places.AutocompleteOptions = {
        fields: ["formatted_address", "name", "geometry"],
        componentRestrictions: { country: "mx" },
        types: ["geocode", "establishment"],
      };

      // Restricción de bounds para el campo de origen
      if (bounds) {
        options.bounds = {
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west,
        };
        if (strictBounds) options.strictBounds = true;
      }

      const ac = new google.maps.places.Autocomplete(
        inputRef.current,
        options
      );
      acRef.current = ac;

      // Cuando el usuario selecciona un lugar del dropdown
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();

        if (!place?.geometry?.location) {
          // El usuario presionó Enter sin seleccionar → ignorar
          return;
        }

        const addr =
          place.formatted_address || inputRef.current?.value || "";

        // Sincronizar el input con la dirección seleccionada
        if (inputRef.current) inputRef.current.value = addr;
        onChange(addr);

        onPlaceSelect({
          formatted_address: addr,
          name: place.name,
          geometry: { location: place.geometry.location },
        });
      });
    } catch (err) {
      console.error("[LUXORA] Error al inicializar Autocomplete:", err);
    }

    // Cleanup al desmontar
    return () => {
      if (acRef.current) {
        google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar — el widget se inicializa una vez

  // ─── Sincronizar valor externo → input (p.ej. al limpiar el formulario) ──
  useEffect(() => {
    if (
      inputRef.current &&
      document.activeElement !== inputRef.current
    ) {
      inputRef.current.value = value;
    }
  }, [value]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Label */}
      <label className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-amber-500/70 uppercase">
        {icon ?? <MapPin className="w-3 h-3" />}
        {label}
        {isOrigin && (
          <span className="ml-1 text-[9px] text-amber-500/40 normal-case tracking-normal font-normal border border-amber-500/20 rounded-full px-1.5 py-0.5">
            Radio 50 km
          </span>
        )}
      </label>

      {/* Input — el widget de Google se inyecta directamente aquí */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)]",
            "placeholder:text-[hsl(215,20%,40%)]",
            "rounded-xl border px-4 py-3 pr-10 text-sm font-medium",
            "transition-all duration-200 outline-none",
            error
              ? "border-red-500/50 focus:border-red-400"
              : isFocused
              ? "border-amber-500/60 shadow-[0_0_0_2px_hsla(38,92%,50%,0.12)]"
              : "border-[hsl(217,25%,14%)] hover:border-[hsl(217,25%,22%)]",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        />

        {/* Icono derecho */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-amber-500/40 animate-spin" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-red-400/70" />
          ) : (
            <MapPin
              className={cn(
                "w-4 h-4 transition-colors",
                isFocused ? "text-amber-400" : "text-[hsl(215,20%,35%)]"
              )}
            />
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
