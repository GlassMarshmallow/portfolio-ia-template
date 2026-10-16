# --- 1. Compilar la web ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Reintentos y caché de descargas: en conexiones lentas un paquete puede tardar en llegar
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY . .
# Los fotogramas de la animación (si los usas) ya deben estar en public/assets/hero-frames
# (npm run hero-frames los genera a partir de public/assets/hero-originales).
RUN npx ng build --configuration production

# --- 2. Servirla con nginx ---
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/portfolio-ia-template/browser /usr/share/nginx/html
EXPOSE 80
