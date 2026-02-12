/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Add email preference columns to users table
    pgm.addColumns('users', {
        email_notifications_enabled: {
            type: 'boolean',
            notNull: true,
            default: true,
            comment: 'Master switch for all email notifications'
        },
        email_preferences: {
            type: 'jsonb',
            notNull: true,
            default: JSON.stringify({
                newBids: true,           // Notify when receiving new bids (customer)
                bidAccepted: true,       // Notify when bid is accepted (vendor)
                newQuotes: true,         // Notify of new quote opportunities (vendor)
                paymentConfirmed: true,  // Payment confirmation emails
                reviewReminder: true,    // Remind to leave reviews
                quoteUpdates: true,      // Quote status updates
                marketing: false,        // Marketing and promotional emails
                newsletter: false        // Weekly/monthly newsletters
            }),
            comment: 'Granular email notification preferences'
        }
    }, {
        ifNotExists: true
    });

    // Create index on email_notifications_enabled for faster queries
    pgm.createIndex('users', 'email_notifications_enabled', { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropColumns('users', ['email_notifications_enabled', 'email_preferences']);
    pgm.dropIndex('users', 'email_notifications_enabled', { ifExists: true });
};
