#!/bin/bash
# TradeMatch Daily Health Check - Run via cron
# Output: logs/daily-health-$(date +%Y%m%d).log

set -e

LOGFILE="logs/daily-health-$(date +%Y%m%d).log"
mkdir -p logs

echo "[$(date)] Starting daily health check" | tee -a "$LOGFILE"

# Check 1: API health
curl -s https://api.tradematch.uk/api/health > /tmp/health.json 2>&1
if grep -q '\"status\":\"ok\"' /tmp/health.json; then
  echo "[OK] API health responding" | tee -a "$LOGFILE"
else
  echo "[FAIL] API health check failed" | tee -a "$LOGFILE"
  exit 1
fi

# Check 2: Database connection
cd apps/api && node -e "require('dotenv').config(); const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT 1').then(() => console.log('[OK] Database connected')).catch((e) => console.log('[FAIL] DB:', e.message)).finally(() => pool.end())" 2>&1 | tee -a "$LOGFILE"

# Check 3: Email service
cd apps/api && node -e "require('dotenv').config(); if (process.env.RESEND_API_KEY) console.log('[OK] Resend API configured'); else console.log('[FAIL] RESEND_API_KEY missing')" 2>&1 | tee -a "$LOGFILE"

echo "[$(date)] Daily health check completed" | tee -a "$LOGFILE"
