/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('finance_webhook_events', {
        event_id: { type: 'varchar(100)', primaryKey: true },
        event_type: { type: 'varchar(100)', notNull: true },
        related_stripe_object: { type: 'varchar(100)' },
        processed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('finance_webhook_events', { ifExists: true });
};
