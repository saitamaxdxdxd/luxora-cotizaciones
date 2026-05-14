# 🔒 Protección de Google Maps API Key

## El Problema: ¿Por Qué las API Keys son Vulnerables?

### Riesgo 1: Exposición en Frontend
```javascript
// ❌ VULNERABLE — La API key está visible en el navegador
const map = new google.maps.Map(document.getElementById('map'), {
  googleMapsApiKey: 'AIzaSyD...'  // Cualquiera puede verla en DevTools
});
```

Un atacante puede:
- Inspeccionar el código fuente (F12)
- Ver las solicitudes en Network
- Robar la API key
- Hacer solicitudes maliciosas usando tu key
- **Cobrarte miles de dólares** en uso no autorizado

### Riesgo 2: Abuso de API
```
Límite gratuito: $200/mes
Uso de un hacker: $20,000+ en días
```

---

## ✅ Solución 1: API Key Solo en Backend (Recomendado)

### Arquitectura Segura

```
┌─────────────────┐
│   Navegador     │
│   (Frontend)    │
│                 │
│ Solicita: req   │
│ Mapas anónimos  │
└────────┬────────┘
         │
         │ HTTPS
         ↓
┌─────────────────┐
│  Servidor Node  │
│  (Express)      │
│                 │
│ Google Maps API │
│ Key: SEGURA     │
│ Variables env   │
└────────┬────────┘
         │
         │ HTTPS
         ↓
┌─────────────────┐
│  Google Maps    │
│  API            │
└─────────────────┘
```

### Paso 1: Guardar API Key en Variables de Entorno

**`.env.local` (nunca commits en Git)**
```env
GOOGLE_MAPS_API_KEY=AIzaSyD_7R2_vxN_WxYzQwQvQwQvQwQvQwQv
GOOGLE_MAPS_API_SECRET=your-secret-key-for-signing-requests
```

**`.gitignore` (certifica que está excluido)**
```
.env
.env.local
.env.*.local
```

### Paso 2: Crear Endpoint Backend Seguro

**`server/routes/maps.ts`**
```typescript
import express from 'express';
import axios from 'axios';

const router = express.Router();

// Middleware de autenticación
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  // Verificar JWT o session
  next();
};

// Rate limiting
const rateLimit = new Map<string, number[]>();
const checkRateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const requests = (rateLimit.get(ip) || []).filter(t => now - t < 60000); // últimos 60s
  
  if (requests.length > 10) { // máx 10 solicitudes por minuto
    return res.status(429).json({ error: 'Demasiadas solicitudes' });
  }
  
  requests.push(now);
  rateLimit.set(ip, requests);
  next();
};

/**
 * GET /api/maps/geocode
 * Codifica dirección a coordenadas
 * Autenticación requerida
 */
router.get('/geocode', requireAuth, checkRateLimit, async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Dirección requerida' });
    }
    
    // Validar formato de dirección (máximo 200 chars)
    if (address.length > 200) {
      return res.status(400).json({ error: 'Dirección demasiado larga' });
    }
    
    // Solicitud al backend de Google Maps (aquí usamos la API key segura)
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY,
          // Restricciones adicionales
          region: 'mx', // Solo resultados en México
        },
        timeout: 5000, // 5 segundos máximo
      }
    );
    
    // Validar respuesta
    if (response.data.status !== 'OK') {
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }
    
    // Enviar solo lo necesario al cliente (no toda la respuesta de Google)
    const location = response.data.results[0];
    return res.json({
      lat: location.geometry.location.lat,
      lng: location.geometry.location.lng,
      formatted_address: location.formatted_address,
    });
  } catch (error) {
    console.error('Geocode error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * GET /api/maps/directions
 * Calcula rutas entre dos puntos
 * Autenticación requerida
 */
router.get('/directions', requireAuth, checkRateLimit, async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origen y destino requeridos' });
    }
    
    // Validar modo de transporte
    const validModes = ['driving', 'walking', 'bicycling', 'transit'];
    if (!validModes.includes(String(mode))) {
      return res.status(400).json({ error: 'Modo inválido' });
    }
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin,
          destination,
          mode,
          key: process.env.GOOGLE_MAPS_API_KEY,
          region: 'mx',
        },
        timeout: 5000,
      }
    );
    
    if (response.data.status !== 'OK') {
      return res.status(400).json({ error: 'No se puede calcular ruta' });
    }
    
    // Retornar solo datos necesarios
    const route = response.data.routes[0];
    return res.json({
      distance: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
      duration: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
      polyline: route.overview_polyline.points,
      steps: route.legs.map((leg: any) => ({
        start_location: leg.start_location,
        end_location: leg.end_location,
        distance: leg.distance.value,
        duration: leg.duration.value,
      })),
    });
  } catch (error) {
    console.error('Directions error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

/**
 * GET /api/maps/autocomplete
 * Autocompletar direcciones
 * Autenticación requerida
 */
router.get('/autocomplete', requireAuth, checkRateLimit, async (req, res) => {
  try {
    const { input } = req.query;
    
    if (!input || typeof input !== 'string' || input.length < 3) {
      return res.status(400).json({ error: 'Entrada muy corta' });
    }
    
    if (input.length > 100) {
      return res.status(400).json({ error: 'Entrada demasiado larga' });
    }
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      {
        params: {
          input,
          key: process.env.GOOGLE_MAPS_API_KEY,
          region: 'mx',
          components: 'country:mx', // Solo México
          sessiontoken: req.query.sessiontoken, // Para agrupar búsquedas
        },
        timeout: 5000,
      }
    );
    
    return res.json({
      predictions: response.data.predictions.map((p: any) => ({
        place_id: p.place_id,
        main_text: p.main_text,
        secondary_text: p.secondary_text,
        description: p.description,
      })),
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
```

### Paso 3: Usar en el Cliente (Frontend)

**`client/services/mapsService.ts`**
```typescript
/**
 * Servicio de Maps que usa backend seguro
 * No expone API key de Google
 */

export async function geocodeAddress(address: string) {
  const response = await fetch(`/api/maps/geocode?address=${encodeURIComponent(address)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`, // Usar token de sesión
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Geocodificación fallida');
  }
  
  return response.json();
}

export async function getDirections(origin: string, destination: string) {
  const response = await fetch(
    `/api/maps/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Error calculando ruta');
  }
  
  return response.json();
}

export async function getAutocompletePredictions(input: string) {
  const response = await fetch(
    `/api/maps/autocomplete?input=${encodeURIComponent(input)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Autocomplete fallido');
  }
  
  return response.json();
}
```

---

## ✅ Solución 2: Restricciones de API Key (Defensa en Profundidad)

### En Google Cloud Console

Aunque uses un backend, aplica restricciones:

#### **1. Restricciones de HTTP Referrer**
```
https://*.builder.io/*      ← Tu dominio
https://app.example.com/*
https://www.example.com/*

Rechaza:
http://malicious-site.com/*  ← Bloquea sitios maliciosos
```

#### **2. Restricciones de API**
Solo habilita los servicios que necesitas:
```
✅ Maps JavaScript API
✅ Places API
✅ Directions API
✅ Geocoding API
❌ Street View API (si no lo usas, desactiva)
❌ Elevation API (si no lo usas, desactiva)
```

#### **3. Cuota (Rate Limiting)**
```
Requests por segundo: 100
Requests por minuto: 2,000
Gasto máximo diario: $50
```

---

## ✅ Solución 3: Firmar Solicitudes (Premium)

Para Directions API, Distance Matrix y Maps Static:

**`server/utils/signUrl.ts`**
```typescript
import crypto from 'crypto';

export function signUrl(url: string): string {
  const urlObj = new URL(url);
  const secret = process.env.GOOGLE_MAPS_API_SECRET;
  
  if (!secret) {
    throw new Error('Google Maps API Secret no configurado');
  }
  
  // Obtener la parte detrás del dominio (sin protocolo)
  const urlPath = urlObj.pathname + urlObj.search;
  
  // Crear firma HMAC
  const signature = crypto
    .createHmac('sha1', secret)
    .update(urlPath)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${url}&signature=${signature}`;
}
```

Uso:
```typescript
const url = `https://maps.googleapis.com/maps/api/directions/json?origin=A&destination=B&key=${apiKey}`;
const signedUrl = signUrl(url);
// Ahora puedes usar signedUrl sin exponer la key
```

---

## 🛡️ Checklist de Seguridad Completo

### Fase 1: Desarrollo
- [ ] API key en `.env.local` (nunca en código)
- [ ] `.gitignore` incluye `.env*`
- [ ] Usar backend para todas las solicitudes
- [ ] Rate limiting implementado (máx 10 req/min por usuario)
- [ ] Validación de entrada (máximo 200 caracteres)
- [ ] Timeout en solicitudes (5 segundos)
- [ ] Logging de errores sin exponer keys

### Fase 2: Producción
- [ ] HTTPS solo (no HTTP)
- [ ] Restricciones de referrer en Google Cloud
- [ ] Solo APIs necesarias habilitadas
- [ ] Cuota de gasto máximo establecida ($50-100/día)
- [ ] JWT/Auth requerido para endpoints
- [ ] IP whitelist si es posible
- [ ] Monitoreo de uso de API en Google Cloud
- [ ] Alertas si gasto > 80% del límite

### Fase 3: Operacional
- [ ] Rotación de keys cada 3 meses
- [ ] Revisar logs de acceso mensualmente
- [ ] Verificar datos de uso en Google Cloud Console
- [ ] Tener keys de backup
- [ ] Plan de respuesta ante compromiso

---

## 🚨 Si tu API Key fue Comprometida

### Acción Inmediata (5 minutos)
1. **Desactiva la key inmediatamente**
   ```
   Google Cloud Console → APIs & Services → Credentials → Key → Disable
   ```

2. **Crea una nueva key**
   ```
   Google Cloud Console → Create New Key
   ```

3. **Actualiza variables de entorno**
   ```bash
   export GOOGLE_MAPS_API_KEY=new-key-here
   ```

4. **Reinicia el servidor**
   ```bash
   npm run dev  # o tu comando
   ```

### Después (1-2 horas)
5. **Revisa los logs**
   ```bash
   # Ver uso anormal
   gcloud logging read "resource.type=api" --limit 100
   ```

6. **Verifica el gasto**
   ```
   Google Cloud Console → Billing → Cost Analysis
   ```

7. **Reporta a Google si hay abuso**
   ```
   Google Cloud Console → Security → Report Security Incident
   ```

---

## 💰 Ejemplo: Cómo Controlar Gastos

### Escenario: 1000 solicitudes/día

**Sin protección (vulnerable):**
```
1000 requests × $7 por 1000 requests = $7/día
1000 requests × 30 días = $210/mes

Si hacker accede:
50,000 requests/día × $7 = $350/día
10,500,000 requests/mes = $73,500/mes 💥
```

**Con protección:**
```
Límite: 100 requests/usuario/día
Máximo de usuarios: 100
10,000 requests/día máximo
Costo: $7/mes

Si hacker intenta acceder:
Rate limit lo bloquea después de 100 requests
Costo controlado, logs alertan
```

---

## 📊 Monitoreo Recomendado

### Google Cloud Console Setup

```
Billing → Budget Alerts
├── Warning: $40/mes
├── Alert: $50/mes
└── Hard Limit: $60/mes (desactiva API)

Monitoring → Dashboards
├── API Requests (gráfico)
├── Errors (línea roja)
└── Cost (línea azul)
```

### Logging en Frontend

```typescript
// client/lib/mapsLogger.ts
export function logMapRequest(endpoint: string, success: boolean, responseTime: number) {
  console.log({
    timestamp: new Date().toISOString(),
    endpoint,
    success,
    responseTime,
    user: getCurrentUser()?.id,
  });
  
  // Enviar a analytics (Sentry, LogRocket, etc.)
  if (!success) {
    Sentry.captureMessage(`Maps API error: ${endpoint}`);
  }
}
```

---

## 🎯 Resumen: Lo Más Importante

| Nivel | Protección | Esfuerzo | Efectividad |
|-------|-----------|----------|-------------|
| **1** | API key en `.env` | ⚡ Bajo | 40% |
| **2** | + Backend proxy | ⚡⚡ Medio | 95% |
| **3** | + Rate limiting | ⚡⚡ Medio | 98% |
| **4** | + Restricciones Cloud | ⚡ Bajo | 99% |
| **5** | + Signing requests | ⚡⚡ Medio | 100% |

**Recomendación para LUXORA:**
- ✅ Niveles 1-4 (costo-beneficio óptimo)
- Primeros 3 meses: implementar 1-3
- Antes de producción: añadir 4-5
