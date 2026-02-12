/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Create payments table
    pgm.createTable('payments', {
        id: {
            type: 'varchar(100)',
            primaryKey: true
        },
        quote_id: {
            type: 'varchar(100)',
            notNull: true
        },
        customer_id: {
            type: 'integer',
            notNull: true,
            references: 'users',
            onDelete: 'RESTRICT'
        },
        vendor_id: {
            type: 'integer',
            notNull: true,
            references: 'users',
            onDelete: 'RESTRICT'
        },
        amount: {
            type: 'decimal(10,2)',
            notNull: true
        },
        currency: {
            type: 'varchar(3)',
            default: 'GBP'
        },
        status: {
            type: 'varchar(50)',
            notNull: true,
            default: 'pending',
            comment: 'pending, completed, failed, refunded'
        },
        stripe_payment_intent_id: {
            type: 'varchar(255)',
            unique: true
        },
        stripe_charge_id: {
            type: 'varchar(255)'
        },
        escrow_status: {
            type: 'varchar(50)',
            default: 'held',
            comment: 'held, released, refunded'
        },
        paid_at: {
            type: 'timestamp'
        },
        released_at: {
            type: 'timestamp'
        },
        metadata: {
            type: 'jsonb',
            default: '{}'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        updated_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp')
        }
    }, {
        ifNotExists: true
    });

    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'GBP'");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'pending'");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id varchar(255)");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_charge_id varchar(255)");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS escrow_status varchar(50) DEFAULT 'held'");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamp");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS released_at timestamp");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb");
    pgm.sql("ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT current_timestamp");

    // Create indexes
    pgm.createIndex('payments', 'customer_id', { ifNotExists: true });
    pgm.createIndex('payments', 'vendor_id', { ifNotExists: true });
    pgm.createIndex('payments', 'quote_id', { ifNotExists: true });
    pgm.createIndex('payments', 'stripe_payment_intent_id', { ifNotExists: true });
    pgm.createIndex('payments', 'status', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('payments');
};
