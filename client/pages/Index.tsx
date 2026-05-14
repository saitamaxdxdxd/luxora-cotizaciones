/**
 * LUXORA Cotizador VIP - Página Principal
 *
 * Flujo de cálculo:
 *  1. computeFullRoute() → ida con paradas + regreso separado + sugerencia de optimización
 *  2. calculateQuote() → costos con distancias/casetas ya sumadas correctamente
 */

import { useState, useCallback } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { Header } from "@/components/luxora/Header";
import { QuoteForm, type FormState } from "@/components/luxora/QuoteForm";
import { QuoteResults } from "@/components/luxora/QuoteResults";
import { type QuoteResult, calculateQuote } from "@/lib/calculations";
import { computeFullRoute, type RouteLeg } from "@/lib/routesApi";
import { estimateTollKm } from "@/lib/tollDetection";
import { vehicles, fuelPrices, operatorData } from "@/data/config";

const GOOGLE_LIBRARIES: ("places" | "geometry")[] = ["places"];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

export default function Index() {
  const { isLoaded: isGoogleLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
    language: "es",
    region: "MX",
  });

  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [currentFormState, setCurrentFormState] = useState<FormState | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [routeSuggestion, setRouteSuggestion] = useState<{
    message: string;
    suggestedLabels: string[];
    savingKm: number;
  } | undefined>();

  const handleCalculate = useCallback(
    async (form: FormState) => {
      if (!isGoogleLoaded) return;

      setIsCalculating(true);
      setCalcError(null);
      setQuoteResult(null);
      setRouteSuggestion(undefined);
      setCurrentFormState(form);

      try {
        const vehicle = vehicles.find((v) => v.id === form.vehicleId);
        if (!vehicle) throw new Error("Vehículo no encontrado.");

        const originLoc = form.originPlace?.geometry?.location;
        const destLoc = form.destinationPlace?.geometry?.location;
        if (!originLoc || !destLoc)
          throw new Error("Selecciona origen y destino válidos desde el autocompletado.");

        // ── Construir waypoints desde paradas válidas ─────────────────────
        const validStops = form.stops.filter((s) => s.place?.geometry?.location);
        const stopWaypoints = validStops.map((s) => ({
          latLng: { lat: s.place!.geometry!.location.lat(), lng: s.place!.geometry!.location.lng() },
          label: s.text || s.place?.name || "Parada",
        }));

        // ── Calcular ruta completa (ida con paradas + regreso separado) ───
        const routeData = await computeFullRoute(
          { latLng: { lat: originLoc.lat(), lng: originLoc.lng() }, label: form.originText },
          stopWaypoints,
          { latLng: { lat: destLoc.lat(), lng: destLoc.lng() }, label: form.destinationText },
          GOOGLE_MAPS_API_KEY
        );

        // ── Fallback a DirectionsService si Routes API no está disponible ─
        let distanceOutboundKm: number;
        let distanceReturnKm: number;
        let tollDirectCostMXN: number | undefined;
        let tollKmTotal: number;
        let tollSource: "google" | "estimation" = "estimation";
        let outboundLegs: RouteLeg[];
        let returnLeg: RouteLeg;

        if (routeData && routeData.outboundDistanceKm > 0) {
          distanceOutboundKm = routeData.outboundDistanceKm;
          distanceReturnKm = routeData.returnDistanceKm;
          outboundLegs = routeData.outboundLegs;
          returnLeg = routeData.returnLeg;

          if (routeData.totalTollCostMXN !== null) {
            tollDirectCostMXN = routeData.totalTollCostMXN;
            tollSource = "google";
            tollKmTotal = 0;
          } else {
            // Estimación para total (ida + regreso)
            const totalDist = distanceOutboundKm + distanceReturnKm;
            tollKmTotal = estimateTollKm(totalDist);
          }

          if (routeData.suggestion) setRouteSuggestion(routeData.suggestion);
        } else {
          // Fallback: DirectionsService
          console.warn("[LUXORA] Routes API no disponible, usando DirectionsService.");
          const svc = new google.maps.DirectionsService();
          const res = await svc.route({
            origin: originLoc,
            destination: destLoc,
            waypoints: validStops.map((s) => ({
              location: s.place!.geometry!.location as google.maps.LatLng,
              stopover: true,
            })),
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            region: "MX",
            avoidTolls: false,
          });
          const legs = res.routes[0]?.legs ?? [];
          if (!legs.length) throw new Error("No se encontró ruta válida.");

          distanceOutboundKm = legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0) / 1000;

          // Regreso estimado = distancia directa destino → origen
          const retRes = await svc.route({
            origin: destLoc,
            destination: originLoc,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            region: "MX",
          });
          const retLeg = retRes.routes[0]?.legs[0];
          distanceReturnKm = (retLeg?.distance?.value ?? distanceOutboundKm * 1000) / 1000;

          outboundLegs = legs.map((leg, i) => ({
            from: i === 0 ? form.originText : validStops[i - 1]?.text || `Parada ${i}`,
            to: i === legs.length - 1 ? form.destinationText : validStops[i]?.text || `Parada ${i + 1}`,
            distanceKm: (leg.distance?.value ?? 0) / 1000,
            durationText: leg.duration?.text ?? "—",
            tollCostMXN: null,
          }));
          returnLeg = {
            from: form.destinationText,
            to: form.originText,
            distanceKm: distanceReturnKm,
            durationText: retLeg?.duration?.text ?? "—",
            tollCostMXN: null,
          };

          tollKmTotal = estimateTollKm(distanceOutboundKm + distanceReturnKm);
        }

        if (distanceOutboundKm <= 0) throw new Error("No se pudo calcular la distancia.");

        // ── Calcular cotización ───────────────────────────────────────────
        const result = calculateQuote({
          departureDateTime: new Date(form.departureDateTime),
          returnDateTime: new Date(form.returnDateTime),
          vehicle,
          distanceOutboundKm,
          distanceReturnKm,
          tollDirectCostMXN,
          tollKmTotal: tollKmTotal!,
          tollSource,
          outboundLegs: outboundLegs!,
          returnLeg: returnLeg!,
          includeOperator: form.includeOperator,
          fuelPrices,
          operatorData,
        });

        setQuoteResult(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ocurrió un error inesperado.";
        console.error("[LUXORA] Error:", err);
        setCalcError(msg);
      } finally {
        setIsCalculating(false);
      }
    },
    [isGoogleLoaded]
  );

  const showApiKeyError = loadError || !GOOGLE_MAPS_API_KEY;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {showApiKeyError && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-sm text-amber-300">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold">Google Maps API Key requerida</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Configura <code className="font-mono bg-amber-500/10 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> en tus variables de entorno.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex items-center gap-4 mb-5 justify-center">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/40" />
            <span className="text-xs tracking-[0.4em] text-amber-500/50 uppercase font-medium">Transporte Terrestre VIP</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-3 leading-tight">
            <span className="text-gold-gradient">Cotización</span>{" "}
            <span className="text-[hsl(210,40%,92%)]">Instantánea</span>
          </h1>
          <p className="text-sm sm:text-base text-[hsl(215,20%,50%)] max-w-md mx-auto">
            Calcula el costo exacto de tu servicio VIP incluyendo combustible, casetas, renta y operador.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 pb-12">
          <div className="w-full">
            <QuoteForm
              onCalculate={handleCalculate}
              isCalculating={isCalculating}
              isGoogleLoaded={isGoogleLoaded && !showApiKeyError}
            />
          </div>
          <div className="w-full">
            <QuoteResults
              result={quoteResult}
              formState={currentFormState}
              isCalculating={isCalculating}
              error={calcError}
              routeSuggestion={routeSuggestion}
            />
          </div>
        </div>
      </div>

      <footer className="border-t border-amber-500/8 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm tracking-widest text-gold-gradient">LUXORA</span>
              <span className="text-xs text-[hsl(215,20%,35%)]">Cotizador VIP · México</span>
            </div>
            <p className="text-xs text-[hsl(215,20%,32%)] text-center">
              Precios estimados · Los costos reales pueden variar según condiciones de ruta
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
