FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx vite build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV DB_PATH=/data/app.db
ENV PORT=3001

# better-sqlite3 precisa compilar módulo nativo
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY backend/src/ ./src/
COPY --from=frontend-builder /frontend/dist /frontend/dist

# Cria diretório de dados (em prod, o Fly volume fica montado aqui)
RUN mkdir -p /data && chown -R node:node /data /app

EXPOSE 3001
USER node
CMD ["node", "src/index.js"]
