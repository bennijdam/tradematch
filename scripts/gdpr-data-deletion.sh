#!/bin/bash
# TradeMatch GDPR Data Deletion - Monthly
# Deletes user data older than 2 years per GDPR requirements

echo "[$(date)] Starting GDPR data deletion" >> logs/gdpr-deletion.log

cd apps/api && node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(\`
  -- Anonymize users inactive > 2 years
  UPDATE users 
  SET email = 'deleted_' || id || '@anonymized.tradematch', 
      full_name = 'Deleted User', 
      phone = NULL,
      address = NULL
  WHERE last_login < NOW() - INTERVAL '2 years'\`
).then(() => console.log('✅ GDPR deletion complete')).catch(console.error).finally(() => pool.end());
" >> logs/gdpr-deletion.log 2>&1
