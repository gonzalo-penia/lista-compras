# TODO — FamilyCart

Bugs y mejoras pendientes identificados durante la revisión de seguridad pre-beta.

---

## Alta prioridad

### [ ] `NODE_ENV=production` en el servidor beta
**Problema:** Con `NODE_ENV=development`, TypeORM tiene `synchronize: true` activo y puede mutar el schema de la base de datos en caliente ante cualquier cambio en las entidades.
**Solución:** Asegurarse de que el servidor beta corra con `NODE_ENV=production`. Usar migraciones explícitas para cualquier cambio de schema.
**Archivo:** `apps/api/src/app.module.ts`

---

## Media prioridad

### [ ] Sin invalidación de tokens al cerrar sesión (mobile)
**Problema:** Cuando el usuario hace logout desde la app, el JWT se borra de `SecureStore` localmente pero sigue siendo válido en el servidor hasta su expiración (7 días). Si el token fue interceptado previamente, el atacante puede seguir usándolo.
**Solución A (corto plazo):** Reducir el TTL del JWT a 1–2 horas para limitar la ventana de exposición.
**Solución B (largo plazo):** Implementar una blacklist de tokens en Redis, o migrar a refresh tokens (JWT de 15 min + refresh token de larga vida almacenado en DB).
**Archivos:** `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/strategies/jwt.strategy.ts`

### [ ] Custom URI Scheme vulnerable a hijacking en Android
**Problema:** El scheme `familycart://` puede ser registrado por cualquier app instalada en el dispositivo. Una app maliciosa podría interceptar el auth code del deep link. El riesgo está mitigado por el hecho de que el code es de un solo uso y expira en 5 minutos, pero no es la solución definitiva.
**Solución:** Migrar a **Android App Links** (`https://familycart.app/auth/callback`) verificados mediante `assetlinks.json` alojado en el dominio. Android solo permite que la app propietaria del dominio maneje estos links.
**Archivos:** `apps/mobile/app.json` (agregar `intentFilters`), hosting del `assetlinks.json`

---

## Baja prioridad

### [ ] Sin `helmet` en la API
**Problema:** No se configuran headers de seguridad HTTP estándar (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, etc.).
**Solución:** Agregar `helmet` como middleware global en `main.ts`.
**Archivo:** `apps/api/src/main.ts`
```ts
import helmet from 'helmet';
app.use(helmet());
```

### [ ] `authCodes` Map en memoria
**Problema:** Los auth codes del flujo OAuth mobile se almacenan en un `Map` en memoria del proceso. Si el servidor se reinicia entre la creación y el canje del código, el usuario recibe un error y debe volver a hacer login. Además, no escala a múltiples instancias.
**Solución:** Mover el almacenamiento de auth codes a Redis con TTL nativo (`SET key value EX 300`). Para una instancia única es aceptable el estado actual.
**Archivo:** `apps/api/src/auth/auth.service.ts`

### [ ] WS throttle en memoria
**Mismo problema que el punto anterior:** el `eventLog` Map del gateway se pierde en reinicios y no comparte estado entre instancias.
**Solución:** Mover a Redis al mismo tiempo que los auth codes.
**Archivo:** `apps/api/src/lists/list.gateway.ts`

### [ ] Sin refresh tokens
**Problema:** El JWT tiene 7 días de vida. Pasado ese tiempo el usuario debe hacer login nuevamente con Google. No hay mecanismo de renovación silenciosa.
**Solución:** Implementar refresh tokens: JWT de corta vida (15–60 min) + refresh token opaco de larga vida almacenado en DB, renovable vía `POST /auth/refresh`.
**Nota:** Este punto está relacionado con la invalidación de tokens (media prioridad). Conviene resolverlos juntos.
