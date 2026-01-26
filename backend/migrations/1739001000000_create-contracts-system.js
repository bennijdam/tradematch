/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('contracts', {
        id: { type: 'varchar(60)', primaryKey: true },
        conversation_id: { type: 'varchar(60)', notNull: true },
        job_id: { type: 'varchar(60)' },
        customer_id: { type: 'varchar(60)', notNull: true },
        vendor_id: { type: 'varchar(60)', notNull: true },
        status: { type: 'varchar(30)', notNull: true, default: 'pending_acceptance' },
        scope_of_work: { type: 'text', notNull: true },
        total_price: { type: 'numeric(12,2)' },
        milestone_summary: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
        start_date: { type: 'date' },
        end_date: { type: 'date' },
        cancellation_terms: { type: 'text' },
        variation_terms: { type: 'text' },
        created_by: { type: 'varchar(60)', notNull: true },
        is_locked: { type: 'boolean', notNull: true, default: false },
        locked_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('contracts', ['conversation_id'], { ifNotExists: true });
    pgm.createIndex('contracts', ['customer_id'], { ifNotExists: true });
    pgm.createIndex('contracts', ['vendor_id'], { ifNotExists: true });
    pgm.createIndex('contracts', ['status'], { ifNotExists: true });

    pgm.createTable('contract_acceptances', {
        id: { type: 'varchar(60)', primaryKey: true },
        contract_id: { type: 'varchar(60)', notNull: true },
        user_id: { type: 'varchar(60)', notNull: true },
        role: { type: 'varchar(20)', notNull: true },
        ip_address: { type: 'text' },
        user_agent: { type: 'text' },
        accepted_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('contract_acceptances', ['contract_id'], { ifNotExists: true });
    pgm.createIndex('contract_acceptances', ['user_id'], { ifNotExists: true });
    pgm.addConstraint('contract_acceptances', 'contract_acceptances_unique', {
        unique: ['contract_id', 'user_id']
    });

    pgm.createTable('contract_milestones', {
        id: { type: 'varchar(60)', primaryKey: true },
        contract_id: { type: 'varchar(60)', notNull: true },
        conversation_id: { type: 'varchar(60)', notNull: true },
        title: { type: 'text', notNull: true },
        description: { type: 'text' },
        amount: { type: 'numeric(12,2)' },
        due_date: { type: 'date' },
        status: { type: 'varchar(20)', notNull: true, default: 'proposed' },
        created_by: { type: 'varchar(60)', notNull: true },
        is_disputed: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('contract_milestones', ['contract_id'], { ifNotExists: true });
    pgm.createIndex('contract_milestones', ['conversation_id'], { ifNotExists: true });
    pgm.createIndex('contract_milestones', ['status'], { ifNotExists: true });
    pgm.createIndex('contract_milestones', ['due_date'], { ifNotExists: true });

    pgm.createTable('contract_disputes', {
        id: { type: 'varchar(60)', primaryKey: true },
        contract_id: { type: 'varchar(60)', notNull: true },
        milestone_id: { type: 'varchar(60)' },
        conversation_id: { type: 'varchar(60)', notNull: true },
        raised_by: { type: 'varchar(60)', notNull: true },
        raised_role: { type: 'varchar(20)', notNull: true },
        reason: { type: 'text', notNull: true },
        status: { type: 'varchar(20)', notNull: true, default: 'open' },
        outcome: { type: 'varchar(30)' },
        resolved_by: { type: 'varchar(60)' },
        resolved_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('contract_disputes', ['contract_id'], { ifNotExists: true });
    pgm.createIndex('contract_disputes', ['milestone_id'], { ifNotExists: true });
    pgm.createIndex('contract_disputes', ['status'], { ifNotExists: true });

    pgm.createTable('dispute_evidence', {
        id: { type: 'varchar(60)', primaryKey: true },
        dispute_id: { type: 'varchar(60)', notNull: true },
        uploaded_by: { type: 'varchar(60)', notNull: true },
        url: { type: 'text', notNull: true },
        file_name: { type: 'text' },
        mime_type: { type: 'varchar(80)' },
        size_bytes: { type: 'bigint' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('dispute_evidence', ['dispute_id'], { ifNotExists: true });

    pgm.createTable('dispute_notes', {
        id: { type: 'varchar(60)', primaryKey: true },
        dispute_id: { type: 'varchar(60)', notNull: true },
        author_id: { type: 'varchar(60)', notNull: true },
        note: { type: 'text', notNull: true },
        is_internal: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('dispute_notes', ['dispute_id'], { ifNotExists: true });

    pgm.createTable('payment_events', {
        id: { type: 'varchar(60)', primaryKey: true },
        conversation_id: { type: 'varchar(60)', notNull: true },
        contract_id: { type: 'varchar(60)' },
        milestone_id: { type: 'varchar(60)' },
        user_id: { type: 'varchar(60)', notNull: true },
        role: { type: 'varchar(20)', notNull: true },
        event_label: { type: 'text', notNull: true },
        metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('payment_events', ['conversation_id'], { ifNotExists: true });
    pgm.createIndex('payment_events', ['contract_id'], { ifNotExists: true });
    pgm.createIndex('payment_events', ['milestone_id'], { ifNotExists: true });

    pgm.createTable('contract_audit', {
        id: { type: 'varchar(60)', primaryKey: true },
        contract_id: { type: 'varchar(60)', notNull: true },
        actor_id: { type: 'varchar(60)', notNull: true },
        action: { type: 'varchar(40)', notNull: true },
        details: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('contract_audit', ['contract_id'], { ifNotExists: true });

    pgm.createTable('milestone_audit', {
        id: { type: 'varchar(60)', primaryKey: true },
        milestone_id: { type: 'varchar(60)', notNull: true },
        actor_id: { type: 'varchar(60)', notNull: true },
        action: { type: 'varchar(40)', notNull: true },
        details: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('milestone_audit', ['milestone_id'], { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('milestone_audit', { ifExists: true, cascade: true });
    pgm.dropTable('contract_audit', { ifExists: true, cascade: true });
    pgm.dropTable('payment_events', { ifExists: true, cascade: true });
    pgm.dropTable('dispute_notes', { ifExists: true, cascade: true });
    pgm.dropTable('dispute_evidence', { ifExists: true, cascade: true });
    pgm.dropTable('contract_disputes', { ifExists: true, cascade: true });
    pgm.dropTable('contract_milestones', { ifExists: true, cascade: true });
    pgm.dropTable('contract_acceptances', { ifExists: true, cascade: true });
    pgm.dropTable('contracts', { ifExists: true, cascade: true });
};
