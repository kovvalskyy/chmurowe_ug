#!/bin/sh

VOLUME=product-dashboard-postgres-data
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKUP_DIR="$ROOT_DIR/backups"
STAMP=$(date +"%Y%m%d-%H%M%S")
FILE="postgres-backup-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v "$VOLUME":/volume \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "tar czf /backup/$FILE -C /volume ."

echo "Backup created: $BACKUP_DIR/$FILE"
#!/bin/sh

VOLUME=product-dashboard-postgres-data
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKUP_DIR="$ROOT_DIR/backups"
STAMP=$(date +"%Y%m%d-%H%M%S")
FILE="postgres-backup-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v "$VOLUME":/volume \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "tar czf /backup/$FILE -C /volume ."

echo "Backup created: $BACKUP_DIR/$FILE"