/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Create activation_tokens table for email verification
    pgm.createTable('activation_tokens', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        user_id: {
            type: 'integer',
            notNull: true,
            references: 'users',
            onDelete: 'CASCADE'
        },
        token: {
            type: 'varchar(255)',
            notNull: true,
            unique: true
        },
        token_type: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'email_verification, password_reset, etc.'
        },
        expires_at: {
            type: 'timestamp',
            notNull: true
        },
        used: {
            type: 'boolean',
            default: false
        },
        used_at: {
            type: 'timestamp'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    }, {
        ifNotExists: true
    });

    // Create indexes
    pgm.createIndex('activation_tokens', 'token', { ifNotExists: true });
    pgm.createIndex('activation_tokens', 'user_id', { ifNotExists: true });
    pgm.createIndex('activation_tokens', ['token', 'used'], { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('activation_tokens');
};
