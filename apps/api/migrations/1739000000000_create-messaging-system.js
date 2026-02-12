/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Conversations
    pgm.createTable('conversations', {
        id: { type: 'varchar(60)', primaryKey: true },
        job_id: { type: 'varchar(60)', notNull: true },
        customer_id: { type: 'varchar(60)', notNull: true },
        vendor_id: { type: 'varchar(60)', notNull: true },
        conversation_type: { type: 'varchar(30)', notNull: true, default: 'job' },
        status: { type: 'varchar(20)', notNull: true, default: 'open' },
        is_locked: { type: 'boolean', notNull: true, default: false },
        is_disputed: { type: 'boolean', notNull: true, default: false },
        is_system: { type: 'boolean', notNull: true, default: false },
        contact_allowed: { type: 'boolean', notNull: true, default: false },
        last_message_id: { type: 'varchar(60)' },
        last_message_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('conversations', ['job_id'], { ifNotExists: true });
    pgm.createIndex('conversations', ['customer_id'], { ifNotExists: true });
    pgm.createIndex('conversations', ['vendor_id'], { ifNotExists: true });
    pgm.createIndex('conversations', ['status'], { ifNotExists: true });
    pgm.createIndex('conversations', ['conversation_type'], { ifNotExists: true });
    pgm.createIndex('conversations', ['last_message_at'], { ifNotExists: true });

    pgm.addConstraint('conversations', 'conversations_job_customer_vendor_type_unique', {
        unique: ['job_id', 'customer_id', 'vendor_id', 'conversation_type']
    });

    // Participants
    pgm.createTable('conversation_participants', {
        id: 'id',
        conversation_id: { type: 'varchar(60)', notNull: true },
        user_id: { type: 'varchar(60)', notNull: true },
        role: { type: 'varchar(20)', notNull: true },
        notification_pref: { type: 'varchar(20)', notNull: true, default: 'instant' },
        muted_until: { type: 'timestamp' },
        joined_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('conversation_participants', ['conversation_id'], { ifNotExists: true });
    pgm.createIndex('conversation_participants', ['user_id'], { ifNotExists: true });
    pgm.addConstraint('conversation_participants', 'conversation_participants_unique', {
        unique: ['conversation_id', 'user_id']
    });

    // Messages
    pgm.createTable('messages', {
        id: { type: 'varchar(60)', primaryKey: true },
        conversation_id: { type: 'varchar(60)', notNull: true },
        sender_id: { type: 'varchar(60)' },
        sender_role: { type: 'varchar(20)', notNull: true },
        message_type: { type: 'varchar(30)', notNull: true, default: 'text' },
        body: { type: 'text' },
        metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
        reply_to_message_id: { type: 'varchar(60)' },
        attachment_count: { type: 'integer', notNull: true, default: 0 },
        is_deleted: { type: 'boolean', notNull: true, default: false },
        deleted_at: { type: 'timestamp' },
        edited_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('messages', ['conversation_id'], { ifNotExists: true });
    pgm.createIndex('messages', ['sender_id'], { ifNotExists: true });
    pgm.createIndex('messages', ['created_at'], { ifNotExists: true });

    // Message attachments
    pgm.createTable('message_attachments', {
        id: { type: 'varchar(60)', primaryKey: true },
        message_id: { type: 'varchar(60)', notNull: true },
        attachment_type: { type: 'varchar(20)', notNull: true },
        url: { type: 'text', notNull: true },
        file_name: { type: 'text' },
        mime_type: { type: 'varchar(80)' },
        size_bytes: { type: 'bigint' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('message_attachments', ['message_id'], { ifNotExists: true });

    // Message reads
    pgm.createTable('message_reads', {
        id: 'id',
        message_id: { type: 'varchar(60)', notNull: true },
        user_id: { type: 'varchar(60)', notNull: true },
        read_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('message_reads', ['message_id'], { ifNotExists: true });
    pgm.createIndex('message_reads', ['user_id'], { ifNotExists: true });
    pgm.addConstraint('message_reads', 'message_reads_unique', {
        unique: ['message_id', 'user_id']
    });

    // System events
    pgm.createTable('system_events', {
        id: { type: 'varchar(60)', primaryKey: true },
        conversation_id: { type: 'varchar(60)', notNull: true },
        event_type: { type: 'varchar(40)', notNull: true },
        actor_id: { type: 'varchar(60)' },
        metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('system_events', ['conversation_id'], { ifNotExists: true });
    pgm.createIndex('system_events', ['event_type'], { ifNotExists: true });

    // Moderation flags
    pgm.createTable('moderation_flags', {
        id: { type: 'varchar(60)', primaryKey: true },
        message_id: { type: 'varchar(60)', notNull: true },
        flagged_by: { type: 'varchar(60)', notNull: true },
        reason: { type: 'varchar(80)', notNull: true },
        status: { type: 'varchar(20)', notNull: true, default: 'open' },
        notes: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('moderation_flags', ['message_id'], { ifNotExists: true });
    pgm.createIndex('moderation_flags', ['status'], { ifNotExists: true });

    // Message audit
    pgm.createTable('message_audit', {
        id: { type: 'varchar(60)', primaryKey: true },
        message_id: { type: 'varchar(60)', notNull: true },
        actor_id: { type: 'varchar(60)', notNull: true },
        action: { type: 'varchar(20)', notNull: true },
        old_body: { type: 'text' },
        new_body: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('message_audit', ['message_id'], { ifNotExists: true });

    // Typing indicators
    pgm.createTable('conversation_typing', {
        id: 'id',
        conversation_id: { type: 'varchar(60)', notNull: true },
        user_id: { type: 'varchar(60)', notNull: true },
        role: { type: 'varchar(20)', notNull: true },
        last_seen_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('conversation_typing', ['conversation_id'], { ifNotExists: true });
    pgm.addConstraint('conversation_typing', 'conversation_typing_unique', {
        unique: ['conversation_id', 'user_id']
    });

    // In-app notifications
    pgm.createTable('user_notifications', {
        id: { type: 'varchar(60)', primaryKey: true },
        user_id: { type: 'varchar(60)', notNull: true },
        notification_type: { type: 'varchar(40)', notNull: true },
        title: { type: 'text' },
        body: { type: 'text' },
        metadata: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
        is_read: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('user_notifications', ['user_id'], { ifNotExists: true });
    pgm.createIndex('user_notifications', ['is_read'], { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('user_notifications', { ifExists: true, cascade: true });
    pgm.dropTable('conversation_typing', { ifExists: true, cascade: true });
    pgm.dropTable('message_audit', { ifExists: true, cascade: true });
    pgm.dropTable('moderation_flags', { ifExists: true, cascade: true });
    pgm.dropTable('system_events', { ifExists: true, cascade: true });
    pgm.dropTable('message_reads', { ifExists: true, cascade: true });
    pgm.dropTable('message_attachments', { ifExists: true, cascade: true });
    pgm.dropTable('messages', { ifExists: true, cascade: true });
    pgm.dropTable('conversation_participants', { ifExists: true, cascade: true });
    pgm.dropTable('conversations', { ifExists: true, cascade: true });
};