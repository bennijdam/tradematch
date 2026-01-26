/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql("ALTER TABLE credit_purchases ADD COLUMN IF NOT EXISTS stripe_checkout_session_id varchar(255)");
    pgm.sql("ALTER TABLE credit_purchases ADD COLUMN IF NOT EXISTS stripe_customer_id varchar(255)");
    pgm.sql("ALTER TABLE credit_purchases ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb");
    pgm.sql("ALTER TABLE credit_purchases ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT current_timestamp");

    pgm.createIndex('credit_purchases', 'stripe_payment_intent_id', { ifNotExists: true });
    pgm.createIndex('credit_purchases', 'stripe_checkout_session_id', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropIndex('credit_purchases', 'stripe_checkout_session_id', { ifExists: true });
    pgm.dropIndex('credit_purchases', 'stripe_payment_intent_id', { ifExists: true });
    pgm.sql("ALTER TABLE credit_purchases DROP COLUMN IF EXISTS stripe_checkout_session_id");
    pgm.sql("ALTER TABLE credit_purchases DROP COLUMN IF EXISTS stripe_customer_id");
    pgm.sql("ALTER TABLE credit_purchases DROP COLUMN IF EXISTS metadata");
    pgm.sql("ALTER TABLE credit_purchases DROP COLUMN IF EXISTS updated_at");
};
