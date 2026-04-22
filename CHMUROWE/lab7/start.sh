#!/bin/sh

PROXY_NET=proxy-net
APP_NET=app-net
DB_NET=db-net
POSTGRES_VOLUME=product-dashboard-postgres-data
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_IMAGE=product-dashboard-backend:lab7
FRONTEND_IMAGE=product-dashboard-frontend:lab7

docker network create --driver bridge --subnet 172.18.0.0/24 --gateway 172.18.0.1 "$PROXY_NET" >/dev/null 2>&1 || true
docker network create --driver bridge --subnet 172.19.0.0/24 --gateway 172.19.0.1 "$APP_NET" >/dev/null 2>&1 || true
docker network create --driver bridge --subnet 172.20.0.0/24 --gateway 172.20.0.1 "$DB_NET" >/dev/null 2>&1 || true

docker volume create "$POSTGRES_VOLUME" >/dev/null

docker rm -f nginx backend_1 backend_2 worker redis postgres >/dev/null 2>&1 || true

docker run -d \
  --name postgres \
  --network "$DB_NET" \
  --ip 172.20.0.10 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -v "$POSTGRES_VOLUME":/var/lib/postgresql/data \
  postgres:16-alpine

docker run -d \
  --name redis \
  --network "$APP_NET" \
  --ip 172.19.0.10 \
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
  --name backend_1 \
  --network "$PROXY_NET" \
  --ip 172.18.0.11 \
  --mac-address 02:42:ac:12:00:11 \
  -e INSTANCE_ID=backend_1 \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -e REDIS_URL=redis://redis:6379 \
  "$BACKEND_IMAGE"

docker network connect --ip 172.19.0.11 "$APP_NET" backend_1
docker network connect --ip 172.20.0.11 "$DB_NET" backend_1

docker run -d \
  --name backend_2 \
  --network "$PROXY_NET" \
  --ip 172.18.0.12 \
  -e INSTANCE_ID=backend_2 \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -e REDIS_URL=redis://redis:6379 \
  "$BACKEND_IMAGE"

docker network connect --ip 172.19.0.12 "$APP_NET" backend_2
docker network connect --ip 172.20.0.12 "$DB_NET" backend_2

docker run -d \
  --name worker \
  --network "$APP_NET" \
  --ip 172.19.0.20 \
  --no-healthcheck \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -e REDIS_URL=redis://redis:6379 \
  "$BACKEND_IMAGE" npm run worker

docker network connect --ip 172.20.0.20 "$DB_NET" worker

docker run -d \
  --name nginx \
  --network "$PROXY_NET" \
  --ip 172.18.0.10 \
  -p 8080:8080 \
  -v "$ROOT_DIR/frontend/nginx.conf":/etc/nginx/conf.d/default.conf:ro \
  "$FRONTEND_IMAGE"
