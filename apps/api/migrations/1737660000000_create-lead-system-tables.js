/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Lead pricing rules table
    pgm.createTable('lead_pricing_rules', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        category: {
            type: 'varchar(100)',
            notNull: true,
            comment: 'Service category (plumbing, electrical, etc)'
        },
        min_budget: {
            type: 'integer',
            comment: 'Minimum job budget in pounds'
        },
        max_budget: {
            type: 'integer',
            comment: 'Maximum job budget in pounds'
        },
        base_credit_cost: {
            type: 'integer',
            notNull: true,
            comment: 'Credits required to access this lead'
        },
        urgency_multiplier: {
            type: 'numeric(3,2)',
            default: 1.0,
            comment: '1.0 for normal, 1.25 for urgent, 1.5 for very urgent'
        },
        quality_bonus_min_score: {
            type: 'integer',
            default: 75,
            comment: 'Minimum quality score for bonus pricing'
        },
        quality_bonus_credit_cost: {
            type: 'integer',
            default: 0,
            comment: 'Additional credits for high quality leads'
        },
        region: {
            type: 'varchar(50)',
            comment: 'UK region (London, Manchester, etc) - null for nationwide'
        },
        active: {
            type: 'boolean',
            notNull: true,
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
    }, { ifNotExists: true });

    // Vendor credits table
    pgm.createTable('vendor_credits', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        vendor_id: {
            type: 'varchar(50)',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },
        available_credits: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Credits available for lead access'
        },
        total_purchased_credits: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Lifetime credits purchased'
        },
        total_spent_credits: {
            type: 'integer',
            notNull: true,
            default: 0,
            comment: 'Total credits spent on leads'
        },
        credit_balance_history: {
            type: 'jsonb',
            default: pgm.func("'[]'::jsonb"),
            comment: 'Array of credit transactions for audit trail'
        },
        expires_at: {
            type: 'timestamp',
            comment: 'Date when credits expire (if applicable)'
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
    }, { ifNotExists: true });

    // Lead qualification scores table
    pgm.createTable('lead_qualification_scores', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        quote_id: {
            type: 'varchar(50)',
            notNull: true,
            unique: true,
            references: 'quotes(id)',
            onDelete: 'CASCADE'
        },
        budget_score: {
            type: 'integer',
            default: 50,
            comment: '0-30: based on budget clarity and realism'
        },
        details_score: {
            type: 'integer',
            default: 50,
            comment: '0-20: based on description length and detail'
        },
        urgency_score: {
            type: 'integer',
            default: 50,
            comment: '0-15: based on urgency level'
        },
        customer_verification_score: {
            type: 'integer',
            default: 50,
            comment: '0-15: email verified, phone verified, etc'
        },
        media_score: {
            type: 'integer',
            default: 0,
            comment: '0-10: photos/videos attached'
        },
        location_clarity_score: {
            type: 'integer',
            default: 50,
            comment: '0-10: postcode verified vs approximate'
        },
        overall_quality_score: {
            type: 'integer',
            notNull: true,
            comment: '0-100: weighted aggregate score'
        },
        qualification_level: {
            type: 'varchar(20)',
            notNull: true,
            default: 'standard',
            comment: 'standard, qualified, premium, or elite'
        },
        calculated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        recalculated_at: {
            type: 'timestamp'
        }
    }, { ifNotExists: true });

    // Lead distributions table (tracks which vendors got access to which leads)
    pgm.createTable('lead_distributions', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        quote_id: {
            type: 'varchar(50)',
            notNull: true,
            references: 'quotes(id)',
            onDelete: 'CASCADE'
        },
        vendor_id: {
            type: 'varchar(50)',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },
        match_score: {
            type: 'integer',
            notNull: true,
            comment: '0-100: match quality based on location, specialty, rating'
        },
        distance_miles: {
            type: 'numeric(5,2)',
            comment: 'Distance from vendor to job location'
        },
        distribution_order: {
            type: 'integer',
            notNull: true,
            comment: 'Order in which vendor was offered (1st, 2nd, 3rd, etc)'
        },
        status: {
            type: 'varchar(50)',
            notNull: true,
            default: 'offered',
            comment: 'offered, viewed, bid_submitted, abandoned'
        },
        credits_charged: {
            type: 'integer',
            notNull: true,
            comment: 'Credits charged when lead was distributed'
        },
        view_count: {
            type: 'integer',
            default: 0,
            comment: 'How many times vendor viewed the lead'
        },
        bid_submitted: {
            type: 'boolean',
            default: false
        },
        viewed_at: {
            type: 'timestamp'
        },
        distributed_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    }, { ifNotExists: true });

    // Lead purchase history table
    pgm.createTable('credit_purchases', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        vendor_id: {
            type: 'varchar(50)',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },
        credits_purchased: {
            type: 'integer',
            notNull: true,
            comment: 'Number of credits purchased'
        },
        amount_paid: {
            type: 'numeric(10,2)',
            notNull: true,
            comment: 'Amount paid in pounds'
        },
        price_per_credit: {
            type: 'numeric(10,2)',
            notNull: true,
            comment: 'Price per credit at time of purchase'
        },
        payment_method: {
            type: 'varchar(50)',
            notNull: true,
            comment: 'stripe, bank_transfer, etc'
        },
        stripe_payment_intent_id: {
            type: 'varchar(255)',
            comment: 'Reference to Stripe payment'
        },
        status: {
            type: 'varchar(50)',
            notNull: true,
            default: 'pending',
            comment: 'pending, completed, failed, refunded'
        },
        discount_applied: {
            type: 'varchar(100)',
            comment: 'Discount code or promotion applied'
        },
        bulk_purchase_bonus: {
            type: 'integer',
            default: 0,
            comment: 'Bonus credits for bulk purchases'
        },
        expires_at: {
            type: 'timestamp',
            comment: 'When these credits expire (if applicable)'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        completed_at: {
            type: 'timestamp'
        }
    }, { ifNotExists: true });

    // Lead analytics snapshot (daily aggregation for performance)
    pgm.createTable('lead_analytics_daily', {
        id: {
            type: 'serial',
            primaryKey: true
        },
        vendor_id: {
            type: 'varchar(50)',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },
        analytics_date: {
            type: 'date',
            notNull: true,
            comment: 'Date of analytics snapshot'
        },
        leads_offered: {
            type: 'integer',
            default: 0
        },
        leads_viewed: {
            type: 'integer',
            default: 0
        },
        bids_submitted: {
            type: 'integer',
            default: 0
        },
        jobs_won: {
            type: 'integer',
            default: 0
        },
        credits_spent: {
            type: 'integer',
            default: 0
        },
        revenue_generated: {
            type: 'numeric(10,2)',
            default: 0
        },
        roi_percent: {
            type: 'numeric(5,2)',
            default: 0,
            comment: 'Revenue / (credits_spent * avg_credit_price) * 100'
        },
        avg_lead_quality_score: {
            type: 'integer',
            default: 0
        },
        conversion_rate: {
            type: 'numeric(5,2)',
            default: 0,
            comment: 'bids_submitted / leads_viewed * 100'
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    }, { ifNotExists: true });

    // Create indexes for performance
    pgm.createIndex('lead_pricing_rules', 'category', { ifNotExists: true });
    pgm.createIndex('lead_pricing_rules', ['min_budget', 'max_budget'], { ifNotExists: true });
    pgm.createIndex('vendor_credits', 'vendor_id', { ifNotExists: true });
    pgm.createIndex('lead_qualification_scores', 'quote_id', { ifNotExists: true });
    pgm.createIndex('lead_distributions', ['quote_id', 'vendor_id'], { ifNotExists: true });
    pgm.createIndex('lead_distributions', 'distribution_order', { ifNotExists: true });
    pgm.createIndex('credit_purchases', 'vendor_id', { ifNotExists: true });
    pgm.createIndex('credit_purchases', 'status', { ifNotExists: true });
    pgm.createIndex('lead_analytics_daily', ['vendor_id', 'analytics_date'], { ifNotExists: true });
};

exports.down = pgm => {
    pgm.dropTable('lead_analytics_daily', { ifExists: true });
    pgm.dropTable('credit_purchases', { ifExists: true });
    pgm.dropTable('lead_distributions', { ifExists: true });
    pgm.dropTable('lead_qualification_scores', { ifExists: true });
    pgm.dropTable('vendor_credits', { ifExists: true });
    pgm.dropTable('lead_pricing_rules', { ifExists: true });
};
