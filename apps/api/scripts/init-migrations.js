#!/usr/bin/env node

/**
 * Auto-Initialize Database Migrations
 * Runs on app startup - safely idempotent (won't error if tables exist)
 */

const { execSync } = require('child_process');
require('dotenv').config();

async function initializeMigrations() {
    console.log('🔄 Checking database migrations...');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL not set, skipping migrations');
        process.exit(0);
    }

    try {
        console.log('📊 Running pending migrations...');
        
        // Run migrations - node-pg-migrate will skip already-applied migrations
        execSync('npm run migrate:up', {
            cwd: __dirname,
            stdio: 'inherit'
        });
        
        console.log('✅ Migrations completed successfully\n');
        process.exit(0);
        
    } catch (error) {
        // Don't fail the app startup if migrations have issues
        // Log the error but continue
        console.error('⚠️ Migration warning:', error.message);
        console.log('⏭️ Continuing with app startup...\n');
        process.exit(0);
    }
}

initializeMigrations();
