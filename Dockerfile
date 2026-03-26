# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar manifests de todos los workspaces (aprovecha cache de capas)
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json  ./packages/core/
COPY apps/api/package*.json      ./apps/api/

# Instalar todas las dependencias (incluyendo devDeps para compilar)
RUN npm ci

# Copiar fuentes
COPY tsconfig.base.json ./
COPY packages/           ./packages/
COPY apps/api/           ./apps/api/

# Compilar la API
RUN npm run build --workspace=apps/api

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copiar manifests para instalar solo dependencias de producción
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json  ./packages/core/
COPY apps/api/package*.json      ./apps/api/

RUN npm ci --omit=dev

# Copiar el output compilado
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main"]
