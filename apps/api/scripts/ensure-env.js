#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const apiDir = path.resolve(__dirname, '..');
const envFile = path.join(apiDir, '.env');
const backupDir = path.join(os.homedir(), '.tradematch-secrets');
const backupFile = path.join(backupDir, 'api.env.backup');

function copyWithParents(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function chmodSafe(filePath) {
  try {
    fs.chmodSync(filePath, 0o600);
  } catch (_) {
    // Permission mode changes can fail on Windows; ignore.
  }
}

try {
  if (fs.existsSync(envFile)) {
    fs.mkdirSync(backupDir, { recursive: true });
    if (!fs.existsSync(backupFile)) {
      copyWithParents(envFile, backupFile);
      chmodSafe(backupFile);
    }
    process.exit(0);
  }

  if (fs.existsSync(backupFile)) {
    copyWithParents(backupFile, envFile);
    chmodSafe(envFile);
    console.log(`Restored missing .env from backup at ${backupFile}`);
    process.exit(0);
  }

  console.error(`ERROR: Missing ${envFile} and no backup found at ${backupFile}`);
  process.exit(1);
} catch (error) {
  console.error(`ERROR: Failed to ensure environment file: ${error.message}`);
  process.exit(1);
}
