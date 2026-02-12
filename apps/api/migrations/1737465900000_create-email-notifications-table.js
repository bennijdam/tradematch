/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Create email_notifications table for tracking sent emails
    pgm.createTable('email_notifications', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        user_id: {
            type: 'varchar(50)',
            references: 'users',
            onDelete: 'SET NULL'
        },
        recipient_email: {
            type: 'varchar(255)',
            notNull: true
        },
        email_type: {
            type: 'varchar(100)',
            notNull: true,
            comment: 'welcome, verification, password_reset, payment_confirmation, etc.'
        },
        subject: {
            type: 'text',
            notNull: true
        },
        status: {
            type: 'varchar(50)',
            notNull: true,
            default: 'pending',
            comment: 'pending, sent, failed, bounced'
        },
        provider: {
            type: 'varchar(50)',
            comment: 'resend, smtp, sendgrid, etc.'
        },
        provider_message_id: {
            type: 'varchar(255)'
        },
        error_message: {
            type: 'text'
        },
        metadata: {
            type: 'jsonb',
            default: '{}'
        },
        sent_at: {
            type: 'timestamp'
        },
        opened_at: {
            type: 'timestamp'
        },
        clicked_at: {
            type: 'timestamp'
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

    // Create indexes
    pgm.createIndex('email_notifications', 'user_id', { ifNotExists: true });
    pgm.createIndex('email_notifications', 'recipient_email', { ifNotExists: true });
    pgm.createIndex('email_notifications', 'email_type', { ifNotExists: true });
    pgm.createIndex('email_notifications', 'status', { ifNotExists: true });
    pgm.createIndex('email_notifications', 'created_at', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('email_notifications');
};
