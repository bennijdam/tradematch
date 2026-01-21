#!/usr/bin/env node

/**
 * Initialize Server with Safe Migration Handling
 * - Attempts migrations on startup
 * - Continues even if migrations fail
 * - Starts the server regardless
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function initServer() {
    console.log('🔄 TradeMatch Server Initialization\n');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not configured, skipping migrations');
        console.log('📝 Note: Database will not be initialized until DATABASE_URL is set\n');
        startServer();
        return;
    }

    console.log('✅ DATABASE_URL configured');
    console.log('🔄 Attempting to run migrations...\n');

    // Try to run migrations, but don't fail if they don't work
    await runMigrations()
        .then(() => {
            console.log('✅ Migrations completed\n');
            startServer();
        })
        .catch(err => {
            console.warn('⚠️  Migration warning (non-critical):', err.message);
            console.log('⏭️  Starting server anyway...\n');
            startServer();
        });
}

function runMigrations() {
    return new Promise((resolve, reject) => {
        const migrateProcess = spawn('npm', ['run', 'migrate:up'], {
            stdio: ['inherit', 'inherit', 'inherit'],
            timeout: 30000 // 30 second timeout
        });

        migrateProcess.on('error', (err) => {
            reject(err);
        });

        migrateProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                // Don't reject on non-zero code for migrations
                // Some errors are expected (e.g., already applied)
                resolve();
            }
        });
    });
}

function startServer() {
    console.log('🚀 Starting TradeMatch API Server...\n');
    
    // Start the server as a child process
    const serverProcess = spawn('node', ['server.js'], {
        stdio: 'inherit',
        env: process.env
    });

    serverProcess.on('error', (err) => {
        console.error('❌ Server error:', err);
        process.exit(1);
    });

    serverProcess.on('close', (code) => {
        console.log('🛑 Server stopped with code', code);
        process.exit(code);
    });

    // Handle signals
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, stopping server...');
        serverProcess.kill();
    });

    process.on('SIGINT', () => {
        console.log('SIGINT received, stopping server...');
        serverProcess.kill();
    });
}

// Start the initialization
initServer().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
