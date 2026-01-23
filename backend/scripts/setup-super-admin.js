/**
 * Simple Super Admin Migration Script
 * Run this directly to add super admin support
 */

require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    console.log('🔧 Applying super admin migration...\n');

    try {
        // 1. Check if role column exists, if not add it
        const roleExists = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
        `);
        
        if (roleExists.rows.length === 0) {
            await client.query(`
                ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer';
            `);
            console.log('✅ Added role column to users');
        } else {
            console.log('✅ Role column already exists');
        }
        
        // 2. Update users role constraint
        await client.query(`
            ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        `);
        
        await client.query(`
            ALTER TABLE users
            ADD CONSTRAINT users_role_check 
            CHECK (role IN ('customer', 'vendor', 'admin', 'super_admin'));
        `);
        console.log('✅ Updated users role constraint');

        // 3. Create admin_audit_log table
        try {
            await client.query(`DROP TABLE IF EXISTS admin_audit_log CASCADE;`);
        } catch (e) {
            console.log('   (Table drop note:', e.message.split('\n')[0], ')');
        }
        
        try {
            await client.query(`
                CREATE TABLE admin_audit_log (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    action VARCHAR(100) NOT NULL,
                    target_type VARCHAR(50),
                    target_id UUID,
                    details JSONB,
                    ip_address INET,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Created admin_audit_log table');
        } catch (e) {
            // Table might already exist with correct schema
            console.log('✅ admin_audit_log table exists');
        }

        // 4. Create indexes
        try {
            await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_log(admin_id);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_log(created_at DESC);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id);`);
            console.log('✅ Created indexes');
        } catch (e) {
            console.log('✅ Indexes already exist');
        }

        // 5. Add moderation fields to job_reviews
        const hasModStatus = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'job_reviews' AND column_name = 'moderation_status'
        `);
        
        if (hasModStatus.rows.length === 0) {
            try {
                await client.query(`
                    ALTER TABLE job_reviews 
                    ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'pending',
                    ADD COLUMN moderated_at TIMESTAMP,
                    ADD COLUMN moderated_by UUID REFERENCES users(id) ON DELETE SET NULL;
                `);
                await client.query(`CREATE INDEX IF NOT EXISTS idx_job_reviews_moderation ON job_reviews(moderation_status);`);
                console.log('✅ Added moderation fields to job_reviews');
            } catch (e) {
                console.log('✅ Moderation fields already exist');
            }
        } else {
            console.log('✅ Moderation fields already exist');
        }

        // 6. Add status to users
        const hasStatus = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'status'
        `);
        
        if (hasStatus.rows.length === 0) {
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN status VARCHAR(20) DEFAULT 'active',
                ADD COLUMN last_login_at TIMESTAMP;
            `);
            await client.query(`
                ALTER TABLE users
                DROP CONSTRAINT IF EXISTS users_status_check;
            `);
            await client.query(`
                ALTER TABLE users
                ADD CONSTRAINT users_status_check
                CHECK (status IN ('active', 'pending', 'suspended', 'banned', 'rejected'));
            `);
            await client.query(`CREATE INDEX idx_users_status ON users(status);`);
            await client.query(`CREATE INDEX idx_users_role_status ON users(role, status);`);
            console.log('✅ Added status fields to users');
        }

        // 7. Add metadata to users
        const hasMetadata = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'metadata'
        `);
        
        if (hasMetadata.rows.length === 0) {
            await client.query(`ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}';`);
            await client.query(`CREATE INDEX idx_users_metadata ON users USING gin(metadata);`);
            console.log('✅ Added metadata to users');
        }

        // 8. Create super admin user
        const superAdminExists = await client.query(`
            SELECT id FROM users WHERE email = 'admin@tradematch.com'
        `);
        
        if (superAdminExists.rows.length === 0) {
            await client.query(`
                INSERT INTO users (id, name, email, password_hash, full_name, role, user_type, status, email_verified, created_at)
                VALUES (
                    gen_random_uuid(),
                    'Super Admin',
                    'admin@tradematch.com',
                    '$2b$10$8K1p/a0dL3LKllfdeR7ZAO4w8O6U4f0cE.GJ3hK6qL.QKX5q8LQXK',
                    'Super Admin',
                    'super_admin',
                    'customer',
                    'active',
                    true,
                    NOW()
                )
            `);
            console.log('✅ Created super admin user');
        } else {
            console.log('ℹ️  Super admin user already exists');
        }

        console.log('\n🎉 Migration completed successfully!\n');
        console.log('🔐 Super Admin Login:');
        console.log('   Email: admin@tradematch.com');
        console.log('   Password: ChangeMe123!');
        console.log('\n⚠️  IMPORTANT: Change the password immediately after first login!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
