# 🔐 Configuración Segura de Google Maps en LUXORA

## Paso 1: Crear API Key en Google Cloud Console

### 1.1 Ir a Google Cloud Console

1. Abre https://console.cloud.google.com/
2. Selecciona o crea un proyecto (ej: "LUXORA")
3. Navega a **APIs & Services** → **Credentials**

### 1.2 Crear API Key

1. Click en **+ Create Credentials** → **API Key**
2. Se generará una clave como: `AIzaSyD_7R2_vxN_WxYzQwQvQwQvQwQv`
3. Copia la clave

### 1.3 Habilitar APIs requeridas

En **APIs & Services** → **Enabled APIs**, habilita:

```
✅ Maps JavaScript API (para mapas interactivos)
✅ Geocoding API (para dirección → coordenadas)
✅ Directions API (para calcular rutas)
✅ Places API (para autocompletar direcciones)
```

---

## Paso 2: Agregar API Key al Servidor

### 2.1 Actualizar archivo `.env`

```bash
# En la raíz del proyecto
nano .env
```

Agrega tu API key:

```env
GOOGLE_MAPS_API_KEY=AIzaSyD_7R2_vxN_WxYzQwQvQwQvQwQv
```

**⚠️ IMPORTANTE:**
- Nunca hagas push de `.env` a Git
- `.gitignore` ya incluye `.env*`
- Verifica: `cat .gitignore | grep env`

### 2.2 Verificar que el servidor inicia correctamente

```bash
npm run dev
```

Verifica que no haya errores en la consola. Deberías ver:

```
VITE v8.0.2 ready in 585 ms
✓ Google Maps proxy routes registered
```

---

## Paso 3: Aplicar Restricciones de Seguridad en Google Cloud

### 3.1 Restricciones de HTTP Referrer

1. En **APIs & Services** → **Credentials**
2. Click en tu API Key
3. Scroll a **API restrictions** → **HTTP referrer**
4. Agrega dominios permitidos:

```
https://localhost:8080/*          (desarrollo local)
https://tudominio.com/*           (producción)
https://www.tudominio.com/*       (con www)
https://*.builder.io/*            (Builder.io en desarrollo)
```

### 3.2 Restricciones de API

1. En **API restrictions**
2. Selecciona **Restrict key** y elige:

```
✅ Maps JavaScript API
✅ Geocoding API
✅ Directions API
✅ Places API
❌ Street View API (si no lo usas, desactiva)
❌ Elevation API (si no lo usas, desactiva)
```

### 3.3 Cuota y Alertas

1. Navega a **Billing** → **Budgets & alerts**
2. Crea un presupuesto:

```
Límite mensual: $50 USD
Alertas:
  - Al 50%: $25 (aviso)
  - Al 80%: $40 (alerta roja)
  - Al 100%: $50 (detener servicio)
```

---

## Paso 4: Usar el Servicio en tu Aplicación

### 4.1 Importar el servicio

```typescript
// En un componente de React
import { geocodeAddress, getDirections, getAutocompletePredictions } from '@/services/mapsService';
```

### 4.2 Usar funciones seguras

```typescript
// Geocodificar dirección
const result = await geocodeAddress("Av. Paseo de la Reforma, México");
console.log(result.lat, result.lng);

// Obtener autocompletar
const suggestions = await getAutocompletePredictions("Av. Paseo");
console.log(suggestions.predictions);

// Calcular ruta
const route = await getDirections(
  "Mexico City",
  "Guadalajara",
  "driving"
);
console.log(route.distance, route.duration);
```

### 4.3 Manejar errores

```typescript
try {
  const location = await geocodeAddress(address);
  console.log("Ubicación encontrada:", location);
} catch (error) {
  if (error.message.includes("Demasiadas solicitudes")) {
    console.log("Rate limit: espera 1 minuto");
  } else if (error.message.includes("autenticado")) {
    console.log("Debes iniciar sesión");
  } else {
    console.error("Error en mapas:", error);
  }
}
```

---

## Paso 5: Prueba el Sistema

### 5.1 Prueba en Desarrollo

1. Abre tu app: http://localhost:8080/
2. Abre DevTools (F12)
3. **Importante:** NO verás la API key en DevTools
4. En **Network**, verás solicitudes a `/api/maps/*`
5. **Nunca** verás `google.com/maps/api` (está en el servidor)

### 5.2 Verifica que la API key está protegida

En DevTools, busca en Network:
```
❌ NO debe aparecer: AIzaSyD_... (tu API key)
❌ NO debe aparecer: google.com/maps/api
✅ SI debe aparecer: /api/maps/geocode
✅ SI debe aparecer: /api/maps/directions
```

### 5.3 Prueba rate limiting

Ejecuta en la consola:

```javascript
// Esto debería fallar después de 10 intentos
for (let i = 0; i < 15; i++) {
  fetch('/api/maps/geocode?address=test&token=xxx')
    .then(r => console.log(i, r.status))
    .catch(e => console.log(i, 'error', e));
}
```

Deberías ver:
```
0 200
1 200
...
9 200
10 429  ← Rate limit activado
11 429
...
```

---

## Paso 6: Monitoreo en Producción

### 6.1 Monitorear uso en Google Cloud

```
Google Cloud Console
  → Billing → Cost Analysis
  → Filtra por API
  → Ve el costo por servicio
```

### 6.2 Configurar alertas de email

```
Billing → Budget alerts
  → Agrega tu email
  → Recibe alertas si costo > $40/mes
```

### 6.3 Revisar logs

```bash
# Ver logs de solicitudes a Maps
gcloud logging read "resource.type=api AND protoPayload.methodName=~\"geocode|directions\"" \
  --limit 100 \
  --format json
```

---

## 🚨 Checklist de Seguridad

- [ ] API key en `.env` (no en código)
- [ ] `.env` no está en Git (verificar `.gitignore`)
- [ ] Restricciones de referrer configuradas
- [ ] Solo APIs necesarias habilitadas
- [ ] Límite de gasto configurado ($50/mes)
- [ ] Alertas de email activadas
- [ ] Rate limiting funciona (máx 10 req/min)
- [ ] API key NO aparece en DevTools Network
- [ ] `/api/maps/*` aparece en DevTools Network
- [ ] En .env.local la API key está vacía o comentada (para desarrollo)

---

## ❌ Errores Comunes

### Error: "Servicio no disponible"

```
Solución: Verifica que GOOGLE_MAPS_API_KEY está en .env
  1. npm run dev (reinicia servidor)
  2. Verifica que la API key es válida
  3. Verifica que las APIs están habilitadas en Google Cloud
```

### Error: "Demasiadas solicitudes"

```
Solución: Rate limit alcanzado (10 solicitudes/minuto)
  Espera 60 segundos e intenta de nuevo
  O contacta al admin para aumentar el límite
```

### Error: "No estás autenticado"

```
Solución: Usuario no está logueado
  1. Inicia sesión en LUXORA
  2. Intenta de nuevo
```

### Error: "Timeout"

```
Solución: Google Maps tardó más de 5 segundos
  Posibles causas:
  1. Conexión lenta
  2. Servidor Google sobrecargado
  3. Dirección muy compleja
  
  Intenta de nuevo
```

---

## ✅ Ventajas de Esta Implementación

✅ **API key 100% protegida** — Nunca sale del servidor  
✅ **Rate limiting** — Previene abuso (máx 10 req/min)  
✅ **Autenticación** — Solo usuarios logueados pueden usar  
✅ **Validación** — Entrada sanitizada en el servidor  
✅ **Timeouts** — Máximo 5 segundos por solicitud  
✅ **Logs** — Puedes revisar uso en Google Cloud Console  
✅ **Alertas** — Te notifican si gasto es alto  
✅ **Escalable** — Funciona con 1 usuario o 1,000,000  

---

## 📚 Referencias

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Maps API Pricing](https://mapsplatform.google.com/maps-products/#maps-pricing)
- [API Key Security](https://cloud.google.com/docs/authentication/api-keys)
- [Rate Limiting Best Practices](https://cloud.google.com/docs/quota/quotas)

---

## 🆘 Soporte

Si tienes problemas:

1. **Verifica el archivo `.env`:**
   ```bash
   echo $GOOGLE_MAPS_API_KEY
   ```

2. **Reinicia el servidor:**
   ```bash
   npm run dev
   ```

3. **Revisa los logs:**
   ```bash
   # En la consola de npm run dev
   # Busca mensajes que digan "[MAPS]"
   ```

4. **Prueba el endpoint manualmente:**
   ```bash
   curl "http://localhost:8080/api/maps/health"
   # Debería retornar: {"status":"ok","google_maps_configured":true}
   ```

¡Ahora tu API key de Google Maps está segura! 🔒
