# MobileUpdate — FamilyCart Mobile (Expo)

Registro de todos los cambios realizados para agregar la app móvil nativa al monorepo.

---

## Contexto

FamilyCart es una app de lista de compras compartida en familia. Hasta este punto existía:
- `apps/web` → React + Vite (PWA)
- `apps/api` → NestJS (autenticación por cookie + JWT)

El objetivo de esta iteración fue scaffoldear `apps/mobile` con Expo (React Native) para generar un APK beta distribuible sin necesitar la Play Store.

---

## 1. Estructura creada: `apps/mobile/`

```
apps/mobile/
├── index.js                        ← Entry point (registerRootComponent)
├── app.json                        ← Config Expo: nombre, scheme, iconos, package
├── babel.config.js                 ← babel-preset-expo
├── metro.config.js                 ← Metro configurado para monorepo npm workspaces
├── tsconfig.json                   ← Extiende tsconfig.base.json, paths a packages/
├── eas.json                        ← Perfiles de build: preview (APK) / production (AAB)
├── package.json                    ← Dependencias Expo + React Navigation + Zustand + TanStack
└── src/
    ├── App.tsx                     ← Raíz: providers (QueryClient, GestureHandler, SafeArea)
    ├── navigation/
    │   └── index.tsx               ← React Navigation + deep linking (familycart://)
    ├── screens/
    │   ├── LoginScreen.tsx         ← OAuth Google via expo-web-browser
    │   ├── FamilySetupScreen.tsx   ← Crear familia / unirse con código
    │   ├── HomeScreen.tsx          ← Lista de listas con Socket.io en tiempo real
    │   └── ListDetailScreen.tsx    ← Items + gastos + settle en tiempo real
    ├── components/
    │   ├── Spinner.tsx
    │   └── UserAvatar.tsx
    ├── hooks/
    │   ├── useFamilies.ts          ← Mismo contrato que la web
    │   ├── useLists.ts
    │   └── useListDetail.ts
    ├── store/
    │   └── auth.store.ts           ← Zustand + expo-secure-store (reemplaza localStorage)
    └── lib/
        ├── config.ts               ← API_URL (10.0.2.2 en emulador, IP local en físico)
        ├── api.ts                  ← Bearer token en lugar de cookies
        └── socket.ts               ← Socket.io con token en auth options
```

---

## 2. Decisiones de arquitectura

### Auth: de cookies a JWT Bearer

| | Web | Mobile |
|---|---|---|
| Storage | Cookie `access_token` (httpOnly) | `expo-secure-store` (cifrado en dispositivo) |
| Envío al servidor | Automático con `credentials: 'include'` | `Authorization: Bearer <token>` en cada request |
| OAuth redirect destino | `http://localhost:3000/auth/callback` | `familycart://auth/callback?token=<jwt>` |

### Configuración Metro para monorepo

`metro.config.js` necesita `watchFolders` apuntando a la raíz del monorepo para que Metro resuelva los paquetes compartidos (`@familycart/types`, `@familycart/core`).

```js
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
```

### EAS Build

`eas.json` tiene tres perfiles:
- `development` → build con Expo Dev Client (para desarrollo)
- `preview` → **APK** para distribución interna (beta sin Play Store)
- `production` → **AAB** para Play Store

Comando para generar el APK beta:
```bash
cd apps/mobile
npm run build:apk
# equivalente a: eas build --platform android --profile preview
```

---

## 3. Cambios en el backend (`apps/api`)

### 3.1 `auth/guards/google-auth.guard.ts`

**Antes:** Guard vacío, sin lógica adicional.

**Después:** Sobreescribe `getAuthenticateOptions` para pasar `state: 'mobile'` a Passport cuando la request viene con `?mobile=1`. Google devuelve el mismo `state` en el callback, permitiéndonos detectar el origen del login.

```typescript
getAuthenticateOptions(context: ExecutionContext) {
  const req = context.switchToHttp().getRequest<Request>();
  if (req.query.mobile === '1') {
    return { state: 'mobile' };
  }
  return {};
}
```

### 3.2 `auth/auth.controller.ts` — `googleCallback`

**Antes:** Siempre seteaba cookie + redirigía a la URL web.

**Después:** Detecta `req.query.state === 'mobile'` y bifurca:
- **Mobile** → redirige a `familycart://auth/callback?token=<jwt>` (deep link)
- **Web** → comportamiento original sin cambios

```typescript
const isMobile = req.query.state === 'mobile';

if (isMobile) {
  return res.redirect(
    `familycart://auth/callback?token=${encodeURIComponent(accessToken)}`,
  );
}
// ... flujo web original
```

### 3.3 `auth/strategies/jwt.strategy.ts`

**Antes:** Solo extraía el JWT de la cookie `access_token`.

**Después:** Intenta extraer de dos fuentes en orden:
1. Cookie `access_token` (web — sin cambio de comportamiento)
2. Header `Authorization: Bearer <token>` (mobile)

```typescript
jwtFromRequest: ExtractJwt.fromExtractors([
  (req: Request) => req?.cookies?.access_token ?? null,  // web
  ExtractJwt.fromAuthHeaderAsBearerToken(),              // mobile
]),
```

Este cambio es **retrocompatible**: la web sigue funcionando exactamente igual. Solo se agrega un segundo extractor como fallback.

---

## 4. Flujo OAuth mobile completo

```
1. Usuario toca "Continuar con Google" en la app
2. expo-web-browser abre: GET /api/auth/google?mobile=1
3. GoogleAuthGuard detecta mobile=1 → pasa state='mobile' a Passport
4. Passport redirige a Google con state=mobile en la URL
5. Usuario da consent en Google
6. Google redirige a: GET /api/auth/google/callback?code=xxx&state=mobile
7. Controller detecta state=mobile → genera auth code temporal → redirige a:
   familycart://auth/callback?code=<24-bytes-base64url>
8. Expo intercepta el deep link → extrae el code
9. App llama a POST /api/auth/exchange con { code }
10. Server invalida el code, busca el usuario completo en DB, genera y devuelve JWT + user
11. App guarda user + token en Zustand + SecureStore
12. Todos los requests siguientes llevan Authorization: Bearer <jwt>
12. App navega a HomeScreen
```

---

## 5. Dependencias instaladas en `apps/mobile`

| Paquete | Versión | Propósito |
|---|---|---|
| `expo` | ~52.0.0 | Framework base |
| `expo-web-browser` | ~14.0.0 | Abrir OAuth en browser in-app |
| `expo-secure-store` | ~14.0.0 | Almacenamiento cifrado del JWT |
| `expo-linking` | ~7.0.0 | Deep linking (capturar el token) |
| `expo-status-bar` | ~2.0.0 | Barra de estado nativa |
| `@react-navigation/native` | ^6.x | Navegación entre pantallas |
| `@react-navigation/native-stack` | ^6.x | Stack navigator |
| `react-native-screens` | ~4.3.0 | Optimización de pantallas |
| `react-native-safe-area-context` | 4.12.0 | Insets seguros (notch, etc.) |
| `react-native-gesture-handler` | ~2.20.0 | Gestos nativos |
| `@tanstack/react-query` | ^5.66.0 | Cache y estado servidor (igual que web) |
| `zustand` | ^5.0.3 | Estado global (igual que web) |
| `socket.io-client` | ^4.8.1 | Tiempo real (igual que web) |

---

## 6. Próximos pasos para llegar al APK beta

1. **Crear cuenta en expo.dev** (gratis)
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Inicializar EAS en el proyecto**
   ```bash
   cd apps/mobile
   eas init
   # Copia el projectId generado en app.json > extra.eas.projectId
   ```

3. **Crear los assets placeholder** (hasta tener diseño definitivo)
   ```
   apps/mobile/assets/icon.png           (1024×1024)
   apps/mobile/assets/splash-icon.png    (200×200)
   apps/mobile/assets/adaptive-icon.png  (1024×1024)
   ```

4. **Verificar la URL del servidor** en `src/lib/config.ts`
   - Emulador Android: `http://10.0.2.2:3001`
   - Dispositivo físico: `http://<TU_IP_LOCAL>:3001`

5. **Generar el APK**
   ```bash
   npm run build:apk
   # Tarda ~10 min en la nube de Expo. Devuelve un link de descarga directo.
   ```

6. **Instalar el APK en el dispositivo**
   - Descargar el `.apk` desde el link de EAS
   - En el Android: Ajustes → Seguridad → Permitir fuentes desconocidas
   - Instalar el `.apk`

---

## 7. Configuración de Google OAuth Console

Para que el deep link funcione en producción, agregar el siguiente URI de redirección autorizado en [Google Cloud Console](https://console.cloud.google.com/):

```
# Para desarrollo (Expo Go):
exp://localhost:8081/--/auth/callback

# Para el APK con scheme propio:
familycart://auth/callback
```

**Ruta:** APIs & Services → Credentials → OAuth 2.0 Client IDs → tu client → Authorized redirect URIs

---

## 8. Correcciones de seguridad pre-beta

### 8.1 Token JWT expuesto en URL de deep link

**Problema:** El JWT se pasaba como query parameter en el redirect de OAuth (`familycart://auth/callback?token=<jwt>`), exponiéndolo a:
- Logs del sistema operativo y navegadores
- Apps de monitoreo de pantalla
- Shared clipboard
- Historial del dispositivo

**Solución:** Se implementó un flujo de Authorization Code de un solo uso:
1. El backend genera un código temporal (`authCode`) de 24 bytes (5 min de TTL)
2. El código se pasa por URL (no es sensible porque es de un solo uso y expira)
3. La app mobile intercambia el código por el JWT real vía `POST /api/auth/exchange`
4. El código se invalida inmediatamente después de usarse

**Archivos modificados:**
- `apps/api/src/auth/auth.service.ts` - Agregado `createAuthCode()` y `exchangeAuthCode()`
- `apps/api/src/auth/auth.controller.ts` - Nuevo endpoint `POST /auth/exchange`, modificado `googleCallback`
- `apps/mobile/src/screens/LoginScreen.tsx` - Usa el nuevo flujo de exchange

### 8.2 redirect_uri no validado

**Problema:** El `redirect_uri` enviado por el cliente no se validaba contra una whitelist, permitiendo ataques de redirección OAuth.

**Solución:** Se agregó validación en `GoogleAuthGuard`:
- Schemes permitidos: `familycart`, `http`, `https`
- Para scheme `familycart://`, solo permite path `auth/callback`
- Para schemes HTTP/HTTPS, valida contra dominios whitelistados (`WEB_URL`, `API_URL`)

**Archivos modificados:**
- `apps/api/src/auth/guards/google-auth.guard.ts` - Agregado `validateRedirectUri()` y `canActivate()`

### 8.3 Socket.io no funcionaba en mobile

**Problema:** El gateway solo leía tokens desde cookies (`access_token`), pero la app mobile envía el token en `socket.handshake.auth.token`.

**Solución:** Se modificó `handleConnection()` para probar ambas fuentes:
1. Primero: `client.handshake.auth?.token` (mobile)
2. Segundo: cookie `access_token` (web)

**Archivos modificados:**
- `apps/api/src/lists/list.gateway.ts` - `handleConnection()` ahora soporta ambos métodos

### 8.4 Sin rate limiting en endpoints de auth

**Problema:** No había protección contra ataques de fuerza bruta en los endpoints de autenticación.

**Solución:** Se agregó `@Throttle` al endpoint `/auth/exchange`:
- 10 intentos por minuto por IP

**Archivos modificados:**
- `apps/api/src/auth/auth.controller.ts` - Agregado `@Throttle({ default: { ttl: 60_000, limit: 10 } })`

### 8.5 CORS restrictivo

**Problema:** CORS solo permitía requests desde `WEB_URL`, limitando flexibilidad.

**Solución:** Se agregaron orígenes adicionales a la whitelist de CORS:
- `WEB_URL` (web app)
- `MOBILE_SCHEME` (para futuras necesidades)

**Archivos modificados:**
- `apps/api/src/main.ts` - `enableCors()` ahora acepta array de orígenes configurables

---

## 9. Bugs corregidos post-revisión

### 9.1 `exchangeAuthCode` devolvía usuario vacío

**Problema:** `AuthService.exchangeAuthCode()` llamaba a `login({ id: authCode.userId } as UserEntity)` sin buscar el usuario completo en la base de datos. El método `login()` arma el JWT con `email: user.email` y construye el objeto `user` con `name` y `picture` — todos `undefined` al castear un objeto parcial. El JWT resultante tenía `{ sub: userId, email: undefined }` y la app mobile recibía un usuario sin nombre ni foto, dejando la UI sin datos.

**Solución:** Se inyectó `UsersService` en `AuthService` y se agregó `await usersService.findById(authCode.userId)` antes de llamar a `login()`. Si el usuario no existe, devuelve `null` (el controller responde 401). El código se invalida (`used = true`) antes del `await` para evitar race conditions.

**Archivos modificados:**
- `apps/api/src/auth/auth.service.ts` — inyección de `UsersService`, `exchangeAuthCode` ahora es `async` y busca el usuario completo
- `apps/api/src/auth/auth.controller.ts` — agregado `await` al llamar `exchangeAuthCode`

### 9.2 WebSocket rechazaba conexiones de clientes nativos (React Native)

**Problema:** El `@WebSocketGateway` tenía `cors: { origin: process.env.WEB_URL }` como string fijo. Los clientes de navegador envían el header `Origin` y son validados correctamente. Los clientes nativos (React Native / APK) **no envían `Origin`** porque CORS es una restricción de navegador, no de apps nativas. Cuando `origin` llega como `undefined`, la config de socket.io la rechaza, impidiendo que el APK conecte por WebSocket y dejando el tiempo real completamente roto en mobile.

**Solución:** Se reemplazó el string fijo por una función de origen que bifurca:
- Sin `Origin` (cliente nativo) → se permite, la autenticación real ya la hace el JWT en el handshake.
- Con `Origin` (navegador) → se valida contra `WEB_URL`, rechazando cualquier otro dominio.

**Archivos modificados:**
- `apps/api/src/lists/list.gateway.ts` — `cors.origin` cambiado de string a función validadora

---

## 10. Variables de entorno necesarias

```env
# .env para API
JWT_SECRET=tu-secret-aqui
JWT_EXPIRES_IN=7d
WEB_URL=http://localhost:3000
API_URL=http://localhost:3001
MOBILE_SCHEME=familycart://
NODE_ENV=development
```
