/**
 * StopsList — Gestión de paradas intermedias en la ruta.
 * Permite agregar, quitar y reordenar paradas con flechas ↑↓.
 */

import { Plus, Trash2, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { PlacesAutocomplete, type PlaceData } from "./PlacesAutocomplete";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface StopItem {
  id: string;
  place: PlaceData | null;
  text: string;
}

interface StopsListProps {
  stops: StopItem[];
  onChange: (stops: StopItem[]) => void;
  isGoogleLoaded: boolean;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function StopsList({ stops, onChange, isGoogleLoaded }: StopsListProps) {
  const addStop = () => {
    onChange([
      ...stops,
      { id: `stop-${Date.now()}`, place: null, text: "" },
    ]);
  };

  const removeStop = (id: string) => onChange(stops.filter((s) => s.id !== id));

  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...stops];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr);
  };

  const updateStop = (id: string, place: PlaceData) =>
    onChange(
      stops.map((s) =>
        s.id === id
          ? { ...s, place, text: place.formatted_address || place.name || "" }
          : s
      )
    );

  const updateText = (id: string, text: string) =>
    onChange(stops.map((s) => (s.id === id ? { ...s, text } : s)));

  return (
    <div className="flex flex-col gap-2">
      {stops.map((stop, idx) => (
        <div key={stop.id} className="flex items-start gap-2">
          {/* Botones de reordenamiento */}
          <div className="flex flex-col gap-0.5 pt-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              title="Subir parada"
              className="p-1 rounded-md text-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-20 transition-colors"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === stops.length - 1}
              title="Bajar parada"
              className="p-1 rounded-md text-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-20 transition-colors"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          {/* Campo de búsqueda */}
          <div className="flex-1 min-w-0">
            {isGoogleLoaded ? (
              <PlacesAutocomplete
                label={`Parada ${idx + 1}`}
                placeholder="Buscar parada intermedia en México..."
                value={stop.text}
                onChange={(v) => updateText(stop.id, v)}
                onPlaceSelect={(place) => updateStop(stop.id, place)}
                icon={<MapPin className="w-3 h-3" />}
              />
            ) : (
              <div className="h-12 bg-[hsl(217,25%,9%)] rounded-xl border border-[hsl(217,25%,14%)] animate-pulse" />
            )}
          </div>

          {/* Eliminar */}
          <button
            type="button"
            onClick={() => removeStop(stop.id)}
            title="Eliminar parada"
            className="flex-shrink-0 mt-2 p-2 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Agregar parada */}
      <button
        type="button"
        onClick={addStop}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold
          text-amber-500/60 border border-dashed border-amber-500/20
          hover:border-amber-500/45 hover:text-amber-400 hover:bg-amber-500/5
          transition-all duration-200"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar parada intermedia
      </button>
    </div>
  );
}
