#!/bin/sh

NETWORK=product-dashboard-net
POSTGRES_VOLUME=product-dashboard-postgres-data
NODE_MODULES_VOLUME=product-dashboard-backend-node-modules
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)

docker network create "$NETWORK" >/dev/null 2>&1 || true
docker volume create "$POSTGRES_VOLUME" >/dev/null
docker volume create "$NODE_MODULES_VOLUME" >/dev/null

docker rm -f postgres redis api-dev >/dev/null 2>&1 || true

docker run -d \
  --name postgres \
  --network "$NETWORK" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -v "$POSTGRES_VOLUME":/var/lib/postgresql/data \
  postgres:16-alpine

docker run -d \
  --name redis \
  --network "$NETWORK" \
  --tmpfs /data \
  redis:7-alpine redis-server --save "" --appendonly no

until docker exec postgres pg_isready -U postgres -d products >/dev/null 2>&1
do
  sleep 1
done

until docker exec redis redis-cli ping >/dev/null 2>&1
do
  sleep 1
done

docker run -d \
  --name api-dev \
  --network "$NETWORK" \
  -p 3000:3000 \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -e REDIS_URL=redis://redis:6379 \
  -v "$ROOT_DIR/backend":/app \
  -v "$NODE_MODULES_VOLUME":/app/node_modules \
  -w /app \
  node:20-alpine sh -c "npm install && npm run dev"
