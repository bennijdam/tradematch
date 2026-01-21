/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Create users table if not exists
    pgm.createTable('users', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        user_type: {
            type: 'varchar(50)',
            notNull: true
        },
        full_name: {
            type: 'varchar(255)',
            notNull: true
        },
        email: {
            type: 'varchar(255)',
            notNull: true,
            unique: true
        },
        phone: {
            type: 'varchar(50)'
        },
        password: {
            type: 'varchar(255)'
        },
        postcode: {
            type: 'varchar(20)'
        },
        oauth_provider: {
            type: 'varchar(50)',
            default: 'local'
        },
        oauth_id: {
            type: 'varchar(255)'
        },
        email_verified: {
            type: 'boolean',
            default: false
        },
        active: {
            type: 'boolean',
            default: true
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

    // Create index on email for faster lookups
    pgm.createIndex('users', 'email', { ifNotExists: true });
    pgm.createIndex('users', 'oauth_id', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('users');
};
