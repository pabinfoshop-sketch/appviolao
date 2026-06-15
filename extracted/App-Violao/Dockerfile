FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npx vite build

FROM node:20-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src/ ./src/
COPY --from=frontend-builder /frontend/dist /frontend/dist
EXPOSE 3001
CMD ["node", "src/index.js"]
