ARG BUILD_DATE
ARG VERSION
ARG NODE_ENV=production

FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM deps AS test

COPY package.json package-lock.json ./
COPY server.js ./
COPY tests.js ./
RUN npm ci
RUN npm test

FROM node:20-alpine AS production

ARG BUILD_DATE
ARG VERSION
ARG NODE_ENV=production

WORKDIR /app

ENV NODE_ENV=$NODE_ENV

LABEL org.opencontainers.image.created=$BUILD_DATE \
  org.opencontainers.image.version=$VERSION \
  org.opencontainers.image.title="product-dashboard-backend"

COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./
COPY package.json package-lock.json ./

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["npm", "start"]
