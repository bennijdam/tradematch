/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // ==========================================
    // 1. Lead Pricing Tiers
    // ==========================================
    pgm.createTable('lead_pricing_tiers', {
        id: 'id',
        tier_name: { type: 'varchar(50)', notNull: true, unique: true },
        budget_min: { type: 'decimal(10,2)', notNull: true },
        budget_max: { type: 'decimal(10,2)' },
        base_price: { type: 'decimal(6,2)', notNull: true },
        description: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    // Insert default pricing tiers
    pgm.sql(`
        INSERT INTO lead_pricing_tiers (tier_name, budget_min, budget_max, base_price, description) VALUES
        ('micro', 0, 100, 3.50, 'Small jobs under £100'),
        ('small', 100, 500, 6.00, 'Small to medium jobs £100-500'),
        ('medium', 500, 2000, 10.00, 'Medium jobs £500-2000'),
        ('large', 2000, 10000, 15.00, 'Large jobs £2000-10000'),
        ('premium', 10000, NULL, 18.00, 'Premium jobs over £10000')
    `);

    // ==========================================
    // 2. Category Pricing Multipliers
    // ==========================================
    pgm.createTable('category_pricing_multipliers', {
        id: 'id',
        category: { type: 'varchar(100)', notNull: true, unique: true },
        multiplier: { type: 'decimal(4,2)', notNull: true, default: 1.00 },
        description: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.sql(`
        INSERT INTO category_pricing_multipliers (category, multiplier, description) VALUES
        ('painting', 0.90, 'Lower complexity'),
        ('plumbing', 1.00, 'Standard complexity'),
        ('electrical', 1.10, 'Higher skill requirement'),
        ('carpentry', 1.00, 'Standard complexity'),
        ('building', 1.20, 'Complex projects'),
        ('roofing', 1.30, 'Specialized skill'),
        ('heating', 1.10, 'Specialized equipment'),
        ('landscaping', 0.95, 'Lower barrier to entry'),
        ('kitchens', 1.25, 'High-value projects'),
        ('bathrooms', 1.15, 'Moderate complexity')
    `);

    // ==========================================
    // 3. Location Pricing Zones
    // ==========================================
    pgm.createTable('location_pricing_zones', {
        id: 'id',
        postcode_prefix: { type: 'varchar(10)', notNull: true, unique: true },
        zone_name: { type: 'varchar(100)', notNull: true },
        multiplier: { type: 'decimal(4,2)', notNull: true, default: 1.00 },
        description: { type: 'text' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.sql(`
        INSERT INTO location_pricing_zones (postcode_prefix, zone_name, multiplier, description) VALUES
        ('E', 'East London', 1.00, 'Standard London pricing'),
        ('N', 'North London', 1.10, 'Higher demand area'),
        ('NW', 'Northwest London', 1.15, 'Premium area'),
        ('SE', 'Southeast London', 1.05, 'Growing market'),
        ('SW', 'Southwest London', 1.20, 'Premium area'),
        ('W', 'West London', 1.25, 'High-value area'),
        ('WC', 'Central London', 1.40, 'Premium central area'),
        ('EC', 'City of London', 1.35, 'Business district')
    `);

    // ==========================================
    // 4. Vendor Credits (Wallet)
    // ==========================================
    pgm.createTable('vendor_credits', {
        id: 'id',
        vendor_id: { type: 'varchar(50)', notNull: true, unique: true, references: '"users"' },
        balance: { type: 'decimal(10,2)', notNull: true, default: 0 },
        total_purchased: { type: 'decimal(10,2)', notNull: true, default: 0 },
        total_spent: { type: 'decimal(10,2)', notNull: true, default: 0 },
        total_refunded: { type: 'decimal(10,2)', notNull: true, default: 0 },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('vendor_credits', 'vendor_id', { ifNotExists: true });

    // ==========================================
    // 5. Credit Purchases
    // ==========================================
    pgm.createTable('credit_purchases', {
        id: 'id',
        vendor_id: { type: 'varchar(50)', notNull: true, references: '"users"' },
        amount: { type: 'decimal(10,2)', notNull: true },
        credits_purchased: { type: 'decimal(10,2)', notNull: true },
        payment_method: { type: 'varchar(50)', notNull: true },
        transaction_id: { type: 'varchar(255)' },
        status: { type: 'varchar(50)', notNull: true, default: 'pending' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('credit_purchases', 'vendor_id', { ifNotExists: true });
    pgm.createIndex('credit_purchases', 'created_at', { ifNotExists: true });

    // ==========================================
    // 6. Credit Transactions (Ledger)
    // ==========================================
    pgm.createTable('credit_transactions', {
        id: 'id',
        vendor_id: { type: 'varchar(50)', notNull: true, references: '"users"' },
        amount: { type: 'decimal(10,2)', notNull: true },
        transaction_type: { 
            type: 'varchar(50)', 
            notNull: true,
            check: "transaction_type IN ('purchase', 'spend', 'refund', 'bonus', 'adjustment')"
        },
        description: { type: 'text' },
        reference_id: { type: 'integer' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('credit_transactions', 'vendor_id', { ifNotExists: true });
    pgm.createIndex('credit_transactions', 'created_at', { ifNotExists: true });
    pgm.createIndex('credit_transactions', 'transaction_type', { ifNotExists: true });

    // ==========================================
    // 7. Lead Qualification Scores
    // ==========================================
    pgm.createTable('lead_qualification_scores', {
        id: 'id',
        quote_id: { type: 'varchar(50)', notNull: true, unique: true, references: '"quotes"' },
        overall_score: { type: 'integer', notNull: true, check: 'overall_score >= 0 AND overall_score <= 100' },
        budget_score: { type: 'integer', notNull: true },
        detail_score: { type: 'integer', notNull: true },
        urgency_score: { type: 'integer', notNull: true },
        customer_score: { type: 'integer', notNull: true },
        location_score: { type: 'integer', notNull: true },
        quality_tier: { 
            type: 'varchar(20)', 
            notNull: true,
            check: "quality_tier IN ('premium', 'standard', 'basic')"
        },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'quote_id'
            ) THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS lead_qualification_scores_quote_id_index ON lead_qualification_scores(quote_id)';
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'quality_tier'
            ) THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS lead_qualification_scores_quality_tier_index ON lead_qualification_scores(quality_tier)';
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'overall_score'
            ) THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS lead_qualification_scores_overall_score_index ON lead_qualification_scores(overall_score)';
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'overall_quality_score'
            ) THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS lead_qualification_scores_overall_quality_score_index ON lead_qualification_scores(overall_quality_score)';
            END IF;
        END $$;
    `);

    // ==========================================
    // 8. Lead Distributions
    // ==========================================
    pgm.createTable('lead_distributions', {
        id: 'id',
        quote_id: { type: 'varchar(50)', notNull: true, references: '"quotes"' },
        vendor_id: { type: 'varchar(50)', notNull: true, references: '"users"' },
        lead_cost: { type: 'decimal(6,2)', notNull: true },
        match_score: { type: 'integer', notNull: true, check: 'match_score >= 0 AND match_score <= 100' },
        distance_score: { type: 'integer' },
        specialty_score: { type: 'integer' },
        budget_score: { type: 'integer' },
        performance_score: { type: 'integer' },
        rotation_score: { type: 'integer' },
        accessed: { type: 'boolean', notNull: true, default: false },
        accessed_at: { type: 'timestamp' },
        charged: { type: 'boolean', notNull: true, default: false },
        charged_at: { type: 'timestamp' },
        refunded: { type: 'boolean', notNull: true, default: false },
        refund_amount: { type: 'decimal(6,2)' },
        refund_reason: { type: 'varchar(100)' },
        refunded_at: { type: 'timestamp' },
        distributed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_distributions' AND column_name = 'quote_id'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_distributions' AND column_name = 'vendor_id'
            ) THEN
                EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS lead_distributions_quote_id_vendor_id_unique_index ON lead_distributions(quote_id, vendor_id)';
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_distributions' AND column_name = 'vendor_id'
            ) THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS lead_distributions_vendor_id_index ON lead_distributions(vendor_id)';
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_distributions' AND column_name = 'accessed'
            ) THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS lead_distributions_accessed_index ON lead_distributions(accessed)';
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_distributions' AND column_name = 'distributed_at'
            ) THEN
                EXECUTE 'CREATE INDEX IF NOT EXISTS lead_distributions_distributed_at_index ON lead_distributions(distributed_at)';
            END IF;
        END $$;
    `);

    // ==========================================
    // 9. Vendor Lead Preferences
    // ==========================================
    pgm.createTable('vendor_lead_preferences', {
        id: 'id',
        vendor_id: { type: 'varchar(50)', notNull: true, unique: true, references: '"users"' },
        auto_bid_enabled: { type: 'boolean', notNull: true, default: false },
        min_budget: { type: 'decimal(10,2)' },
        max_budget: { type: 'decimal(10,2)' },
        max_distance_miles: { type: 'integer', default: 25 },
        preferred_categories: { type: 'jsonb', default: '[]' },
        excluded_postcodes: { type: 'jsonb', default: '[]' },
        min_quality_score: { type: 'integer', default: 0, check: 'min_quality_score >= 0 AND min_quality_score <= 100' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('vendor_lead_preferences', 'vendor_id', { ifNotExists: true });

    // ==========================================
    // 10. Vendor Performance Metrics
    // ==========================================
    pgm.createTable('vendor_performance_metrics', {
        id: 'id',
        vendor_id: { type: 'varchar(50)', notNull: true, unique: true, references: '"users"' },
        total_bids_submitted: { type: 'integer', notNull: true, default: 0 },
        total_bids_accepted: { type: 'integer', notNull: true, default: 0 },
        win_rate: { type: 'decimal(5,2)', notNull: true, default: 0 },
        avg_response_time_hours: { type: 'decimal(6,2)', default: 24 },
        avg_customer_rating: { type: 'decimal(3,2)', default: 0 },
        total_jobs_completed: { type: 'integer', notNull: true, default: 0 },
        total_revenue: { type: 'decimal(12,2)', notNull: true, default: 0 },
        reputation_score: { type: 'integer', notNull: true, default: 50, check: 'reputation_score >= 0 AND reputation_score <= 100' },
        last_active: { type: 'timestamp' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, { ifNotExists: true });

    pgm.createIndex('vendor_performance_metrics', 'vendor_id', { ifNotExists: true });
    pgm.createIndex('vendor_performance_metrics', 'reputation_score', { ifNotExists: true });
    pgm.createIndex('vendor_performance_metrics', 'win_rate', { ifNotExists: true });

    // ==========================================
    // Views for Reporting
    // ==========================================
    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'vendor_credits' AND column_name = 'balance'
            ) THEN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'lead_distributions' AND column_name = 'accessed'
                ) THEN
                    EXECUTE '
                        CREATE OR REPLACE VIEW vendor_credit_summary AS
                        SELECT
                            vc.vendor_id,
                            vc.balance AS current_balance,
                            vc.total_purchased,
                            vc.total_spent,
                            vc.total_refunded,
                            (SELECT MAX(created_at) FROM credit_purchases WHERE vendor_id = vc.vendor_id) AS last_purchase_date,
                            (SELECT COUNT(*) FROM lead_distributions WHERE vendor_id = vc.vendor_id AND accessed = true) AS total_leads_accessed
                        FROM vendor_credits vc
                    ';
                ELSE
                    EXECUTE '
                        CREATE OR REPLACE VIEW vendor_credit_summary AS
                        SELECT
                            vc.vendor_id,
                            vc.balance AS current_balance,
                            vc.total_purchased,
                            vc.total_spent,
                            vc.total_refunded,
                            (SELECT MAX(created_at) FROM credit_purchases WHERE vendor_id = vc.vendor_id) AS last_purchase_date,
                            (SELECT COUNT(*) FROM lead_distributions WHERE vendor_id = vc.vendor_id) AS total_leads_accessed
                        FROM vendor_credits vc
                    ';
                END IF;
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'vendor_credits' AND column_name = 'available_credits'
            ) THEN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'lead_distributions' AND column_name = 'accessed'
                ) THEN
                    EXECUTE '
                        CREATE OR REPLACE VIEW vendor_credit_summary AS
                        SELECT
                            vc.vendor_id,
                            vc.available_credits AS current_balance,
                            vc.total_purchased_credits AS total_purchased,
                            vc.total_spent_credits AS total_spent,
                            NULL::numeric AS total_refunded,
                            (SELECT MAX(created_at) FROM credit_purchases WHERE vendor_id = vc.vendor_id) AS last_purchase_date,
                            (SELECT COUNT(*) FROM lead_distributions WHERE vendor_id = vc.vendor_id AND accessed = true) AS total_leads_accessed
                        FROM vendor_credits vc
                    ';
                ELSE
                    EXECUTE '
                        CREATE OR REPLACE VIEW vendor_credit_summary AS
                        SELECT
                            vc.vendor_id,
                            vc.available_credits AS current_balance,
                            vc.total_purchased_credits AS total_purchased,
                            vc.total_spent_credits AS total_spent,
                            NULL::numeric AS total_refunded,
                            (SELECT MAX(created_at) FROM credit_purchases WHERE vendor_id = vc.vendor_id) AS last_purchase_date,
                            (SELECT COUNT(*) FROM lead_distributions WHERE vendor_id = vc.vendor_id) AS total_leads_accessed
                        FROM vendor_credits vc
                    ';
                END IF;
            END IF;
        END $$;
    `);

    pgm.sql(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'quality_tier'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'overall_score'
            ) THEN
                EXECUTE '
                    CREATE OR REPLACE VIEW lead_quality_distribution AS
                    SELECT
                        quality_tier,
                        COUNT(*) as total_leads,
                        AVG(overall_score) as avg_score,
                        MIN(overall_score) as min_score,
                        MAX(overall_score) as max_score
                    FROM lead_qualification_scores
                    GROUP BY quality_tier
                ';
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'qualification_level'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'lead_qualification_scores' AND column_name = 'overall_quality_score'
            ) THEN
                EXECUTE '
                    CREATE OR REPLACE VIEW lead_quality_distribution AS
                    SELECT
                        qualification_level AS quality_tier,
                        COUNT(*) as total_leads,
                        AVG(overall_quality_score) as avg_score,
                        MIN(overall_quality_score) as min_score,
                        MAX(overall_quality_score) as max_score
                    FROM lead_qualification_scores
                    GROUP BY qualification_level
                ';
            END IF;
        END $$;
    `);
};

exports.down = pgm => {
    pgm.dropView('lead_quality_distribution', { ifExists: true });
    pgm.dropView('vendor_credit_summary', { ifExists: true });
    
    pgm.dropTable('vendor_performance_metrics', { ifExists: true, cascade: true });
    pgm.dropTable('vendor_lead_preferences', { ifExists: true, cascade: true });
    pgm.dropTable('lead_distributions', { ifExists: true, cascade: true });
    pgm.dropTable('lead_qualification_scores', { ifExists: true, cascade: true });
    pgm.dropTable('credit_transactions', { ifExists: true, cascade: true });
    pgm.dropTable('credit_purchases', { ifExists: true, cascade: true });
    pgm.dropTable('vendor_credits', { ifExists: true, cascade: true });
    pgm.dropTable('location_pricing_zones', { ifExists: true, cascade: true });
    pgm.dropTable('category_pricing_multipliers', { ifExists: true, cascade: true });
    pgm.dropTable('lead_pricing_tiers', { ifExists: true, cascade: true });
};
