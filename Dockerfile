# ── Stage 1 : build TypeScript ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2 : image de production ───────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Code compilé
COPY --from=builder /app/dist ./dist

# Images de cartes de rôle (lues depuis src/images à l'exécution)
COPY src/images ./src/images

CMD ["node", "dist/index.js"]
