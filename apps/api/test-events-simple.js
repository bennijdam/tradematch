/**
 * Simple test: Emit milestone events and check notifications
 */

const { Pool } = require('pg');
const { TradeMatchEventBroker, EVENT_TYPES } = require('./services/event-broker.service');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testEvents() {
    console.log('🧪 Testing Milestone Events\n');
    
    try {
        const broker = new TradeMatchEventBroker(pool);
        
        const customerId = 'cust_test_001';
        const vendorId = 'vend_test_001';
        const jobId = 'job_test_001';
        const milestoneId = `ms_${Date.now()}`;
        
        // Emit MILESTONE_SUBMITTED
        console.log('[1/2] Emitting MILESTONE_SUBMITTED...');
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
                milestone_title: 'Test Milestone',
                milestone_amount: 250.00
            }
        });
        console.log('✅ Event emitted');
        
        // Emit MILESTONE_APPROVED
        console.log('\n[2/2] Emitting MILESTONE_APPROVED...');
        await broker.emit(EVENT_TYPES.MILESTONE_APPROVED, {
            actor_id: customerId,
            actor_role: 'customer',
            subject_type: 'milestone',
            subject_id: milestoneId,
            job_id: jobId,
            metadata: {
                customer_id: customerId,
                vendor_id: vendorId,
                milestone_title: 'Test Milestone',
                milestone_amount: 250.00
            }
        });
        console.log('✅ Event emitted');
        
        // Check event log
        console.log('\n📊 Checking event log...');
        const events = await pool.query(
            `SELECT event_type, COUNT(*) as count
             FROM event_log
             WHERE subject_id = $1
             GROUP BY event_type`,
            [milestoneId]
        );
        events.rows.forEach(row => {
            console.log(`   ${row.event_type}: ${row.count}`);
        });
        
        // Check notification queue
        console.log('\n📬 Checking notification queue...');
        const notifs = await pool.query(
            `SELECT event_type, status, COUNT(*) as count
             FROM notification_queue
             WHERE event_type IN ('milestone:submitted', 'milestone:approved')
             GROUP BY event_type, status
             ORDER BY event_type`
        );
        notifs.rows.forEach(row => {
            console.log(`   ${row.event_type} [${row.status}]: ${row.count}`);
        });
        
        // Check retry fields
        console.log('\n🔄 Checking retry/backoff fields...');
        const retryCheck = await pool.query(
            `SELECT id, event_type, status, attempt_count, max_attempts, 
                    next_attempt_at IS NOT NULL as has_next_attempt
             FROM notification_queue
             WHERE event_type IN ('milestone:submitted', 'milestone:approved')
             ORDER BY created_at DESC
             LIMIT 3`
        );
        retryCheck.rows.forEach(row => {
            console.log(`   ${row.id.substring(0, 20)}... [${row.event_type}]`);
            console.log(`      Status: ${row.status}, Attempts: ${row.attempt_count}/${row.max_attempts}, Next: ${row.has_next_attempt}`);
        });
        
        console.log('\n✅ Test complete!\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        console.log('Closing pool...');
        await pool.end();
        console.log('Pool closed');
        setTimeout(() => process.exit(0), 500);
    }
}

testEvents();
