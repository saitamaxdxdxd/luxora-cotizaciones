/**
 * LUXORA - Formulario de Cotización VIP
 * Incluye gestión de paradas intermedias con reordenamiento.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Car,
  Clock,
  MapPin,
  Navigation,
  User,
  ChevronDown,
  Info,
  ArrowRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getVehicles, type Vehicle } from "@/lib/stores/vehicles";
import { BASE_DESCRIPTION, BASE_RADIUS_KM } from "@/data/config";
import { getDefaultOperatorCosts } from "@/lib/quotationEngine";
import { PlacesAutocomplete, type PlaceData } from "./PlacesAutocomplete";
import { StopsList, type StopItem } from "./StopsList";
import { originBounds } from "@/lib/geolocation";
import { calcRentalDays } from "@/lib/calculations";
import { checkAllVehiclesAvailability } from "@/lib/calendarAvailability";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface FormState {
  departureDateTime: string;
  returnDateTime: string;
  vehicleId: string;
  originPlace: PlaceData | null;
  originText: string;
  stops: StopItem[];
  destinationPlace: PlaceData | null;
  destinationText: string;
  includeOperator: boolean;
}

interface QuoteFormProps {
  onCalculate: (state: FormState) => void;
  isCalculating: boolean;
  isGoogleLoaded: boolean;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export function QuoteForm({ onCalculate, isCalculating, isGoogleLoaded }: QuoteFormProps) {
  const [form, setForm] = useState<FormState>({
    departureDateTime: "",
    returnDateTime: "",
    vehicleId: "",
    originPlace: null,
    originText: "",
    stops: [],
    destinationPlace: null,
    destinationText: "",
    includeOperator: false,
  });

  const [vehicleAvailability, setVehicleAvailability] = useState<Record<string, boolean>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [liveDistance, setLiveDistance] = useState<{ km: number; duration: string } | null>(null);
  const [loadingDistance, setLoadingDistance] = useState(false);

  // Vehículos cargados una sola vez al montar el formulario.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  useEffect(() => {
    void getVehicles().then(setVehicles);
  }, []);

  const rentalDays = calcRentalDays(form.departureDateTime, form.returnDateTime);

  // ─── Verificar disponibilidad de vehículos ───────────────────────────────
  useEffect(() => {
    if (!form.departureDateTime || !form.returnDateTime) { setVehicleAvailability({}); return; }
    if (new Date(form.returnDateTime) <= new Date(form.departureDateTime)) return;
    if (vehicles.length === 0) return;
    setCheckingAvailability(true);
    // Note: Vehicle availability checking uses calendarId from config (legacy)
    // TODO: In future, calendarId could be stored in Vehicle entity if needed
    checkAllVehiclesAvailability(
      vehicles.map((v) => ({ id: v.id, calendarId: undefined })),
      form.departureDateTime,
      form.returnDateTime
    ).then(setVehicleAvailability).finally(() => setCheckingAvailability(false));
  }, [form.departureDateTime, form.returnDateTime, vehicles]);

  // ─── Distancia en tiempo real ─────────────────────────────────────────────
  useEffect(() => {
    const origin = form.originPlace?.geometry?.location;
    const dest = form.destinationPlace?.geometry?.location;
    if (!origin || !dest) { setLiveDistance(null); return; }

    setLoadingDistance(true);
    setLiveDistance(null);

    const calc = async () => {
      try {
        const validStops = form.stops.filter((s) => s.place?.geometry?.location);
        const svc = new google.maps.DirectionsService();
        const result = await svc.route({
          origin: origin as google.maps.LatLng,
          destination: dest as google.maps.LatLng,
          waypoints: validStops.map((s) => ({
            location: s.place!.geometry!.location as google.maps.LatLng,
            stopover: true,
          })),
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          region: "MX",
        });
        const route = result.routes[0];
        if (!route) return;
        const totalKm = route.legs.reduce((sum, l) => sum + (l.distance?.value ?? 0), 0) / 1000;
        const totalSec = route.legs.reduce((sum, l) => sum + (l.duration?.value ?? 0), 0);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        setLiveDistance({ km: totalKm, duration: h > 0 ? `${h} h ${m} min` : `${m} min` });
      } catch { setLiveDistance(null); }
      finally { setLoadingDistance(false); }
    };
    calc();
  }, [form.originPlace, form.destinationPlace, form.stops]);

  // ─── Validación ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.departureDateTime) errors.departure = "Selecciona fecha y hora de salida";
    if (!form.returnDateTime) errors.return = "Selecciona fecha y hora de regreso";
    if (form.departureDateTime && form.returnDateTime &&
        new Date(form.returnDateTime) <= new Date(form.departureDateTime))
      errors.return = "La fecha de regreso debe ser posterior a la salida";
    if (!form.vehicleId) errors.vehicle = "Selecciona un vehículo";
    if (!form.originPlace) errors.origin = "Selecciona un origen válido del mapa";
    if (!form.destinationPlace) errors.destination = "Selecciona un destino válido del mapa";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onCalculate(form);
  };

  const inputClass = (hasError?: boolean) =>
    cn(
      "w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,40%)]",
      "rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-all duration-200",
      "focus:border-amber-500/60 focus:shadow-[0_0_0_2px_hsla(38,92%,50%,0.12)]",
      hasError ? "border-red-500/50" : "border-[hsl(217,25%,14%)] hover:border-[hsl(217,25%,22%)]"
    );

  const labelClass = "flex items-center gap-1.5 text-xs font-semibold tracking-widest text-amber-500/70 uppercase mb-1.5";
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const hasStops = form.stops.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* ─── Fechas ──────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="text-xs font-bold tracking-[0.2em] text-amber-500/60 uppercase mb-4 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          Fechas del Viaje
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}><Clock className="w-3 h-3" />Salida</label>
            <input type="datetime-local" value={form.departureDateTime}
              onChange={(e) => { setForm((p) => ({ ...p, departureDateTime: e.target.value })); setFormErrors((p) => ({ ...p, departure: "" })); }}
              className={cn(inputClass(!!formErrors.departure), "cursor-pointer")} style={{ colorScheme: "dark" }} />
            {formErrors.departure && <p className="text-xs text-red-400 mt-1">{formErrors.departure}</p>}
          </div>
          <div>
            <label className={labelClass}><Clock className="w-3 h-3" />Regreso</label>
            <input type="datetime-local" value={form.returnDateTime} min={form.departureDateTime}
              onChange={(e) => { setForm((p) => ({ ...p, returnDateTime: e.target.value })); setFormErrors((p) => ({ ...p, return: "" })); }}
              className={cn(inputClass(!!formErrors.return), "cursor-pointer")} style={{ colorScheme: "dark" }} />
            {formErrors.return && <p className="text-xs text-red-400 mt-1">{formErrors.return}</p>}
          </div>
        </div>
        {rentalDays > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/70 bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>Duración: <span className="font-semibold text-amber-400">{rentalDays} {rentalDays === 1 ? "día" : "días"}</span></span>
          </div>
        )}
      </div>

      {/* ─── Vehículo ─────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="text-xs font-bold tracking-[0.2em] text-amber-500/60 uppercase mb-4 flex items-center gap-2">
          <Car className="w-3.5 h-3.5" />
          Vehículo
          {checkingAvailability && (
            <span className="text-[10px] text-amber-500/40 font-normal tracking-normal normal-case ml-auto animate-pulse">Verificando...</span>
          )}
        </h3>
        <label className={labelClass}><Car className="w-3 h-3" />Unidad</label>
        <div className="relative">
          <select value={form.vehicleId}
            onChange={(e) => { setForm((p) => ({ ...p, vehicleId: e.target.value })); setFormErrors((p) => ({ ...p, vehicle: "" })); }}
            className={cn(inputClass(!!formErrors.vehicle), "appearance-none cursor-pointer pr-10")}>
            <option value="" className="bg-[hsl(222,47%,7%)]">— Seleccionar vehículo —</option>
            {vehicles.map((v) => {
              const ok = vehicleAvailability[v.id] !== false;
              return (
                <option key={v.id} value={v.id} disabled={!ok} className="bg-[hsl(222,47%,7%)]">
                  {ok ? "" : "⛔ "}{v.marca} {v.modelo} · {v.capacidadPasajeros} pas. · {v.rentaDia.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}/día
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40 pointer-events-none" />
        </div>
        {formErrors.vehicle && <p className="text-xs text-red-400 mt-1">{formErrors.vehicle}</p>}
        {selectedVehicle && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Pasajeros", value: `${selectedVehicle.capacidadPasajeros}` },
              { label: "Combustible", value: selectedVehicle.fuelType.charAt(0).toUpperCase() + selectedVehicle.fuelType.slice(1) },
              { label: "Rendimiento", value: `${selectedVehicle.fuelEfficiencyKmPerLiter} km/L` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-amber-500/50 uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-amber-300">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Ruta del Viaje ───────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="text-xs font-bold tracking-[0.2em] text-amber-500/60 uppercase mb-4 flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5" />
          Ruta del Viaje
          {hasStops && (
            <span className="ml-auto text-[10px] text-amber-500/50 font-normal tracking-normal normal-case">
              {form.stops.length} parada{form.stops.length !== 1 ? "s" : ""} intermedia{form.stops.length !== 1 ? "s" : ""}
            </span>
          )}
        </h3>

        <div className="flex flex-col gap-3">

          {/* ORIGEN */}
          {isGoogleLoaded ? (
            <PlacesAutocomplete
              label="Origen"
              placeholder={`Búsqueda restringida a ${BASE_RADIUS_KM} km de ${BASE_DESCRIPTION}`}
              value={form.originText}
              onChange={(v) => setForm((p) => ({ ...p, originText: v }))}
              onPlaceSelect={(place: PlaceData) => {
                setForm((p) => ({ ...p, originPlace: place }));
                setFormErrors((p) => ({ ...p, origin: "" }));
              }}
              bounds={originBounds}
              strictBounds={true}
              error={formErrors.origin}
              isOrigin={true}
            />
          ) : (
            <div className="h-12 bg-[hsl(217,25%,9%)] rounded-xl border border-[hsl(217,25%,14%)] animate-pulse" />
          )}

          {/* CONECTOR con distancia live */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 to-transparent" />
            {loadingDistance ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(217,25%,10%)] border border-amber-500/15">
                <Loader2 className="w-3 h-3 text-amber-500/50 animate-spin" />
                <span className="text-[10px] text-amber-500/50">Calculando...</span>
              </div>
            ) : liveDistance ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/25">
                <ArrowRight className="w-3 h-3 text-amber-400/70" />
                <span className="text-xs font-bold text-amber-300 tabular-nums">
                  {liveDistance.km.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km
                </span>
                <span className="text-[10px] text-amber-500/40">·</span>
                <span className="text-[10px] text-amber-400/60">{liveDistance.duration}</span>
                {hasStops && <span className="text-[10px] text-amber-500/40">· ida</span>}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center">
                <Navigation className="w-3 h-3 text-amber-500/40 rotate-90" />
              </div>
            )}
            <div className="flex-1 h-px bg-gradient-to-l from-amber-500/20 to-transparent" />
          </div>

          {/* PARADAS INTERMEDIAS */}
          {(hasStops || isGoogleLoaded) && (
            <StopsList
              stops={form.stops}
              onChange={(stops) => setForm((p) => ({ ...p, stops }))}
              isGoogleLoaded={isGoogleLoaded}
            />
          )}

          {/* DESTINO */}
          {isGoogleLoaded ? (
            <PlacesAutocomplete
              label="Destino"
              placeholder="Buscar destino en todo México"
              value={form.destinationText}
              onChange={(v) => setForm((p) => ({ ...p, destinationText: v }))}
              onPlaceSelect={(place: PlaceData) => {
                setForm((p) => ({ ...p, destinationPlace: place }));
                setFormErrors((p) => ({ ...p, destination: "" }));
              }}
              icon={<MapPin className="w-3 h-3" />}
              error={formErrors.destination}
            />
          ) : (
            <div className="h-12 bg-[hsl(217,25%,9%)] rounded-xl border border-[hsl(217,25%,14%)] animate-pulse" />
          )}

          {/* Info de regreso */}
          {form.destinationPlace && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[hsl(217,25%,8%)] border border-amber-500/10 text-xs text-amber-500/50">
              <RotateCcw className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500/40" />
              <span>
                El regreso se calcula como ruta directa: <strong className="text-amber-400/70">
                  {form.destinationText?.split(",")[0] || "Destino"} → {form.originText?.split(",")[0] || "Origen"}
                </strong> (puede diferir de la ida en distancia y casetas).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Operador VIP ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="text-xs font-bold tracking-[0.2em] text-amber-500/60 uppercase mb-4 flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          Operador VIP
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[hsl(210,40%,90%)]">Incluir Operador / Chofer VIP</p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">Salario · Viáticos · Hospedaje</p>
          </div>
          <button type="button" role="switch" aria-checked={form.includeOperator}
            onClick={() => setForm((p) => ({ ...p, includeOperator: !p.includeOperator }))}
            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300",
              "focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-transparent",
              form.includeOperator ? "bg-amber-500" : "bg-[hsl(217,25%,18%)]")}>
            <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300",
              form.includeOperator ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>
        {form.includeOperator && (() => {
          const costs = getDefaultOperatorCosts();
          return (
            <div className="mt-3 grid grid-cols-3 gap-2 animate-fade-in">
              {[
                { label: "Salario/día", value: `$${costs.salaryPerDay.toLocaleString()}` },
                { label: "Comidas/día", value: `$${costs.foodPerDay.toLocaleString()}` },
                { label: "Hotel/noche", value: `$${costs.lodgingPerNight.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-amber-500/50 uppercase tracking-wider mb-0.5">{label}</div>
                  <div className="text-sm font-semibold text-amber-300">{value}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ─── Calcular ─────────────────────────────────────────────────────── */}
      <button type="submit" disabled={isCalculating || !isGoogleLoaded}
        className={cn("relative w-full rounded-2xl py-4 px-6 font-display font-bold text-base tracking-wider",
          "transition-all duration-300 overflow-hidden",
          "focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-transparent",
          isCalculating || !isGoogleLoaded
            ? "opacity-60 cursor-not-allowed bg-amber-600/30 text-amber-500/50 border border-amber-500/20"
            : "bg-gold-gradient text-[hsl(222,47%,4%)] shadow-gold hover:shadow-card-hover hover:brightness-105 active:scale-[0.98]")}>
        {!isCalculating && isGoogleLoaded && (
          <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] bg-[length:200%_100%] animate-shimmer" aria-hidden />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isCalculating ? (
            <><span className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />Calculando cotización...</>
          ) : !isGoogleLoaded ? (
            <><span className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />Cargando Google Maps...</>
          ) : (
            <>✦ Calcular Cotización</>
          )}
        </span>
      </button>
    </form>
  );
}
