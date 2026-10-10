FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 DATA_DIR=/data
RUN useradd -r -u 10001 margin && mkdir -p /data && chown margin:margin /data
COPY --from=builder --chown=margin:margin /app/.next/standalone ./
COPY --from=builder --chown=margin:margin /app/.next/static ./.next/static
COPY --from=deps --chown=margin:margin /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
USER margin
EXPOSE 3000
CMD ["node", "server.js"]
