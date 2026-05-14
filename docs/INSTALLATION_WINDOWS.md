# Instalación de LUXORA en Windows 8

Guía paso a paso para instalar y ejecutar LUXORA localmente en Windows 8 con Visual Studio Code.

⚠️ **Nota Importante:** Windows 8 es antiguo (2012). Se recomienda actualizar a Windows 10+ para mejor compatibilidad. Las versiones de software disponibles para Windows 8 son limitadas.

---

## Requisitos Previos

- **Windows 8** (o Windows 8.1)
- **Visual Studio Code** (última versión compatible con Windows 8)
- **Node.js v16.x LTS** (NO v18+ - incompatible con Windows 8)
- **npm v7.x** (viene con Node v16)
- **Git** (opcional pero recomendado)
- **5 GB de espacio libre** en disco
- **Administrator rights** (derechos de administrador)

---

## Paso 1: Instalar Node.js v16 (IMPORTANTE para Windows 8)

Node.js es necesario para ejecutar la aplicación. **Windows 8 solo soporta Node.js v16.x**, no versiones más nuevas.

### 1.1 Descargar Node.js v16 LTS
1. Ve a https://nodejs.org/en/download/releases/
2. Busca **v16.20.0 LTS** (última versión v16)
3. Descarga el instalador Windows (.msi) - versión de 64 bits si tu Windows es 64-bit
4. Ejecuta el instalador como administrador (clic derecho → "Ejecutar como administrador")
5. Sigue las instrucciones de instalación

### 1.2 Verificar la Instalación
Abre **CMD** (símbolo del sistema) como administrador y ejecuta:
```bash
node --version
npm --version
```

Deberías ver versiones como:
```
v16.20.0
7.20.0
```

⚠️ Si ves v18+, NO funcionará en Windows 8. Desinstala e instala v16.

---

## Paso 2: Instalar Visual Studio Code

⚠️ **Nota:** Las versiones recientes de VS Code (v1.84+) NO funcionan en Windows 8. Descarga la última versión compatible.

### 2.1 Descargar e Instalar
1. Ve a https://code.visualstudio.com/docs/supporting/requirements
2. Busca la sección de Windows 8 / Windows Server 2012
3. Descarga **VS Code versión 1.82.x** o anterior (última compatible)
4. O ve a https://code.visualstudio.com/docs/setup/windows y descarga desde "System Installer"
5. Ejecuta el instalador
6. Sigue las instrucciones de instalación estándar

### 2.2 Extensiones Recomendadas
Una vez instalado VS Code, instala estas extensiones:
- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **TypeScript Vue Plugin** (Vue.volar)
- **Thunder Client** o **REST Client** (para probar APIs)

---

## Paso 3: Obtener el Código de LUXORA

### Opción A: Descargar ZIP (Más Simple para Windows 8)

1. Ve a https://github.com/BuilderIO/fusion-starter
2. Click en **Code** → **Download ZIP**
3. Extrae la carpeta en tu disco (ejemplo: `C:\proyectos\LUXORA`)
4. Abre **CMD** (símbolo del sistema) en esa carpeta
   - Navega con: `cd C:\proyectos\LUXORA`

### Opción B: Clonar con Git (Si tienes Git instalado)

1. Instala Git desde https://git-scm.com/
2. Abre **CMD** en la carpeta donde quieras el proyecto
3. Ejecuta:
```bash
git clone https://github.com/BuilderIO/fusion-starter.git LUXORA
cd LUXORA
```

---

## Paso 4: Instalar Dependencias

En **CMD** (símbolo del sistema), en la carpeta del proyecto, ejecuta:

```bash
npm install
```

Esto descargará e instalará todas las librerías necesarias (~500 MB, puede tomar 10-15 minutos en Windows 8).

Si hay errores, intenta:
```bash
npm install --legacy-peer-deps
```

---

## Paso 5: Configurar Variables de Entorno

### 5.1 Crear archivo .env
En la raíz del proyecto, crea un archivo llamado `.env` con:

```env
# Google Maps API Key (obtén una en https://console.cloud.google.com/)
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui

# Node environment
NODE_ENV=development
```

### 5.2 Obtener Google Maps API Key
1. Ve a https://console.cloud.google.com/
2. Crea un proyecto nuevo
3. Habilita: Maps JavaScript API, Places API, Directions API
4. Crea una clave de API
5. Pégala en el archivo `.env`

---

## Paso 6: Abrir el Proyecto en VS Code

Opción 1 - Desde CMD:
```bash
code .
```

Opción 2 - Manualmente:
1. Abre VS Code
2. Archivo → Abrir Carpeta
3. Selecciona la carpeta LUXORA (ejemplo: `C:\proyectos\LUXORA`)
4. Click "Seleccionar Carpeta"

---

## Paso 7: Iniciar el Servidor de Desarrollo

En CMD (desde la carpeta del proyecto):
```bash
npm run dev
```

Deberías ver algo como:
```
VITE v8.0.2  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

**NO cierres esta ventana.** Déjala abierta mientras desarrollas.

---

## Paso 8: Acceder a la Aplicación

En tu navegador (Chrome, Firefox, Edge):
- Ve a: **http://localhost:5173/**

Deberías ver la página de inicio de LUXORA.

---

## Paso 9: Crear Cuenta y Login

1. Click en "Sign Up" o "Registrarse"
2. Ingresa:
   - Email
   - Contraseña
3. Verifica el email (código de ejemplo: 000000)
4. Acepta términos de uso
5. ¡Listo! Estás dentro de la aplicación

---

## Solución de Problemas en Windows 8

### ❌ Error: "Node.js version not compatible"
**Solución:** Desinstala Node.js y descarga v16.20.0 (no v18+)
```bash
node --version  # Debe ser v16.x
```

### ❌ Error: "Port 5173 already in use"
**Solución:** El puerto ya está ocupado. Usa otro:
```bash
npm run dev -- --port 3000
```
Luego accede a http://localhost:3000/

### ❌ Error: "Cannot find module..."
**Solución:** Reinstala las dependencias:
```bash
# En Windows 8, a veces npm tiene problemas. Intenta esto:
npm install --legacy-peer-deps
```

### ❌ Error: "npm: command not found"
**Solución:** Node.js no está en el PATH. Reinicia Windows o:
1. Desinstala Node.js
2. Reinicia Windows
3. Reinstala Node.js

### ❌ Error: "Google Maps API Key required"
**Solución:**
1. Verifica que `.env` tenga la clave correcta
2. Guarda el archivo
3. Reinicia el servidor (Ctrl+C y escribe `npm run dev`)

### ❌ Aplicación muy lenta en Windows 8
**Solución:**
1. Windows 8 es antiguo. Si es posible, actualiza a Windows 10+
2. Cierra navegadores y aplicaciones pesadas
3. Aumenta RAM si es posible (mínimo 8GB recomendado)

---

## Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de build
npm run preview

# Validar TypeScript
npm run type-check

# Limpiar caché y reinstalar
npm install --legacy-peer-deps

# Matar el proceso en el puerto
netstat -ano | findstr :5173
taskkill /PID {numero_pid} /F
```

---

## Estructura de Carpetas

```
LUXORA/
├── client/              # Código frontend (React)
│   ├── pages/          # Páginas principales
│   ├── components/     # Componentes reutilizables
│   ├── lib/            # Lógica y utilidades
│   ├── data/           # Datos y configuración
│   └── hooks/          # React hooks personalizados
├── server/             # Código backend (Express)
├── public/             # Archivos estáticos
├── .env               # Variables de entorno (crear)
├── package.json       # Dependencias del proyecto
├── tsconfig.json      # Configuración de TypeScript
└── vite.config.ts     # Configuración de Vite
```

---

## Características Principales (Qué Puedes Hacer)

Una vez que la app esté corriendo:

✅ **Cotizaciones** - Calcular rentales con Google Maps
✅ **Vehículos** - Gestionar flota de camiones/vans
✅ **Operadores** - Manejar conductores y sus tarifas
✅ **Usuarios** - KYC y gestión de identidad
✅ **Reservaciones** - Workflow de rentales
✅ **Dashboard** - Métricas y reportes

---

## Desarrollar Cambios

### Editar Componentes
1. Abre un archivo en `client/pages/` o `client/components/`
2. Realiza cambios
3. El servidor recargará automáticamente (HMR - Hot Module Reload)
4. Mira los cambios en el navegador al instante

### Crear Nuevos Componentes
```bash
# Crear archivo en client/components/
# Ejemplo: client/components/miComponente.tsx

export function MiComponente() {
  return (
    <div>Mi componente</div>
  );
}
```

### Agregar Rutas
En `client/App.tsx`:
```typescript
<Route path="/mi-ruta" element={<ProtectedRoute><MiPagina /></ProtectedRoute>} />
```

---

## Compilar para Producción

```bash
npm run build
```

Esto crea una carpeta `dist/` con los archivos optimizados listos para desplegar.

---

## Desplegar a Internet (Opcional)

### Con Netlify
1. Conecta tu repositorio Git a Netlify
2. Netlify detecta automáticamente que es un Vite project
3. Se despliega automáticamente en cada push

### Con Vercel
1. Importa el proyecto desde GitHub
2. Click en Deploy
3. Tu app estará en vivo en una URL pública

---

## Próximos Pasos

1. **Explora la aplicación** - Prueba todas las páginas
2. **Lee la documentación** - Ver `docs/` en el proyecto
3. **Personaliza datos** - Cambia colores, textos, etc.
4. **Integra tu API** - Conecta a un backend real
5. **Desplega** - Sube a producción

---

## Soporte

Si tienes problemas:
1. Verifica que Node.js esté correctamente instalado
2. Elimina `node_modules` y reinstala
3. Revisa los logs en la terminal
4. Consulta la documentación en la carpeta `docs/`

---

**¡Listo!** Ahora tienes LUXORA corriendo localmente en tu Windows. 🚀
