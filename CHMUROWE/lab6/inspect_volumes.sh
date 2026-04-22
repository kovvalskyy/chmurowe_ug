#!/bin/sh

for VOLUME in product-dashboard-postgres-data product-dashboard-backend-node-modules
do
  LOCATION=$(docker volume inspect "$VOLUME" --format "{{ .Mountpoint }}")
  SIZE=$(docker run --rm -v "$VOLUME":/volume alpine du -sh /volume | cut -f1)
  USERS=$(docker ps -a --filter volume="$VOLUME" --format "{{.Names}}")

  echo "Volume: $VOLUME"
  echo "Location: $LOCATION"
  echo "Size: $SIZE"
  echo "Containers:"

  if [ -n "$USERS" ]; then
    echo "$USERS"
  else
    echo "none"
  fi

  echo ""
done
