exports.up = (pgm) => {
    pgm.addColumn('lead_analytics_daily', {
        customer_id: {
            type: 'varchar(50)',
            references: 'users(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addColumn('lead_analytics_daily', {
        service_type: {
            type: 'varchar(100)'
        }
    });

    pgm.addColumn('lead_analytics_daily', {
        quality_score: {
            type: 'integer'
        }
    });

    pgm.addColumn('lead_analytics_daily', {
        quality_tier: {
            type: 'varchar(50)'
        }
    });

    pgm.addColumn('lead_analytics_daily', {
        estimated_lead_cost: {
            type: 'numeric(10,2)'
        }
    });

    pgm.addColumn('lead_analytics_daily', {
        vendor_count_offered: {
            type: 'integer'
        }
    });

    pgm.addColumn('lead_analytics_daily', {
        location: {
            type: 'varchar(120)'
        }
    });

    pgm.addColumn('lead_analytics_daily', {
        leads_posted: {
            type: 'integer',
            default: 0
        }
    });

    pgm.alterColumn('lead_analytics_daily', 'analytics_date', {
        default: pgm.func('current_date')
    });

    pgm.createIndex('lead_analytics_daily', ['customer_id', 'analytics_date'], {
        name: 'lead_analytics_daily_customer_date_uq',
        unique: true,
        ifNotExists: true
    });
};

exports.down = (pgm) => {
    pgm.dropIndex('lead_analytics_daily', ['customer_id', 'analytics_date'], {
        name: 'lead_analytics_daily_customer_date_uq',
        ifExists: true
    });

    pgm.alterColumn('lead_analytics_daily', 'analytics_date', {
        default: null
    });

    pgm.dropColumn('lead_analytics_daily', 'leads_posted', { ifExists: true });
    pgm.dropColumn('lead_analytics_daily', 'location', { ifExists: true });
    pgm.dropColumn('lead_analytics_daily', 'vendor_count_offered', { ifExists: true });
    pgm.dropColumn('lead_analytics_daily', 'estimated_lead_cost', { ifExists: true });
    pgm.dropColumn('lead_analytics_daily', 'quality_tier', { ifExists: true });
    pgm.dropColumn('lead_analytics_daily', 'quality_score', { ifExists: true });
    pgm.dropColumn('lead_analytics_daily', 'service_type', { ifExists: true });
    pgm.dropColumn('lead_analytics_daily', 'customer_id', { ifExists: true });
};
