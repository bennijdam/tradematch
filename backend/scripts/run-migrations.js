#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs all pending migrations on the database
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runMigrations() {
    console.log('🔄 Running database migrations...\n');
    
    try {
        // Check if DATABASE_URL is set
        if (!process.env.DATABASE_URL) {
            console.error('❌ ERROR: DATABASE_URL environment variable is not set');
            console.error('Please set DATABASE_URL before running migrations');
            process.exit(1);
        }

        console.log('✅ DATABASE_URL is configured');
        console.log('📊 Running migrations...\n');

        // Run migrations
        const { stdout, stderr } = await execPromise('npm run migrate:up');
        
        if (stdout) {
            console.log(stdout);
        }
        
        if (stderr) {
            console.error(stderr);
        }

        console.log('\n✅ Migrations completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Start the server: npm start');
        console.log('2. Test the API: curl http://localhost:3001/api/health');
        console.log('3. Test database connection\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        process.exit(1);
    }
}

// Run migrations
runMigrations();
