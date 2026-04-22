#!/bin/sh

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh backup-file.tar.gz"
  exit 1
fi

ARCHIVE=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
NETWORK=product-dashboard-net
VOLUME=product-dashboard-postgres-data

docker network create "$NETWORK" >/dev/null 2>&1 || true
docker rm -f postgres >/dev/null 2>&1 || true

docker run --rm \
  -v "$VOLUME":/volume \
  alpine sh -c "rm -rf /volume/* /volume/.[!.]* /volume/..?* 2>/dev/null || true"

docker run --rm \
  -v "$VOLUME":/volume \
  -v "$(dirname "$ARCHIVE")":/backup \
  alpine sh -c "tar xzf /backup/$(basename "$ARCHIVE") -C /volume"

docker run -d \
  --name postgres \
  --network "$NETWORK" \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=products \
  -v "$VOLUME":/var/lib/postgresql/data \
  postgres:16-alpine >/dev/null

until docker exec postgres pg_isready -U postgres -d products >/dev/null 2>&1
do
  sleep 1
done

docker exec postgres psql -U postgres -d products -c "SELECT id, name FROM items ORDER BY id;"

echo "Restore complete"
