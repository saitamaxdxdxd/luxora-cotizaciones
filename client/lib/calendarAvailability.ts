/**
 * LUXORA - Verificación de Disponibilidad via Google Calendar API
 *
 * Esta función consulta la API de Google Calendar FreeBusy para verificar
 * si un vehículo está disponible en el rango de fechas seleccionado.
 *
 * CONFIGURACIÓN REQUERIDA:
 * 1. Agrega VITE_GOOGLE_CALENDAR_API_KEY en tu .env
 * 2. Asigna un calendarId a cada vehículo en client/data/config.ts
 * 3. Configura el calendario como público en Google Calendar
 */

const CALENDAR_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY; // Usar misma API key si tiene acceso
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

export interface AvailabilityResult {
  vehicleId: string;
  isAvailable: boolean;
  error?: string;
}

/**
 * Verifica disponibilidad de un vehículo en Google Calendar.
 * Si el vehículo no tiene calendarId configurado, lo retorna como disponible.
 *
 * @param calendarId - ID del calendario de Google del vehículo
 * @param vehicleId - ID del vehículo (para identificar en el resultado)
 * @param start - Fecha/hora de inicio (ISO 8601)
 * @param end - Fecha/hora de fin (ISO 8601)
 */
export async function checkVehicleAvailability(
  calendarId: string,
  vehicleId: string,
  start: string,
  end: string
): Promise<AvailabilityResult> {
  // Si no hay calendarId configurado, asumir disponible
  if (!calendarId || !CALENDAR_API_KEY) {
    return { vehicleId, isAvailable: true };
  }

  try {
    const response = await fetch(`${FREEBUSY_URL}?key=${CALENDAR_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: new Date(start).toISOString(),
        timeMax: new Date(end).toISOString(),
        items: [{ id: calendarId }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    const busySlots = data.calendars?.[calendarId]?.busy ?? [];

    // Disponible si no hay slots ocupados
    return {
      vehicleId,
      isAvailable: busySlots.length === 0,
    };
  } catch (err) {
    console.warn(`[LUXORA] No se pudo verificar disponibilidad de ${vehicleId}:`, err);
    // En caso de error, mostrar como disponible para no bloquear al usuario
    return {
      vehicleId,
      isAvailable: true,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

/**
 * Verifica disponibilidad de múltiples vehículos en paralelo.
 */
export async function checkAllVehiclesAvailability(
  vehicles: Array<{ id: string; calendarId?: string }>,
  start: string,
  end: string
): Promise<Record<string, boolean>> {
  const results = await Promise.all(
    vehicles.map((v) =>
      checkVehicleAvailability(v.calendarId ?? "", v.id, start, end)
    )
  );

  const availability: Record<string, boolean> = {};
  for (const result of results) {
    availability[result.vehicleId] = result.isAvailable;
  }
  return availability;
}
