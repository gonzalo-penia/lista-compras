# FamilyCart - Informe de Análisis y Recomendaciones

> Fecha: 20 de Marzo de 2026
> Proyecto: Lista de Compras Compartida con Reparto de Gastos

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico Actual](#stack-tecnológico-actual)
3. [Debilidades de Seguridad](#debilidades-de-seguridad)
4. [Mejoras de Optimización](#mejoras-de-optimización)
5. [Roadmap de Desarrollo](#roadmap-de-desarrollo)
6. [Opciones para Desarrollo Mobile](#opciones-para-desarrollo-mobile)
7. [Estimación de Viabilidad](#estimación-de-viabilidad)
8. [Plan de Acción Inmediata](#plan-de-acción-inmediata)

---

## Resumen Ejecutivo

**FamilyCart** es una aplicación de lista de compras compartida para familias que incluye funcionalidades de:
- Listas de compras colaborativas en tiempo real
- Sistema de familias con códigos de invitación
- Reparto y seguimiento de gastos entre miembros
- Sincronización en tiempo real via WebSockets

El proyecto se encuentra en estado de **desarrollo activo** con un stack tecnológico moderno y bien estructurado. Sin embargo, presenta **vulnerabilidades de seguridad críticas** que deben resolverse antes de cualquier despliegue a producción.

**Puntuación de Viabilidad: 8/10**

---

## Stack Tecnológico Actual

### Backend
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | NestJS | 10.x |
| Lenguaje | TypeScript | 5.x |
| Base de datos | PostgreSQL | 16 |
| ORM | TypeORM | 0.3.x |
| Autenticación | JWT + Google OAuth | - |
| WebSockets | Socket.io | - |

### Frontend
| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework UI | React | 19 |
| Build tool | Vite | 6 |
| Routing | React Router | 7 |
| Estado global | Zustand | 5 |
| Data fetching | TanStack Query | 5 |
| Estilos | Tailwind CSS | 3 |

### Infraestructura
| Componente | Tecnología |
|------------|------------|
| Monorepo | Turbo 2.x |
| Contenedores | Docker |

---

## Debilidades de Seguridad

### Nivel Crítico 🔴

#### 1. Vulnerabilidades IDOR (Insecure Direct Object Reference)

**Descripción**: El sistema no verifica la autorización del usuario en múltiples endpoints, permitiendo acceso no autorizado a recursos de otros usuarios.

**Ubicaciones afectadas**:

| Archivo | Línea | Endpoint | Riesgo |
|---------|-------|----------|--------|
| `list.controller.ts` | 43-46 | `GET /lists/:id` | Ver detalle de listas ajenas |
| `list.controller.ts` | 62-67 | `DELETE /lists/:id` | Eliminar listas ajenas |
| `family.controller.ts` | 56-59 | `GET /families/:id` | Ver familias ajenas |
| `list.gateway.ts` | 76-135 | WebSocket events | Manipular items/gastos ajenos |

**Impacto**: Cualquier usuario autenticado puede ver, modificar o eliminar recursos de otras familias si conoce el UUID.

**Recomendación**:
```typescript
// Ejemplo de corrección para list.controller.ts
@Get(':id')
async findOne(@Param('id') id: string, @Req() req: Request) {
  const user = req.user as UserEntity;
  const list = await this.listService.findById(id);
  
  // Verificar membresía
  const family = await this.familyService.findById(list.familyId);
  if (!family.members.some(m => m.id === user.id)) {
    throw new ForbiddenException('Access denied');
  }
  
  return list;
}
```

---

#### 2. JWT Almacenado en localStorage

**Ubicación**: `apps/web/src/store/auth.store.ts:22`

**Descripción**: El token JWT se persiste en localStorage, lo cual es vulnerable a ataques XSS.

**Impacto**: Si un atacante logra inyectar código JavaScript malicioso, puede robar el token de autenticación.

**Recomendación**: Implementar autenticación basada en cookies httpOnly.

```typescript
// En el backend: auth.controller.ts
// Cambiar de query params a cookies seguras
@Get('google/callback')
async googleCallback(@Req() req: Request, @Res() res: Response) {
  const { accessToken, user } = this.authService.login(req.user as UserEntity);
  
  // Configurar cookie httpOnly segura
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });
  
  res.redirect(`${process.env.WEB_URL}/auth/callback`);
}
```

---

### Nivel Alto 🟠

#### 3. Invite Code Vulnerable a Brute Force

**Ubicación**: `apps/api/src/families/family.service.ts:25`

```typescript
code = randomBytes(3).toString('hex').toUpperCase(); // 6 caracteres hex
```

**Descripción**: 
- Espacio de búsqueda: 16.7 millones de combinaciones
- No hay rate limiting en `POST /families/join`
- Código generado solo con caracteres hex (0-9, A-F)

**Impacto**: Un atacante podría brute-forcear códigos válidos y unirse a familias.

**Recomendaciones**:
1. Implementar rate limiting en el endpoint de join
2. Usar un alfabeto más grande (incluir letras minúsculas y símbolos)
3. Implementar lockout temporal después de intentos fallidos
4. Agregar CAPTCHA después de 3 intentos fallidos

---

#### 4. Ausencia de Rate Limiting

**Descripción**: No existe protección contra:
- Ataques de fuerza bruta
- Abuso de APIs
- DDoS

**Recomendación**: Implementar `@nestjs/throttler`

```typescript
// En app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minuto
      limit: 10,  // máximo 10 requests por minuto
    }]),
  ],
})
export class AppModule {}

// En controllers
@UseGuards(ThrottlerGuard)
@Controller('families')
export class FamilyController { }
```

---

#### 5. Token Transmitido en URL

**Ubicación**: `apps/api/src/auth/auth.controller.ts:31`

```typescript
redirectUrl.searchParams.set('token', accessToken);
```

**Descripción**: El JWT se pasa como query parameter en la redirección.

**Riesgos**:
- Queda en historial del navegador
- Puede filtrarse en headers Referer
- Aparece en logs de servidor
- Compartido accidentalmente por usuarios

**Recomendación**: Usar cookies httpOnly (descrito anteriormente).

---

#### 6. No Existe Refresh Token ni Logout

**Descripción**:
- Tokens JWT no pueden ser revocados
- No hay mecanismo de logout
- Si un token se compromete, permanece válido hasta expiración

**Recomendación**:
1. Implementar refresh tokens con rotación
2. Mantener una blacklist de tokens revocados en Redis
3. Ofrecer funcionalidad de logout que invalide el token

---

### Nivel Medio 🟡

#### 7. Manejo Inconsistente de Errores

**Ubicación**: `apps/api/src/lists/list.service.ts:63,84`

```typescript
// Incorrecto - usa Error genérico
throw new Error('List is settled, no more expenses can be added');

// Correcto
import { ForbiddenException } from '@nestjs/common';
throw new ForbiddenException('List is settled, no more expenses can be added');
```

---

#### 8. Falta de Validación en WebSocket

**Ubicación**: `apps/api/src/lists/list.gateway.ts`

Los eventos WebSocket reciben `any` implícito sin validación de DTOs.

**Recomendación**: Crear DTOs y validarlos en el gateway.

```typescript
import { IsString, IsNumber, IsBoolean, IsUUID } from 'class-validator';

class AddItemDto {
  @IsUUID() listId: string;
  @IsString() @MinLength(1) name: string;
  @IsNumber() @IsOptional() quantity?: number;
  @IsString() @IsOptional() unit?: string;
}

// En el gateway
@SubscribeMessage('item:add')
async handleAddItem(@MessageBody() data: AddItemDto) {
  // Validación automática via pipe
}
```

---

#### 9. Índices de Base de Datos Faltantes

**Descripción**: No existen índices en columnas frecuentemente consultadas.

**Recomendación**: Agregar índices en PostgreSQL:

```sql
-- Para búsquedas por usuario
CREATE INDEX idx_shopping_items_created_by ON shopping_items(created_by);

-- Para filtrado de items checked
CREATE INDEX idx_shopping_items_list_checked ON shopping_items(list_id, checked);

-- Para búsqueda de invite codes
CREATE INDEX idx_families_invite_code ON families(invite_code);

-- Para relación members-families
CREATE INDEX idx_family_members_user ON family_members(user_id);
```

---

## Mejoras de Optimización

### Backend

| Área | Mejora | Impacto | Complejidad |
|------|--------|---------|-------------|
| **Base de Datos** | Agregar índices en columnas frecuentes | Alto | Baja |
| **Base de Datos** | Implementar soft deletes | Medio | Media |
| **Caché** | Redis para datos de familia | Alto | Media |
| **API** | Compresión gzip | Bajo | Baja |
| **WebSocket** | Throttle de eventos (max 10/seg) | Medio | Baja |
| **API** | Paginación en listados | Alto | Media |
| **API** | Lazy loading selectivo | Medio | Media |

### Frontend

| Área | Mejora | Impacto | Complejidad |
|------|--------|---------|-------------|
| **Performance** | Virtualización listas (react-window) | Alto | Media |
| **Performance** | Code splitting por rutas | Medio | Baja |
| **Performance** | Optimizar re-renders | Medio | Baja |
| **UX** | Offline support mejorado | Alto | Alta |
| **UX** | Optimistic updates | Alto | Media |

---

## Roadmap de Desarrollo

### Fase 1: Seguridad (Semanas 1-2)
- [ ] Corregir vulnerabilidades IDOR en todos los endpoints
- [ ] Implementar autorización en WebSocket Gateway
- [ ] Mover JWT a cookies httpOnly
- [ ] Implementar rate limiting
- [ ] Agregar validación de DTOs en WebSocket
- [ ] Estandarizar manejo de errores

### Fase 2: Estabilidad (Semanas 2-3)
- [ ] Implementar suite de tests (unit + e2e)
- [ ] Configurar CI/CD con lint y typecheck
- [ ] Logging estructurado (Pino/winston)
- [ ] Health checks para contenedores
- [ ] Manejo de errores global

### Fase 3: Optimización (Semanas 3-4)
- [ ] Agregar índices de base de datos
- [ ] Implementar Redis para caché
- [ ] Paginación en listados
- [ ] Throttle en WebSocket
- [ ] Compresión de respuestas

### Fase 4: Producción (Semanas 4-5)
- [ ] Monitoring (Sentry + Prometheus)
- [ ] Health checks completos
- [ ] Estrategia de backup
- [ ] Variables de entorno documentadas
- [ ] SSL/TLS configuration

### Fase 5: PWA Mobile (Semanas 5-7)
- [ ] Notificaciones push
- [ ] Offline-first con Service Worker
- [ ] Install prompt mejorado
- [ ] Splash screens custom

### Fase 6: Mobile Nativo (Opcional)
- [ ] React Native o Flutter
- [ ] Reutilizar lógica de negocio
- [ ] UI nativa optimizada

---

## Opciones para Desarrollo Mobile

### Opción A: PWA Mejorada ⭐ Recomendado

**Tecnología**: Stack actual + mejoras

| Aspecto | Detalle |
|---------|---------|
| **Pros** | 100% código compartido, sin costo adicional, funciona en iOS/Android |
| **Cons** | Acceso limitado a features nativos (cámara, notificaciones push reales) |
| **Esfuerzo** | 2-3 semanas |
| **Costo** | $0 |

**Mejoras necesarias para PWA production-ready**:
1. Service Worker con Workbox para offline-first
2. Web Push API para notificaciones
3. Install prompt personalizado
4. Splash screens y manifest optimizado
5. Metadatos de Apple Touch Icons

---

### Opción B: React Native con Expo

**Tecnología**: Expo + React Native

| Aspecto | Detalle |
|---------|---------|
| **Pros** | Comparte lógica de negocio, misma sintaxis React, gran comunidad |
| **Cons** | UI debe rehacerse, performance algo menor que nativo |
| **Esfuerzo** | 2-3 meses |
| **Costo** | $0-25/mes (Expo EAS) |

**Arquitectura recomendada**:
```
packages/
  core/           # Lógica compartida (servicios, tipos)
  api-client/     # Cliente API (puede compartirse)
  
apps/
  web/            # React + Vite (existente)
  mobile/         # Expo + React Native (nuevo)
```

---

### Opción C: Flutter

**Tecnología**: Flutter + Dart

| Aspecto | Detalle |
|---------|---------|
| **Pros** | Performance nativa, UI consistente |
| **Cons** | 0% código compartido, curva de aprendizaje |
| **Esfuerzo** | 3-4 meses |
| **Costo** | $0 (Flutter es open source) |

**Consideraciones**:
- Requiere reescribir toda la lógica de negocio en Dart
- Útil solo si la app mobile será el producto principal
- Mayor curva de aprendizaje del equipo

---

### Opción D: Capacitor sobre Web Existente

**Tecnología**: Capacitor + Web app existente

| Aspecto | Detalle |
|---------|---------|
| **Pros** | Wrapper rápido, acceso a native features |
| **Cons** |，依然 es web, UI no 100% nativa |
| **Esfuerzo** | 3-4 semanas |
| **Costo** | $0 |

**Ideal para**: MVP mobile rápido con acceso a cámara, notificaciones nativas, etc.

---

### Recomendación por Escenario

| Si... | Entonces... |
|-------|-------------|
| Presupuesto limitado, MVP rápido | PWA mejorada |
| Quieres app store, mejor UX | React Native |
| Mobile será el producto principal | React Native o Flutter |
| Ya tienes web y quieres probar mobile rápido | Capacitor |

---

## Estimación de Viabilidad

### Análisis de Mercado

**Competidores**:
- AnyList (establecido, pago)
- OurPantry (open source, similar)
- Out of Milk (legacy)
- Splitwise (solo gastos, no listas)

**Diferenciadores de FamilyCart**:
1. ✓ Tiempo real (WebSockets)
2. ✓ Integración lista + gastos
3. ✓ Código abierto
4. ✓ Basado en familias reales

### Estimación de Tiempo

| Entregable | Estimación |
|------------|-------------|
| MVP seguro para beta cerrada | 2-3 semanas |
| Producción v1.0 | 1.5-2 meses |
| Con PWA mobile | 3-4 meses |
| Con app mobile nativa | 5-6 meses |

### Puntuación: 8/10

| Factor | Puntuación | Comentario |
|--------|-------------|------------|
| Viabilidad técnica | 9/10 | Stack moderno, bien arquitecturado |
| Viabilidad de mercado | 7/10 | Nicho existe, competencia presente |
| Diferenciación | 7/10 | Tiempo real es atractivo |
| Complejidad | 6/10 | Media-alta, requiere atención a UX |
| **Total** | **8/10** | **Viable con trabajo** |

---

## Plan de Acción Inmediata

### Semana 1: Seguridad Crítica

```bash
# 1. Corregir IDOR en list.controller.ts
# - Agregar verificación de membresía en todos los endpoints
# - Crear helper para verificar acceso a lista

# 2. Corregir IDOR en family.controller.ts  
# - Verificar membresía en GET /families/:id

# 3. Corregir WebSocket Gateway
# - Verificar pertenencia a lista antes de operaciones
# - Validar que el usuario pertenece a la familia
```

### Semana 2: Auth y Rate Limiting

```bash
# 1. Implementar cookies httpOnly
# - Modificar auth.controller.ts
# - Actualizar api.ts del frontend
# - Eliminar persistencia en localStorage

# 2. Instalar y configurar @nestjs/throttler
npm install @nestjs/throttler

# 3. Proteger endpoint de join contra brute force
# - Rate limit específico para /families/join
# - Opcional: CAPTCHA después de 3 intentos
```

### Semana 3: Validación y Errores

```bash
# 1. Crear DTOs para WebSocket
# - AddItemDto, UpdateItemDto, etc.
# - Agregar ValidationPipe al gateway

# 2. Estandarizar manejo de errores
# - Reemplazar Error() con excepciones HTTP apropiadas
# - Crear filtros de excepción globales

# 3. Índices de base de datos
# - Crear migración con índices
```

### Validación Final

```bash
# Ejecutar checklist de seguridad:
npm run lint
npm run typecheck
npm run test:e2e

# Verificación manual:
# 1. Intentar acceder a lista de otra familia → debe fallar con 403
# 2. Intentar WebSocket en lista ajena → debe ser rechazado
# 3. Verificar que token está en cookie, no en URL
```

---

## Conclusiones

FamilyCart es un proyecto con una base sólida y un concepto de negocio viable. El stack tecnológico elegido es moderno y apropiado. 

**Las principales áreas de mejora son:**

1. **Seguridad**: Las vulnerabilidades IDOR son críticas y deben corregirse antes de cualquier despliegue
2. **Authorization**: Falta verificación de permisos en múltiples puntos
3. **Mobile**: PWA es el camino más eficiente; nativo puede venir después si el producto crece

**Siguiente paso recomendado**: Comenzar con las correcciones de seguridad (Semana 1) y continuar con el roadmap estructurado.

---

*Documento generado: Marzo 2026*
*Proyecto: FamilyCart*
