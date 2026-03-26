# ROADMAP — Deploy Mobile FamilyCart

Pasos ordenados para llegar al APK instalable en dispositivos reales y, opcionalmente,
publicar en Google Play Store.

---

## Fase 1 — Prerequisitos (una sola vez)

### 1.1 Cuentas necesarias

- [ ] **Cuenta Expo** → https://expo.dev/signup (gratis, necesaria para EAS builds)
- [ ] **Cuenta Google Play Console** → https://play.google.com/console (u$s 25 pago único, solo si vas a publicar en Play Store)

### 1.2 CLI necesario

```bash
npm install -g eas-cli
eas login   # autenticarse con la cuenta Expo
```

---

## Fase 2 — Assets gráficos

El `app.json` referencia imágenes que **todavía no existen** en el proyecto
(`apps/mobile/assets/` está vacío).

- [ ] Crear la carpeta `apps/mobile/assets/`
- [ ] Generar los tres archivos requeridos:

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `icon.png` | 1024×1024 px, fondo sólido | Ícono en iOS y Android |
| `splash-icon.png` | 1284×2778 px | Pantalla de splash |
| `adaptive-icon.png` | 1024×1024 px, sin padding | Ícono adaptable Android |

> **Tip rápido:** Si no tenés diseño todavía, podés usar el color verde de la app
> (`#16a34a`) con las iniciales "FC" y avanzar con las demás fases. EAS falla el build
> si los archivos no existen.

---

## Fase 3 — Vincular el proyecto a EAS

El `projectId` en `apps/mobile/app.json` está vacío. Hay que inicializarlo:

```bash
cd apps/mobile
eas init
```

Esto completa el `extra.eas.projectId` con el ID del proyecto en tu cuenta Expo.
Hacer commit del `app.json` resultante.

---

## Fase 4 — Backend en producción

La app mobile en producción apunta a `https://api.familycart.app` (definido en
`apps/mobile/src/lib/config.ts`). Antes del primer build real, la API tiene que estar
corriendo con ese dominio y HTTPS.

### 4.1 Servidor

- [ ] Aprovisionar un servidor (VPS, Railway, Render, Fly.io, etc.)
- [ ] Apuntar el dominio `api.familycart.app` al servidor
- [ ] Configurar HTTPS (Let's Encrypt / proxy inverso como Caddy o nginx)

### 4.2 Base de datos

- [ ] PostgreSQL en producción (puede ser el mismo servidor o un servicio externo como Supabase, Railway, Neon)
- [ ] **No usar** el `docker-compose.yml` del repo en producción directamente

### 4.3 Variables de entorno en el servidor

```env
NODE_ENV=production
PORT=3001

JWT_SECRET=<secreto-largo-y-aleatorio>
JWT_EXPIRES_IN=2h          # reducir de 7d a 2h (ver TODO)

WEB_URL=https://familycart.app
API_URL=https://api.familycart.app
MOBILE_SCHEME=familycart://

GOOGLE_CLIENT_ID=<id-de-google-cloud>
GOOGLE_CLIENT_SECRET=<secret-de-google-cloud>
GOOGLE_CALLBACK_URL=https://api.familycart.app/api/auth/google/callback

DB_HOST=<host-postgres>
DB_PORT=5432
DB_USER=<usuario>
DB_PASS=<contraseña>
DB_NAME=familycart
```

### 4.4 Google OAuth — actualizar callback URL

En Google Cloud Console, agregar la URL de producción a los "Authorized redirect URIs":
```
https://api.familycart.app/api/auth/google/callback
```

### 4.5 Migraciones TypeORM (bloqueante)

El schema depende hoy de `synchronize: true`. Con `NODE_ENV=production` eso se apaga.
Antes del primer deploy en producción:

```bash
# Desde apps/api, con las variables de producción cargadas
npx typeorm migration:generate src/migrations/InitialSchema -d src/data-source.ts
npx typeorm migration:run -d src/data-source.ts
```

> Si no existe `src/data-source.ts`, hay que crearlo con la misma config de TypeORM
> que tiene `app.module.ts`.

---

## Fase 5 — Correcciones del TODO (pre-build)

Corregir los ítems críticos antes de distribuir a usuarios reales.

### 5.1 Agregar `helmet` a la API (15 min)

```bash
npm install helmet --workspace=apps/api
```

```ts
// apps/api/src/main.ts
import helmet from 'helmet';
app.use(helmet());
```

### 5.2 Reducir TTL del JWT a 2h

En el `.env` de producción ya está cubierto por `JWT_EXPIRES_IN=2h`.
Verificar que `apps/api/src/auth/auth.service.ts` use esa variable (ya lo hace).

---

## Fase 6 — Build APK de prueba (preview)

Una vez que tenés los assets y el EAS inicializado, podés buildear sin tener el
backend en producción todavía (para testear la UI y el flujo).

```bash
cd apps/mobile
npm run build:apk
# equivale a: eas build --platform android --profile preview
```

EAS sube el código a sus servidores, compila y te devuelve un link para descargar el APK.
**No necesitás Android Studio ni SDK instalado localmente.**

Instalar el APK en un dispositivo físico:
1. Descargar el APK desde el link de EAS
2. En el celular: Ajustes → Seguridad → Instalar apps de fuentes desconocidas
3. Abrir el APK descargado

---

## Fase 7 — Testing en dispositivo real

Con el APK instalado y el backend corriendo (puede ser el servidor de desarrollo apuntado
manualmente):

- [ ] Flujo de login con Google (OAuth completo, deep link de vuelta a la app)
- [ ] Crear familia
- [ ] Invitar a otro dispositivo con el código
- [ ] Crear lista y agregar items
- [ ] Verificar que los cambios aparecen en tiempo real en el otro dispositivo
- [ ] Marcar items como comprados
- [ ] Agregar gastos y liquidar lista
- [ ] Logout y volver a hacer login
- [ ] Matar la app y verificar que el token persiste (SecureStore)
- [ ] Probar con conexión móvil (no solo WiFi)

---

## Fase 8 — Build de producción (AAB para Play Store)

Solo cuando el testing en APK esté aprobado:

```bash
cd apps/mobile
npm run build:aab
# equivale a: eas build --platform android --profile production
```

EAS genera el `.aab` firmado (gestiona el keystore automáticamente si no tenés uno).

> **Importante:** La primera vez que EAS genera el keystore, descargarlo y guardarlo
> en un lugar seguro. Sin él no podés publicar actualizaciones de la app.

---

## Fase 9 — Publicar en Google Play Store

### 9.1 Crear la ficha del app en Play Console

- [ ] Título, descripción corta y larga
- [ ] Screenshots (mínimo 2 capturas del dispositivo)
- [ ] Ícono de alta resolución (ya lo tenés de Fase 2)
- [ ] Gráfico de portada (feature graphic, 1024×500 px, opcional pero recomendado)
- [ ] Categoría: Lifestyle o Productivity

### 9.2 Requerimientos legales

- [ ] **Privacy Policy** — Google la exige. Puede ser una página simple hosteada en
  cualquier lugar que describa qué datos se recopilan (email, nombre, foto de perfil
  vía Google OAuth).
- [ ] Content rating — completar el cuestionario en Play Console (5 min)

### 9.3 Subir el AAB

```bash
# Opción A: desde la línea de comandos
eas submit --platform android --profile production

# Opción B: manual
# Descargar el .aab desde EAS y subir en Play Console → Production → Create release
```

### 9.4 Revisión de Google

Google tarda entre unas horas y 3 días hábiles en revisar apps nuevas.
Para actualizaciones posteriores suele ser más rápido.

---

## Fase 10 — Post-deploy (opcionales pero recomendados)

- [ ] **Android App Links** — migrar de `familycart://` a `https://familycart.app/auth/callback`
  para eliminar el riesgo de URI hijacking (ver TODO). Requiere hostear `assetlinks.json`.
- [ ] **Refresh tokens** — JWT de 15 min + refresh token en DB para renovación silenciosa.
- [ ] **Notificaciones push** — `expo-notifications` para avisar cuando un familiar
  agrega items o liquida una lista.
- [ ] **OTA updates** — `expo-updates` para publicar correcciones de JS sin pasar por
  revisión de Play Store.

---

## Resumen rápido

```
Fase 1  →  Crear cuentas (Expo + Play Console)
Fase 2  →  Crear assets gráficos (icon, splash)
Fase 3  →  eas init  (vincular proyecto)
Fase 4  →  Servidor producción + dominio + HTTPS + migraciones
Fase 5  →  Corregir helmet + reducir JWT TTL
Fase 6  →  npm run build:apk  (APK de prueba)
Fase 7  →  Testing en dispositivo real
Fase 8  →  npm run build:aab  (build final)
Fase 9  →  Publicar en Play Store
Fase 10 →  Mejoras post-launch
```
