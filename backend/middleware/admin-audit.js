let pool;

const setPool = (p) => {
    pool = p;
};

const resolveValue = (resolver, req, res) => {
    if (typeof resolver === 'function') {
        return resolver(req, res);
    }
    return resolver || null;
};

const adminAudit = ({ action, targetType, getTargetId, getDetails }) => {
    return (req, res, next) => {
        res.on('finish', async () => {
            if (!pool) return;
            if (!req.user || !req.user.userId) return;
            if (res.statusCode < 200 || res.statusCode >= 400) return;

            try {
                const targetId = resolveValue(getTargetId, req, res);
                const details = resolveValue(getDetails, req, res);

                await pool.query(
                    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [
                        req.user.userId,
                        action,
                        targetType || null,
                        targetId || null,
                        details ? JSON.stringify(details) : null
                    ]
                );
            } catch (error) {
                console.error('Admin audit log error:', error.message);
            }
        });

        next();
    };
};

module.exports = {
    setPool,
    adminAudit
};
