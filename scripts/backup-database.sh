#!/bin/bash
# Database Backup Script for TradeMatch
# Usage: ./scripts/backup-database.sh [environment]

ENV=${1:-production}
BACKUP_DIR="backups/$(date +%Y%m%d)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="tradematch_${ENV}_${TIMESTAMP}.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}TradeMatch Database Backup${NC}"
echo "Environment: $ENV"
echo "Timestamp: $TIMESTAMP"
echo "----------------------------"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set${NC}"
    exit 1
fi

# Parse DATABASE_URL for pg_dump
# Format: postgresql://user:pass@host:port/dbname
echo -e "${YELLOW}Creating backup...${NC}"

if pg_dump "$DATABASE_URL" -Fc --verbose > "${BACKUP_DIR}/${BACKUP_FILE}.dump" 2>&1; then
    echo -e "${GREEN}✓ Backup created: ${BACKUP_DIR}/${BACKUP_FILE}.dump${NC}"
    
    # Compress backup
    gzip "${BACKUP_DIR}/${BACKUP_FILE}.dump"
    echo -e "${GREEN}✓ Backup compressed: ${BACKUP_DIR}/${BACKUP_FILE}.dump.gz${NC}"
    
    # Create plain SQL backup as well
    pg_dump "$DATABASE_URL" --verbose > "${BACKUP_DIR}/${BACKUP_FILE}" 2>&1
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo -e "${GREEN}✓ SQL backup created: ${BACKUP_DIR}/${BACKUP_FILE}.gz${NC}"
    
    # Cleanup old backups (keep last 7 days)
    find backups -name "*.gz" -type f -mtime +7 -delete
    echo -e "${GREEN}✓ Cleaned up backups older than 7 days${NC}"
    
    echo ""
    echo -e "${GREEN}Backup complete!${NC}"
    echo "Location: ${BACKUP_DIR}/"
    echo "Files:"
    ls -lh "${BACKUP_DIR}/"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi
