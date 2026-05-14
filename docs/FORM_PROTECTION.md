# Protección de Datos de Formularios

## Problema Original

El usuario reportaba que cuando estaba registrando información en formularios, la pantalla se resetaba y perdía los datos sin guardar. Esto puede suceder por:

1. **HMR (Hot Module Reload)** de Vite durante desarrollo
2. **Navegación accidental** fuera del formulario
3. **Cierre de navegador/pestaña** con cambios sin guardar
4. **Cambios no intencionales** del usuario

## Solución Implementada

Se creó un sistema de **protección de formularios** que:

- ✅ Detecta cambios sin guardar
- ✅ Muestra banner de advertencia
- ✅ Previene navegación/cierre sin confirmación
- ✅ Guía al usuario a guardar cambios

---

## Componentes Creados

### 1. `client/hooks/useUnsavedChanges.ts`

**Hook principal** que previene:
- Cierre de pestaña/navegador con cambios sin guardar
- Navegación a otra ruta sin confirmación

```typescript
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

// En tu componente
useUnsavedChanges({
  isDirty: cambiosDetectados,
  message: "Tienes cambios sin guardar..."
});
```

### 2. `client/hooks/useFormDirty.ts`

**Hook de detección** que compara estado original vs actual:

```typescript
import { useFormDirty } from "@/hooks/useFormDirty";

const originalUser = getCurrentUser();
const [editingUser, setEditingUser] = useState(originalUser);

const isDirty = useFormDirty(originalUser, editingUser);
```

### 3. `client/components/forms/UnsavedChangesBanner.tsx`

**Componente visual** que muestra un banner fijo en la parte inferior:

```tsx
<UnsavedChangesBanner
  isDirty={isDirty && showWarning}
  onDismiss={() => setShowWarning(false)}
  showDismiss={true}
/>
```

---

## Cómo Integrar en Otras Páginas

### Paso 1: Importar los componentes

```typescript
import { useFormDirty } from "@/hooks/useFormDirty";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesBanner } from "@/components/forms/UnsavedChangesBanner";
```

### Paso 2: Agregar estado para original

```typescript
const [active, setActive] = useState<MyFormType | null>(null);
const [originalActive, setOriginalActive] = useState<MyFormType | null>(null);
const [showUnsavedWarning, setShowUnsavedWarning] = useState(true);
```

### Paso 3: Detectar cambios

```typescript
const isDirty = useFormDirty(originalActive ?? {}, active ?? {});
useUnsavedChanges({ isDirty });
```

### Paso 4: Guardar original cuando se abre formulario

```typescript
const openForm = (item: MyFormType) => {
  setActive(item);
  setOriginalActive(item);  // ← Importante
  setShowUnsavedWarning(true);
};
```

### Paso 5: Confirmar antes de salir

```typescript
const goBack = () => {
  if (isDirty) {
    if (!confirm("¿Descartar cambios sin guardar?")) {
      return;
    }
  }
  setActive(null);
  setOriginalActive(null);
};
```

### Paso 6: Resetear después de guardar

```typescript
const save = () => {
  // ... lógica de guardado ...
  setOriginalActive(null);  // ← Resetea para no mostrar warning
};
```

### Paso 7: Agregar banner al JSX

```tsx
<>
  <UnsavedChangesBanner
    isDirty={isDirty && showUnsavedWarning}
    onDismiss={() => setShowUnsavedWarning(false)}
  />
  {/* tu contenido del formulario */}
</>
```

---

## Ejemplo Completo (Usuarios.tsx)

```typescript
import { useFormDirty } from "@/hooks/useFormDirty";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesBanner } from "@/components/forms/UnsavedChangesBanner";

export default function Usuarios() {
  const [active, setActive] = useState<LuxUser | null>(null);
  const [originalActive, setOriginalActive] = useState<LuxUser | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(true);

  // Detectar cambios
  const isDirty = useFormDirty(originalActive ?? {}, active ?? {});
  useUnsavedChanges({ isDirty });

  const openEdit = (u: LuxUser) => {
    setActive(u);
    setOriginalActive(u);  // Guardar original
    setShowUnsavedWarning(true);
  };

  const goBack = () => {
    if (isDirty) {
      if (!confirm("¿Descartar cambios?")) return;
    }
    setActive(null);
    setOriginalActive(null);
  };

  const save = () => {
    saveUser(active);
    setOriginalActive(null);  // Resetear
    setActive(null);
  };

  return (
    <>
      <UnsavedChangesBanner isDirty={isDirty && showUnsavedWarning} />
      {/* formulario aquí */}
    </>
  );
}
```

---

## Comportamiento del Usuario

### Escenario 1: Cambios sin guardar + salida

1. Usuario edita formulario ✏️
2. Intenta salir o cierra navegador
3. **Banner aparece**: "Tienes cambios sin guardar"
4. **Popup aparece**: "¿Estás seguro?"
5. Usuario puede:
   - **Cancelar**: Vuelve a editar
   - **Aceptar**: Descarta cambios y sale

### Escenario 2: Guardado exitoso

1. Usuario edita formulario ✏️
2. Hace click en "Guardar"
3. Datos se persisten
4. **Banner desaparece**: Ya no hay cambios sin guardar
5. Usuario puede salir sin advertencias

### Escenario 3: Descartar warning

1. Usuario ve el banner de advertencia
2. Hace click en ✕ del banner
3. Banner desaparece (pero protección sigue activa)
4. Si intenta salir sin guardar, popup aparece de nuevo

---

## Páginas a Actualizar

Aplica este patrón a todas las páginas de formulario:

- ✅ `client/pages/Usuarios.tsx` (completado)
- ⏳ `client/pages/Empresas.tsx` (próximo)
- ⏳ `client/pages/Vehiculos.tsx` (próximo)
- ⏳ `client/pages/Reservaciones.tsx` (próximo - para formulario de creación)
- ⏳ Otros formularios según sea necesario

---

## Notas Técnicas

### Comparación de Cambios

El hook `useFormDirty` usa **comparación JSON**:

```typescript
const isDifferent = JSON.stringify(original) !== JSON.stringify(current);
```

Esto funciona bien para:
- ✅ Objetos simples
- ✅ Arrays
- ✅ Strings, números, booleans

Limitaciones:
- ❌ Funciones (se comparan como `undefined`)
- ❌ Objetos cíclicos

### Prevención de Navegación

`useBeforeUnload` es un hook de React Router v6.4+ que:

```typescript
useBeforeUnload(({ currentLocation, nextLocation }) => {
  if (isDirty) return "Mensaje de advertencia";
});
```

Y el `beforeunload` del navegador previene cierre:

```typescript
window.addEventListener("beforeunload", (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = "Mensaje";
  }
});
```

---

## Ventajas

✅ **Previene pérdida de datos** accidental  
✅ **UX clara** con warnings visuales  
✅ **Reutilizable** en cualquier formulario  
✅ **Configurable** (mensajes, comportamiento)  
✅ **Ligero** (sin dependencias externas)  
✅ **Compatible** con localStorage y API calls  

---

## Próximos Pasos

1. Aplicar a `Empresas.tsx`
2. Aplicar a `Vehiculos.tsx`
3. Aplicar a `Reservaciones.tsx` (crear/editar)
4. En producción: integrar con backend API y JWT
5. Agregar auto-save periódico (opcional)
