#!/bin/sh

NETWORK=product-dashboard-net
POSTGRES_VOLUME=product-dashboard-postgres-data
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_IMAGE=kovvalskyy/product-dashboard-backend:v2
FRONTEND_IMAGE=kovvalskyy/product-dashboard-frontend:v2

docker network create "$NETWORK" >/dev/null 2>&1 || true
docker volume create "$POSTGRES_VOLUME" >/dev/null

docker rm -f frontend api redis postgres >/dev/null 2>&1 || true

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
  --name api \
  --network "$NETWORK" \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -e REDIS_URL=redis://redis:6379 \
  "$BACKEND_IMAGE"

docker run -d \
  --name frontend \
  --network "$NETWORK" \
  -p 8080:8080 \
  -v "$ROOT_DIR/frontend/nginx.conf":/etc/nginx/conf.d/default.conf:ro \
  "$FRONTEND_IMAGE"
