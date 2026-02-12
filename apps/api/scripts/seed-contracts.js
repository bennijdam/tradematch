/* eslint-disable camelcase */
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') ? true : false
});

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getUserColumns = async () => {
  const result = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users'`
  );
  const columns = new Map();
  result.rows.forEach((row) => columns.set(row.column_name, row.data_type));
  return columns;
};

const insertUser = async ({ role, email }) => {
  const columns = await getUserColumns();
  const values = {};

  values.user_type = role;
  values.full_name = role === 'customer' ? 'Seed Customer' : 'Seed Vendor';
  values.email = email;
  if (columns.has('name')) values.name = values.full_name;
  if (columns.has('phone')) values.phone = role === 'customer' ? '+61400000001' : '+61400000002';
  if (columns.has('postcode')) values.postcode = '2000';
  if (columns.has('oauth_provider')) values.oauth_provider = 'local';
  if (columns.has('email_verified')) values.email_verified = true;
  if (columns.has('active')) values.active = true;
  if (columns.has('status')) values.status = 'active';

  if (columns.has('password_hash')) {
    values.password_hash = await bcrypt.hash('SeedPass123!', 10);
  } else if (columns.has('password')) {
    values.password = await bcrypt.hash('SeedPass123!', 10);
  }

  if (columns.has('id')) {
    const idType = columns.get('id');
    if (idType && !['integer', 'bigint', 'smallint'].includes(idType)) {
      values.id = crypto.randomUUID();
    }
  }

  const cols = Object.keys(values);
  const placeholders = cols.map((_, idx) => `$${idx + 1}`);
  const params = cols.map((col) => values[col]);

  const result = await pool.query(
    `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    params
  );

  return result.rows[0].id;
};

const getOrCreateUser = async (role, email) => {
  const existing = await pool.query(
    `SELECT id FROM users WHERE user_type = $1 ORDER BY created_at ASC LIMIT 1`,
    [role]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;
  return insertUser({ role, email });
};

const ensureConversationParticipant = async (conversationId, userId, role) => {
  await pool.query(
    `INSERT INTO conversation_participants (id, conversation_id, user_id, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (conversation_id, user_id) DO NOTHING`,
    [createId('cp'), conversationId, userId, role]
  );
};

const addMessage = async (client, { conversationId, senderId, senderRole, messageType, body, metadata }) => {
  const messageId = createId('msg');
  await client.query(
    `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [messageId, conversationId, senderId, senderRole, messageType, body, JSON.stringify(metadata || {})]
  );
  return messageId;
};

const addSystemEvent = async (conversationId, eventType, actorId, metadata = {}) => {
  const eventId = createId('evt');
  await pool.query(
    `INSERT INTO system_events (id, conversation_id, event_type, actor_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [eventId, conversationId, eventType, actorId, JSON.stringify(metadata)]
  );
  return eventId;
};

const addContractAudit = async (client, contractId, actorId, action, details = {}) => {
  await client.query(
    `INSERT INTO contract_audit (id, contract_id, actor_id, action, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [createId('cad'), contractId, actorId, action, JSON.stringify(details)]
  );
};

const addMilestoneAudit = async (client, milestoneId, actorId, action, details = {}) => {
  await client.query(
    `INSERT INTO milestone_audit (id, milestone_id, actor_id, action, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [createId('mad'), milestoneId, actorId, action, JSON.stringify(details)]
  );
};

const seedConversationWithContract = async ({ customerId, vendorId, status = 'accepted', disputed = false }) => {
  const conversationId = createId('conv');
  const contractId = createId('ctr');
  const jobId = `job_seed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const paymentNotice = 'Payment arranged directly between customer and vendor';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO conversations (id, job_id, customer_id, vendor_id, conversation_type, status, contact_allowed, is_system, is_locked, is_disputed)
       VALUES ($1, $2, $3, $4, 'job', 'open', $5, false, $6, $7)`,
      [conversationId, jobId, customerId, vendorId, status === 'accepted', disputed, disputed]
    );

    await ensureConversationParticipant(conversationId, customerId, 'customer');
    await ensureConversationParticipant(conversationId, vendorId, 'vendor');

    await client.query(
      `INSERT INTO contracts (
        id, conversation_id, job_id, customer_id, vendor_id, status, scope_of_work,
        total_price, milestone_summary, start_date, end_date, cancellation_terms,
        variation_terms, created_by, is_locked, locked_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        contractId,
        conversationId,
        jobId,
        customerId,
        vendorId,
        status === 'accepted' ? 'accepted' : 'sent',
        'Full kitchen renovation with cabinetry and plumbing',
        12000,
        JSON.stringify({ payment_notice: paymentNotice }),
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        'Cancellation with 7 days notice',
        'Variations must be agreed in writing',
        vendorId,
        status === 'accepted' || disputed,
        status === 'accepted' || disputed ? new Date() : null
      ]
    );

    await addContractAudit(client, contractId, vendorId, 'created', { scope_of_work: 'Full kitchen renovation' });

    if (status === 'accepted') {
      await client.query(
        `INSERT INTO contract_acceptances (id, contract_id, user_id, role, ip_address, user_agent)
         VALUES ($1,$2,$3,'vendor','127.0.0.1','seed-script')`,
        [createId('cta'), contractId, vendorId]
      );
      await client.query(
        `INSERT INTO contract_acceptances (id, contract_id, user_id, role, ip_address, user_agent)
         VALUES ($1,$2,$3,'customer','127.0.0.1','seed-script')`,
        [createId('cta'), contractId, customerId]
      );
      await addContractAudit(client, contractId, vendorId, 'accepted', { role: 'vendor' });
      await addContractAudit(client, contractId, customerId, 'accepted', { role: 'customer' });
      await addContractAudit(client, contractId, vendorId, 'activated', { status: 'active' });
    }

    const contractMessageId = await addMessage(client, {
      conversationId,
      senderId: vendorId,
      senderRole: 'vendor',
      messageType: 'contract_card',
      body: 'Contract proposed',
      metadata: {
        contract_id: contractId,
        scope_of_work: 'Full kitchen renovation with cabinetry and plumbing',
        total_price: 12000,
        payment_notice: paymentNotice
      }
    });

    if (status === 'accepted') {
      await addMessage(client, {
        conversationId,
        senderId: vendorId,
        senderRole: 'system',
        messageType: 'system_alert',
        body: 'Contract accepted by vendor',
        metadata: { contract_id: contractId }
      });
      await addMessage(client, {
        conversationId,
        senderId: customerId,
        senderRole: 'system',
        messageType: 'system_alert',
        body: 'Contract accepted by customer',
        metadata: { contract_id: contractId }
      });
      await addMessage(client, {
        conversationId,
        senderId: customerId,
        senderRole: 'system',
        messageType: 'system_alert',
        body: 'Contract is now fully active',
        metadata: { contract_id: contractId }
      });
    }

    const milestoneOneId = createId('ms');
    const milestoneTwoId = createId('ms');

    await client.query(
      `INSERT INTO contract_milestones (id, contract_id, conversation_id, title, description, amount, due_date, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)` ,
      [
        milestoneOneId,
        contractId,
        conversationId,
        'Demolition and prep',
        'Remove existing cabinetry and prep plumbing',
        4000,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status === 'accepted' ? 'completed' : 'planned',
        vendorId
      ]
    );

    await client.query(
      `INSERT INTO contract_milestones (id, contract_id, conversation_id, title, description, amount, due_date, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)` ,
      [
        milestoneTwoId,
        contractId,
        conversationId,
        'Install cabinetry',
        'Install cabinets and finish fittings',
        8000,
        new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status === 'accepted' ? 'planned' : 'planned',
        vendorId
      ]
    );

    await addMilestoneAudit(client, milestoneOneId, vendorId, 'created', { status: 'proposed' });
    await addMilestoneAudit(client, milestoneTwoId, vendorId, 'created', { status: 'proposed' });

    await addMessage(client, {
      conversationId,
      senderId: vendorId,
      senderRole: 'vendor',
      messageType: 'milestone_card',
      body: 'Milestone proposed: Demolition and prep',
      metadata: { milestone_id: milestoneOneId, contract_id: contractId, payment_notice: paymentNotice }
    });

    await addMessage(client, {
      conversationId,
      senderId: vendorId,
      senderRole: 'vendor',
      messageType: 'milestone_card',
      body: 'Milestone proposed: Install cabinetry',
      metadata: { milestone_id: milestoneTwoId, contract_id: contractId, payment_notice: paymentNotice }
    });

    const paymentEventId = createId('pay');
    await client.query(
      `INSERT INTO payment_events (id, conversation_id, contract_id, milestone_id, user_id, role, event_label, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)` ,
      [paymentEventId, conversationId, contractId, milestoneOneId, customerId, 'customer', 'Deposit paid', JSON.stringify({ payment_notice: paymentNotice })]
    );

    await addMessage(client, {
      conversationId,
      senderId: customerId,
      senderRole: 'customer',
      messageType: 'payment_event',
      body: 'Deposit paid',
      metadata: { payment_event_id: paymentEventId, contract_id: contractId, milestone_id: milestoneOneId, payment_notice: paymentNotice }
    });

    let disputeId = null;
    if (disputed) {
      disputeId = createId('dis');
      await client.query(
        `INSERT INTO contract_disputes (id, contract_id, milestone_id, conversation_id, raised_by, raised_role, reason, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'open')`,
        [disputeId, contractId, milestoneTwoId, conversationId, customerId, 'customer', 'Work quality dispute']
      );

      await client.query(
        `INSERT INTO dispute_evidence (id, dispute_id, uploaded_by, url, file_name, mime_type, size_bytes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)` ,
        [createId('evi'), disputeId, customerId, 'https://example.com/evidence/photo1.jpg', 'photo1.jpg', 'image/jpeg', 204800]
      );

      await client.query(
        `INSERT INTO dispute_notes (id, dispute_id, author_id, note, is_internal)
         VALUES ($1,$2,$3,$4,$5)` ,
        [createId('dnt'), disputeId, customerId, 'Customer provided photos of defects', false]
      );

      await addMessage(client, {
        conversationId,
        senderId: customerId,
        senderRole: 'system',
        messageType: 'system_alert',
        body: 'Dispute raised',
        metadata: { dispute_id: disputeId, contract_id: contractId, milestone_id: milestoneTwoId }
      });
    }

    await client.query(
      `UPDATE conversations
       SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [contractMessageId, conversationId]
    );

    await client.query('COMMIT');

    await addSystemEvent(conversationId, 'contract_seeded', vendorId, { contract_id: contractId, disputed });

    return { conversationId, contractId, disputeId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

(async () => {
  try {
    const customerId = await getOrCreateUser('customer', 'seed.customer@tradematch.local');
    const vendorId = await getOrCreateUser('vendor', 'seed.vendor@tradematch.local');

    const activeSeed = await seedConversationWithContract({ customerId, vendorId, status: 'accepted', disputed: false });
    const disputeSeed = await seedConversationWithContract({ customerId, vendorId, status: 'sent', disputed: true });

    console.log('Seed complete:', {
      customerId,
      vendorId,
      active: activeSeed,
      disputed: disputeSeed
    });
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
