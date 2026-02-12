/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS title text");
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_accepted_at timestamp");
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_accepted_at timestamp");
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_accept_ip text");
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_accept_ip text");
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_user_agent text");
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_user_agent text");
    pgm.sql("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS immutable boolean DEFAULT false");

    pgm.sql("ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'sent'");

    pgm.sql("ALTER TABLE contract_disputes ADD COLUMN IF NOT EXISTS admin_notes text");

    pgm.sql("ALTER TABLE contract_milestones ALTER COLUMN status SET DEFAULT 'planned'");
    pgm.sql("UPDATE contract_milestones SET status = 'planned' WHERE status IN ('proposed','agreed')");
};

exports.down = pgm => {
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS title");
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS customer_accepted_at");
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS vendor_accepted_at");
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS customer_accept_ip");
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS vendor_accept_ip");
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS customer_user_agent");
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS vendor_user_agent");
    pgm.sql("ALTER TABLE contracts DROP COLUMN IF EXISTS immutable");

    pgm.sql("ALTER TABLE contract_disputes DROP COLUMN IF EXISTS admin_notes");
};
