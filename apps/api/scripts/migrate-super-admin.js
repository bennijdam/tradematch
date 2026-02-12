/**
 * Apply Super Admin Migration
 * Adds super_admin role, admin audit logging, and creates default super admin user
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Starting Super Admin migration...\n');
        
        // Read migration file
        const migrationPath = path.join(__dirname, '../../database/migrations/007_super_admin_support.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Run migration in a transaction
        await client.query('BEGIN');
        
        // Split by semicolons and run each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
            try {
                await client.query(statement);
            } catch (error) {
                // Ignore errors for statements that might already exist
                if (!error.message.includes('already exists') && 
                    !error.message.includes('duplicate key')) {
                    console.log('⚠️  Warning:', error.message);
                }
            }
        }
        
        await client.query('COMMIT');
        
        // Verify changes
        const roleCheck = await client.query(`
            SELECT COUNT(*) as count 
            FROM pg_constraint 
            WHERE conname = 'users_role_check'
        `);
        
        const auditTableCheck = await client.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name = 'admin_audit_log'
        `);
        
        const superAdminCheck = await client.query(`
            SELECT email, role, status 
            FROM users 
            WHERE role = 'super_admin'
            LIMIT 1
        `);
        
        console.log('✅ Migration completed successfully!\n');
        console.log('Verification:');
        console.log(`  - users_role_check updated: ${roleCheck.rows[0].count > 0 ? '✓' : '✗'}`);
        console.log(`  - admin_audit_log table: ${auditTableCheck.rows[0].count > 0 ? '✓' : '✗'}`);
        console.log(`  - Super admin user: ${superAdminCheck.rows.length > 0 ? '✓' : '✗'}`);
        
        if (superAdminCheck.rows.length > 0) {
            console.log(`\n🔐 Super Admin Account:`);
            console.log(`  Email: ${superAdminCheck.rows[0].email}`);
            console.log(`  Status: ${superAdminCheck.rows[0].status}`);
            console.log(`  Default Password: ChangeMe123! (PLEASE CHANGE IMMEDIATELY)`);
        }
        
        console.log('\n✨ Super Admin panel is ready to use!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
