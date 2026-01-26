/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('finance_ledger_entries', {
        id: { type: 'uuid', primaryKey: true },
        related_stripe_object: { type: 'varchar(100)' },
        user_id: { type: 'varchar(50)' },
        amount_cents: { type: 'bigint', notNull: true },
        currency: { type: 'varchar(3)', notNull: true, default: 'GBP' },
        entry_type: { type: 'varchar(40)', notNull: true },
        reason_code: { type: 'varchar(60)' },
        created_by: { type: 'varchar(50)' },
        idempotency_key: { type: 'varchar(100)' },
        metadata: { type: 'jsonb', default: pgm.func("'{}'::jsonb") },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('finance_ledger_entries', 'user_id', { ifNotExists: true });
    pgm.createIndex('finance_ledger_entries', 'related_stripe_object', { ifNotExists: true });

    pgm.createTable('finance_refunds', {
        id: { type: 'uuid', primaryKey: true },
        payment_id: { type: 'varchar(50)' },
        stripe_payment_intent_id: { type: 'varchar(100)' },
        stripe_refund_id: { type: 'varchar(100)' },
        amount_cents: { type: 'bigint', notNull: true },
        currency: { type: 'varchar(3)', notNull: true, default: 'GBP' },
        status: { type: 'varchar(20)', notNull: true, default: 'pending' },
        reason_code: { type: 'varchar(60)', notNull: true },
        requested_by: { type: 'varchar(50)', notNull: true },
        approved_by: { type: 'varchar(50)' },
        approved_at: { type: 'timestamp' },
        memo: { type: 'text' },
        idempotency_key: { type: 'varchar(100)' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createTable('finance_credit_lots', {
        id: { type: 'uuid', primaryKey: true },
        vendor_id: { type: 'varchar(50)', notNull: true },
        amount_cents: { type: 'bigint', notNull: true },
        remaining_cents: { type: 'bigint', notNull: true },
        currency: { type: 'varchar(3)', notNull: true, default: 'GBP' },
        origin: { type: 'varchar(40)', notNull: true },
        expires_at: { type: 'timestamp' },
        created_by: { type: 'varchar(50)', notNull: true },
        memo: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createTable('finance_credit_usage', {
        id: { type: 'uuid', primaryKey: true },
        credit_lot_id: { type: 'uuid', notNull: true, references: 'finance_credit_lots(id)', onDelete: 'CASCADE' },
        vendor_id: { type: 'varchar(50)', notNull: true },
        amount_cents: { type: 'bigint', notNull: true },
        used_for: { type: 'varchar(80)' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createTable('finance_vendor_scores', {
        vendor_id: { type: 'varchar(50)', primaryKey: true },
        score: { type: 'integer', notNull: true, default: 100 },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createTable('finance_score_events', {
        id: { type: 'uuid', primaryKey: true },
        vendor_id: { type: 'varchar(50)', notNull: true },
        delta: { type: 'integer', notNull: true },
        reason: { type: 'varchar(80)', notNull: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('finance_score_events', { ifExists: true });
    pgm.dropTable('finance_vendor_scores', { ifExists: true });
    pgm.dropTable('finance_credit_usage', { ifExists: true });
    pgm.dropTable('finance_credit_lots', { ifExists: true });
    pgm.dropTable('finance_refunds', { ifExists: true });
    pgm.dropTable('finance_ledger_entries', { ifExists: true });
};
