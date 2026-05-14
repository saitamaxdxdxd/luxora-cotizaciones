/**
 * LUXORA — Módulo de Cotizaciones
 * Envuelve el cotizador existente con el NavShell de navegación.
 */

import { useState, useCallback } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { NavShell } from "@/components/luxora/NavShell";
import { QuoteForm, type FormState } from "@/components/luxora/QuoteForm";
import { QuoteResults } from "@/components/luxora/QuoteResults";
import { type QuoteResult, calculateQuote } from "@/lib/calculations";
import { computeFullRoute, type RouteLeg } from "@/lib/routesApi";
import { estimateTollKm } from "@/lib/tollDetection";
import { getVehicleById } from "@/lib/stores/vehicles";
import { getFuelPrices, getDefaultOperatorCosts } from "@/lib/quotationEngine";

const GOOGLE_LIBRARIES: ("places" | "geometry")[] = ["places"];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

export default function Cotizaciones() {
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
        const vehicle = await getVehicleById(form.vehicleId);
        if (!vehicle) throw new Error("Vehículo no encontrado.");

        const originLoc = form.originPlace?.geometry?.location;
        const destLoc = form.destinationPlace?.geometry?.location;
        if (!originLoc || !destLoc)
          throw new Error("Selecciona origen y destino válidos desde el autocompletado.");

        const validStops = form.stops.filter((s) => s.place?.geometry?.location);
        const stopWaypoints = validStops.map((s) => ({
          latLng: { lat: s.place!.geometry!.location.lat(), lng: s.place!.geometry!.location.lng() },
          label: s.text || s.place?.name || "Parada",
        }));

        const routeData = await computeFullRoute(
          { latLng: { lat: originLoc.lat(), lng: originLoc.lng() }, label: form.originText },
          stopWaypoints,
          { latLng: { lat: destLoc.lat(), lng: destLoc.lng() }, label: form.destinationText },
          GOOGLE_MAPS_API_KEY
        );

        let distanceOutboundKm: number;
        let distanceReturnKm: number;
        let tollDirectCostMXN: number | undefined;
        let tollKmTotal: number = 0;
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
          } else {
            tollKmTotal = estimateTollKm(distanceOutboundKm + distanceReturnKm);
          }
          if (routeData.suggestion) setRouteSuggestion(routeData.suggestion);
        } else {
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
          });
          const legs = res.routes[0]?.legs ?? [];
          if (!legs.length) throw new Error("No se encontró ruta válida.");
          distanceOutboundKm = legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0) / 1000;
          const retRes = await svc.route({ origin: destLoc, destination: originLoc, travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.METRIC, region: "MX" });
          const retLeg = retRes.routes[0]?.legs[0];
          distanceReturnKm = (retLeg?.distance?.value ?? distanceOutboundKm * 1000) / 1000;
          outboundLegs = legs.map((leg, i) => ({
            from: i === 0 ? form.originText : validStops[i - 1]?.text || `Parada ${i}`,
            to: i === legs.length - 1 ? form.destinationText : validStops[i]?.text || `Parada ${i + 1}`,
            distanceKm: (leg.distance?.value ?? 0) / 1000,
            durationText: leg.duration?.text ?? "—",
            tollCostMXN: null,
          }));
          returnLeg = { from: form.destinationText, to: form.originText, distanceKm: distanceReturnKm, durationText: retLeg?.duration?.text ?? "—", tollCostMXN: null };
          tollKmTotal = estimateTollKm(distanceOutboundKm + distanceReturnKm);
        }

        const result = calculateQuote({
          departureDateTime: new Date(form.departureDateTime),
          returnDateTime: new Date(form.returnDateTime),
          vehicle,
          distanceOutboundKm: distanceOutboundKm!,
          distanceReturnKm: distanceReturnKm!,
          tollDirectCostMXN,
          tollKmTotal,
          tollSource,
          outboundLegs: outboundLegs!,
          returnLeg: returnLeg!,
          includeOperator: form.includeOperator,
          fuelPrices: getFuelPrices(),
          operatorData: getDefaultOperatorCosts(),
        });

        setQuoteResult(result);
      } catch (err) {
        setCalcError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setIsCalculating(false);
      }
    },
    [isGoogleLoaded]
  );

  const showApiKeyError = loadError || !GOOGLE_MAPS_API_KEY;

  return (
    <NavShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {showApiKeyError && (
          <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-sm text-amber-300">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Google Maps API Key requerida</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Configura <code className="font-mono bg-amber-500/10 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
            <span className="text-gold-gradient">Cotización</span>{" "}
            <span className="text-[hsl(210,40%,92%)]">Instantánea</span>
          </h1>
          <p className="text-sm text-[hsl(215,20%,50%)]">
            Combustible · Casetas · Renta · Operador VIP
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <QuoteForm
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
            isGoogleLoaded={isGoogleLoaded && !showApiKeyError}
          />
          <QuoteResults
            result={quoteResult}
            formState={currentFormState}
            isCalculating={isCalculating}
            error={calcError}
            routeSuggestion={routeSuggestion}
          />
        </div>
      </div>
    </NavShell>
  );
}
