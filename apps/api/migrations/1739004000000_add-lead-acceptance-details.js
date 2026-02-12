/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql("ALTER TABLE lead_acceptance_log ADD COLUMN IF NOT EXISTS details JSONB");
};

exports.down = (pgm) => {
    pgm.sql("ALTER TABLE lead_acceptance_log DROP COLUMN IF EXISTS details");
};
