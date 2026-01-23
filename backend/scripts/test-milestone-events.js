/**
 * Test Milestone Events & Notifications
 * 
 * Flow:
 * 1. Create job and milestone
 * 2. Vendor submits milestone → MILESTONE_SUBMITTED event → notify customer
 * 3. Customer approves milestone → MILESTONE_APPROVED event → notify vendor
 * 4. Verify notifications queued with retry/backoff fields
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'tradematch_jwt_secret_2024_secure_key_generate_a_long_random_string_here_change_in_production';

async function generateToken(userId, email, role) {
    return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '1h' });
}

async function testMilestoneFlow() {
    console.log('🧪 Testing Milestone Event Flow\n');
    
    try {
        // 1. Setup: Create customer and vendor
        console.log('[1/7] Setting up test users...');
        const customerId = `cust_test_${Date.now()}`;
        const vendorId = `vend_test_${Date.now()}`;
        
        await pool.query(
            `INSERT INTO users (id, email, password, role, full_name, created_at)
             VALUES 
             ($1, $2, 'hash', 'customer', 'Test Customer', NOW()),
             ($3, $4, 'hash', 'vendor', 'Test Vendor', NOW())
             ON CONFLICT (id) DO NOTHING`,
            [customerId, 'customer@test.com', vendorId, 'vendor@test.com']
        );
        console.log(`✅ Customer: ${customerId}, Vendor: ${vendorId}`);
        
        // 2. Create job
        console.log('\n[2/7] Creating test job...');
        const jobId = `job_test_${Date.now()}`;
        await pool.query(
            `INSERT INTO jobs (id, customer_id, title, description, postcode, budget_min, budget_max, status, created_at)
             VALUES ($1, $2, 'Test Milestone Job', 'Testing milestone events', 'SW1A1AA', 100, 500, 'live', NOW())`,
            [jobId, customerId]
        );
        console.log(`✅ Job created: ${jobId}`);
        
        // 3. Create accepted lead (so messaging/milestones are enabled)
        console.log('\n[3/7] Creating accepted lead...');
        const leadId = `lead_test_${Date.now()}`;
        await pool.query(
            `INSERT INTO leads (id, job_id, vendor_id, status, accepted_at, created_at)
             VALUES ($1, $2, $3, 'accepted', NOW(), NOW())`,
            [leadId, jobId, vendorId]
        );
        console.log(`✅ Lead accepted: ${leadId}`);
        
        // 4. Create milestone
        console.log('\n[4/7] Creating milestone...');
        const milestoneId = `ms_test_${Date.now()}`;
        await pool.query(
            `INSERT INTO payment_milestones (id, job_id, title, description, amount, status, created_at)
             VALUES ($1, $2, 'Foundation Work', 'Complete foundation', 250.00, 'pending', NOW())`,
            [milestoneId, jobId]
        );
        console.log(`✅ Milestone created: ${milestoneId}`);
        
        // 5. Vendor submits milestone → MILESTONE_SUBMITTED event
        console.log('\n[5/7] Vendor submits milestone...');
        
        // Direct database update to simulate milestone submission
        await pool.query(
            `UPDATE payment_milestones 
             SET status = 'submitted', completion_evidence = 'Photos uploaded to portal'
             WHERE id = $1`,
            [milestoneId]
        );
        
        // Manually emit event (simulating what the API would do)
        const { TradeMatchEventBroker, EVENT_TYPES } = require('../services/event-broker.service');
        const broker = new TradeMatchEventBroker(pool);
        
        await broker.emit(EVENT_TYPES.MILESTONE_SUBMITTED, {
            actor_id: vendorId,
            actor_role: 'vendor',
            subject_type: 'milestone',
            subject_id: milestoneId,
            job_id: jobId,
            metadata: {
                customer_id: customerId,
                vendor_id: vendorId,
                vendor_name: 'Test Vendor',
                milestone_title: 'Foundation Work',
                milestone_amount: 250.00
            }
        });
        
        console.log(`✅ Milestone submitted and event emitted`);
        
        // Wait for event processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check event log
        const submitEvent = await pool.query(
            `SELECT * FROM event_log WHERE event_type = 'milestone:submitted' AND subject_id = $1`,
            [milestoneId]
        );
        console.log(`   📊 MILESTONE_SUBMITTED events: ${submitEvent.rows.length}`);
        
        // Check notification queue
        const submitNotif = await pool.query(
            `SELECT id, event_type, title, status, attempt_count, max_attempts, next_attempt_at 
             FROM notification_queue 
             WHERE event_type = 'milestone:submitted'
             ORDER BY created_at DESC LIMIT 1`
        );
        
        if (submitNotif.rows.length > 0) {
            const notif = submitNotif.rows[0];
            console.log(`   📬 Notification queued: ${notif.id}`);
            console.log(`      Status: ${notif.status}, Attempts: ${notif.attempt_count}/${notif.max_attempts}`);
            console.log(`      Title: "${notif.title}"`);
        } else {
            console.log(`   ⚠️  No notification queued`);
        }
        
        // 6. Customer approves milestone → MILESTONE_APPROVED event
        console.log('\n[6/7] Customer approves milestone...');
        
        await pool.query(
            `UPDATE payment_milestones 
             SET status = 'approved', completion_evidence = 'Looks great!', approved_at = NOW()
             WHERE id = $1`,
            [milestoneId]
        );
        
        await broker.emit(EVENT_TYPES.MILESTONE_APPROVED, {
            actor_id: customerId,
            actor_role: 'customer',
            subject_type: 'milestone',
            subject_id: milestoneId,
            job_id: jobId,
            metadata: {
                customer_id: customerId,
                vendor_id: vendorId,
                milestone_title: 'Foundation Work',
                milestone_amount: 250.00
            }
        });
        
        console.log(`✅ Milestone approved and event emitted`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const approveEvent = await pool.query(
            `SELECT * FROM event_log WHERE event_type = 'milestone:approved' AND subject_id = $1`,
            [milestoneId]
        );
        console.log(`   📊 MILESTONE_APPROVED events: ${approveEvent.rows.length}`);
        
        const approveNotif = await pool.query(
            `SELECT id, event_type, title, status, attempt_count, last_error
             FROM notification_queue 
             WHERE event_type = 'milestone:approved'
             ORDER BY created_at DESC LIMIT 1`
        );
        
        if (approveNotif.rows.length > 0) {
            const notif = approveNotif.rows[0];
            console.log(`   📬 Notification queued: ${notif.id}`);
            console.log(`      Status: ${notif.status}, Attempts: ${notif.attempt_count}`);
            console.log(`      Title: "${notif.title}"`);
            if (notif.last_error) {
                console.log(`      Last Error: ${notif.last_error}`);
            }
        }
        
        // 7. Summary
        console.log('\n[7/7] Summary:');
        const allEvents = await pool.query(
            `SELECT event_type, COUNT(*) as count
             FROM event_log
             WHERE subject_id = $1
             GROUP BY event_type`,
            [milestoneId]
        );
        
        console.log('\n📊 Events Logged:');
        allEvents.rows.forEach(row => {
            console.log(`   ${row.event_type}: ${row.count}`);
        });
        
        const allNotifs = await pool.query(
            `SELECT event_type, status, COUNT(*) as count
             FROM notification_queue
             WHERE event_type LIKE 'milestone:%'
             GROUP BY event_type, status
             ORDER BY event_type, status`
        );
        
        console.log('\n📬 Notifications Queued:');
        allNotifs.rows.forEach(row => {
            console.log(`   ${row.event_type} [${row.status}]: ${row.count}`);
        }
        
        console.log('\n✅ Test complete!\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

testMilestoneFlow();
