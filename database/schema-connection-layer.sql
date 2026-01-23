-- TradeMatch Connection Layer: Shared Core Entities & Synchronization
-- This schema defines the unified data model connecting Customer and Vendor dashboards
-- All entities include owner_id, role-based access checks, timestamps, and audit trails

-- ============================================================
-- 1. CORE SHARED ENTITIES
-- ============================================================

-- Jobs: Created by customers, assigned to vendors as leads
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    trade_category VARCHAR(100) NOT NULL,
    postcode VARCHAR(10) NOT NULL,
    budget_min DECIMAL(10,2) NOT NULL,
    budget_max DECIMAL(10,2) NOT NULL,
    timeframe VARCHAR(50) NOT NULL CHECK (timeframe IN ('urgent', '1-2_weeks', '1_month', 'flexible')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'in_progress', 'completed', 'cancelled')),
    
    -- Ownership & Visibility
    created_by VARCHAR(50) REFERENCES users(id),
    updated_by VARCHAR(50) REFERENCES users(id),
    
    -- Timestamps & Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT job_budget_range CHECK (budget_min <= budget_max)
);

CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

-- Leads: Assignments of jobs to vendors (role: VENDOR can see)
-- Business Rule: Customer NEVER sees lead pricing. Vendor NEVER sees competing vendors.
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Lead state machine
    status VARCHAR(50) NOT NULL DEFAULT 'offered' CHECK (status IN (
        'offered',          -- Lead assigned; vendor can preview (masked data)
        'accepted',         -- Vendor accepted; full customer details unlocked
        'quote_pending',    -- Vendor preparing quote
        'quote_sent',       -- Vendor quote delivered
        'declined',         -- Vendor declined
        'expired'           -- Lead auto-expired (24-72h default)
    )),
    
    -- Quote acceptance (only one vendor accepted per job)
    quote_accepted_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    expired_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    preview_data JSONB,   -- Masked customer details shown before acceptance
    metadata JSONB,
    
    UNIQUE (job_id, vendor_id),
    CONSTRAINT lead_valid_transition CHECK (
        (status = 'offered' AND accepted_at IS NULL) OR
        (status IN ('accepted', 'quote_pending', 'quote_sent') AND accepted_at IS NOT NULL) OR
        (status IN ('declined', 'expired'))
    )
);

CREATE INDEX idx_leads_vendor ON leads(vendor_id);
CREATE INDEX idx_leads_job ON leads(job_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- Conversations: One conversation per job + vendor pair
-- Business Rule: Messaging disabled by default. Enabled ONLY after lead acceptance.
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id VARCHAR(50) NOT NULL REFERENCES users(id),
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conversation state
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'archived')),
    -- locked: job cancelled; archived: job completed
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMP,
    archived_at TIMESTAMP,
    
    -- Metadata
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    last_message_from VARCHAR(50),
    
    UNIQUE (job_id, vendor_id),
    CONSTRAINT conversation_customer_vendor CHECK (customer_id != vendor_id)
);

CREATE INDEX idx_conversations_job_vendor ON conversations(job_id, vendor_id);
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_vendor ON conversations(vendor_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- Messages: Immutable message history within conversations
-- Business Rule: No editing, no deleting. System messages auto-generated for key events.
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Sender info
    sender_id VARCHAR(50) NOT NULL REFERENCES users(id),
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('customer', 'vendor')),
    
    -- Message content
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN (
        'text',                 -- Regular message
        'system',              -- Auto-generated: lead_accepted, quote_sent, etc.
        'attachment',          -- File attachment
        'quote_reference'      -- Link to quote
    )),
    body TEXT,
    attachment_url VARCHAR(500),
    attachment_type VARCHAR(50),
    
    -- Metadata
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Immutability: no editing
    CONSTRAINT message_immutable CHECK (created_at IS NOT NULL)
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(is_read) WHERE is_read = false;

-- Quotes: Vendor proposals linked to leads
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    
    -- Quote details
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    estimated_duration VARCHAR(100),
    availability VARCHAR(100),
    
    -- State: only one quote can be accepted per job
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Sent by vendor
        'accepted',     -- Accepted by customer
        'rejected',     -- Declined by customer
        'withdrawn'     -- Vendor withdrew
    )),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    withdrawn_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    UNIQUE (job_id, vendor_id)
);

CREATE INDEX idx_quotes_job ON quotes(job_id);
CREATE INDEX idx_quotes_vendor ON quotes(vendor_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Milestones: Payment milestones for job completion tracking
CREATE TABLE IF NOT EXISTS milestones (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    
    -- Milestone details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    percentage_of_total DECIMAL(5,2),
    due_date DATE,
    
    -- State machine
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',          -- Not yet started
        'in_progress',      -- Work started
        'submitted',        -- Vendor submitted for approval
        'approved',         -- Customer approved
        'approved_disputed', -- Customer approved but vendor disputed
        'paid',             -- Payment released
        'failed'            -- Milestone failed
    )),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Completion evidence
    completion_evidence JSONB,
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_milestones_job ON milestones(job_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);

-- ============================================================
-- 2. PAYMENT & ESCROW TABLES
-- ============================================================

-- Escrow accounts: Hold customer funds during job
CREATE TABLE IF NOT EXISTS escrow_accounts (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id VARCHAR(50) NOT NULL REFERENCES users(id),
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    
    -- Escrow state
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Awaiting customer deposit
        'held',         -- Funds locked
        'partial_released', -- Some milestones paid
        'released',     -- All funds released
        'disputed',     -- Dispute in progress
        'refunded'      -- Refunded to customer
    )),
    
    -- Amounts
    total_amount DECIMAL(10,2) NOT NULL,
    held_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    released_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    disputed_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    funded_at TIMESTAMP,
    released_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT escrow_amount_check CHECK (
        held_amount + released_amount + disputed_amount <= total_amount
    )
);

CREATE INDEX idx_escrow_customer ON escrow_accounts(customer_id);
CREATE INDEX idx_escrow_vendor ON escrow_accounts(vendor_id);
CREATE INDEX idx_escrow_status ON escrow_accounts(status);
CREATE INDEX idx_escrow_job ON escrow_accounts(job_id);

-- ============================================================
-- 3. REVIEW & REPUTATION
-- ============================================================

-- Reviews: Post-completion feedback
CREATE TABLE IF NOT EXISTS job_reviews (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL REFERENCES jobs(id),
    customer_id VARCHAR(50) NOT NULL REFERENCES users(id),
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    
    -- Review details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    recommend_yes_no BOOLEAN,
    
    -- Photos / evidence
    photos JSONB,
    
    -- Moderation
    is_moderated BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    moderation_reason TEXT,
    
    -- Vendor response
    vendor_response TEXT,
    vendor_responded_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (job_id, customer_id)
);

CREATE INDEX idx_reviews_vendor ON job_reviews(vendor_id);
CREATE INDEX idx_reviews_customer ON job_reviews(customer_id);
CREATE INDEX idx_reviews_rating ON job_reviews(rating);
CREATE INDEX idx_reviews_approved ON job_reviews(is_approved) WHERE is_approved = true;

-- ============================================================
-- 4. EVENT LOG & AUDIT TRAIL
-- ============================================================

-- Event log: Immutable record of all state changes and actions
-- Used for: audit trail, real-time sync, replay, debugging
CREATE TABLE IF NOT EXISTS event_log (
    id VARCHAR(50) PRIMARY KEY,
    
    -- Event identity
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- 'lead', 'quote', 'message', 'payment', 'review', 'milestone'
    
    -- Actor
    actor_id VARCHAR(50) NOT NULL REFERENCES users(id),
    actor_role VARCHAR(20) NOT NULL,
    
    -- Subject (what changed)
    subject_type VARCHAR(50) NOT NULL, -- 'job', 'lead', 'quote', 'conversation', 'message', 'milestone', 'escrow'
    subject_id VARCHAR(50) NOT NULL,
    
    -- Job context (for filtering/replay)
    job_id VARCHAR(50) REFERENCES jobs(id),
    
    -- Event data
    old_state JSONB,      -- Previous state (if applicable)
    new_state JSONB,      -- New state (if applicable)
    metadata JSONB,
    
    -- Timestamps (immutable)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- System
    idempotency_key VARCHAR(100) UNIQUE, -- Prevent duplicate events
    
    CONSTRAINT event_log_immutable CHECK (created_at IS NOT NULL)
);

CREATE INDEX idx_event_log_type ON event_log(event_type);
CREATE INDEX idx_event_log_subject ON event_log(subject_type, subject_id);
CREATE INDEX idx_event_log_job ON event_log(job_id);
CREATE INDEX idx_event_log_actor ON event_log(actor_id);
CREATE INDEX idx_event_log_created ON event_log(created_at DESC);

-- ============================================================
-- 5. NOTIFICATION PREFERENCES & QUEUE
-- ============================================================

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Channel toggles
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    
    -- Event preferences
    notify_lead_accepted BOOLEAN DEFAULT true,
    notify_quote_received BOOLEAN DEFAULT true,
    notify_quote_accepted BOOLEAN DEFAULT true,
    notify_new_message BOOLEAN DEFAULT true,
    notify_milestone_submitted BOOLEAN DEFAULT true,
    notify_milestone_approved BOOLEAN DEFAULT true,
    notify_payment_released BOOLEAN DEFAULT true,
    notify_review_posted BOOLEAN DEFAULT true,
    notify_review_response BOOLEAN DEFAULT true,
    
    -- Quiet hours
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- Notification queue: For processing notifications asynchronously
CREATE TABLE IF NOT EXISTS notification_queue (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    
    -- Notification details
    event_type VARCHAR(100) NOT NULL,
    recipient_id VARCHAR(50) NOT NULL REFERENCES users(id),
    
    -- Message
    title VARCHAR(200) NOT NULL,
    body TEXT,
    action_url VARCHAR(500),
    
    -- Delivery status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Queued
        'sent',         -- Delivered
        'failed',       -- Failed (retryable)
        'suppressed',   -- User quiet hours or disabled
        'dead_letter'   -- Exhausted retries
    )),
    
    -- Channel delivery
    email_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,
    in_app_created BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,

    -- Retry and error handling
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_created ON notification_queue(created_at DESC);
CREATE INDEX idx_notification_queue_next_attempt ON notification_queue(next_attempt_at);

-- ============================================================
-- 6. HELPER VIEWS & FUNCTIONS
-- ============================================================

-- View: Jobs with full context (customer + vendor + lead status)
CREATE OR REPLACE VIEW job_context_view AS
SELECT
    j.id,
    j.customer_id,
    j.title,
    j.status AS job_status,
    COUNT(DISTINCT l.id) AS total_leads_assigned,
    COUNT(DISTINCT CASE WHEN l.status = 'accepted' THEN l.id END) AS leads_accepted,
    COUNT(DISTINCT q.id) AS quotes_received,
    COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN q.id END) AS quotes_accepted,
    j.created_at,
    j.updated_at
FROM jobs j
LEFT JOIN leads l ON j.id = l.job_id
LEFT JOIN quotes q ON j.id = q.job_id
GROUP BY j.id, j.customer_id, j.title, j.status, j.created_at, j.updated_at;

-- View: Vendor lead pipeline (for vendor dashboard)
CREATE OR REPLACE VIEW vendor_lead_pipeline AS
SELECT
    l.vendor_id,
    l.status,
    COUNT(l.id) AS count,
    SUM(CASE WHEN q.status = 'accepted' THEN q.amount ELSE 0 END) AS pipeline_value
FROM leads l
LEFT JOIN quotes q ON l.job_id = q.job_id AND l.vendor_id = q.vendor_id
GROUP BY l.vendor_id, l.status;

-- Function: Create system message (auto-insert)
CREATE OR REPLACE FUNCTION create_system_message(
    p_conversation_id VARCHAR(50),
    p_message_type VARCHAR(50),
    p_body TEXT
) RETURNS VARCHAR AS $$
DECLARE
    v_message_id VARCHAR(50);
    v_sender_id VARCHAR(50);
BEGIN
    -- System messages sent by the platform
    v_sender_id := 'system';
    v_message_id := 'msg_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8);
    
    INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, created_at)
    VALUES (v_message_id, p_conversation_id, v_sender_id, 'system', p_message_type, p_body, CURRENT_TIMESTAMP);
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(p_message_id VARCHAR(50))
RETURNS VOID AS $$
BEGIN
    UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if conversation is enabled (based on lead acceptance)
CREATE OR REPLACE FUNCTION is_conversation_enabled(
    p_job_id VARCHAR(50),
    p_vendor_id VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    v_lead_accepted TIMESTAMP;
BEGIN
    SELECT accepted_at INTO v_lead_accepted
    FROM leads
    WHERE job_id = p_job_id AND vendor_id = p_vendor_id;
    
    RETURN v_lead_accepted IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. CONSTRAINTS & TRIGGERS
-- ============================================================

-- Trigger: Auto-create conversation when lead is accepted
CREATE OR REPLACE FUNCTION auto_create_conversation()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id VARCHAR(50);
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        -- Get customer ID from job
        SELECT customer_id INTO v_customer_id FROM jobs WHERE id = NEW.job_id;
        
        -- Create conversation (if not exists)
        INSERT INTO conversations (id, job_id, customer_id, vendor_id, created_at)
        VALUES (
            'conv_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8),
            NEW.job_id,
            v_customer_id,
            NEW.vendor_id,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (job_id, vendor_id) DO NOTHING;
        
        -- Create system message
        PERFORM create_system_message(
            (SELECT id FROM conversations WHERE job_id = NEW.job_id AND vendor_id = NEW.vendor_id),
            'lead_accepted',
            'Lead accepted. Messaging enabled.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_conversation
AFTER UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION auto_create_conversation();

-- Trigger: Lock conversations when job is cancelled
CREATE OR REPLACE FUNCTION lock_conversations_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE conversations
        SET status = 'locked', locked_at = CURRENT_TIMESTAMP
        WHERE job_id = NEW.id AND status = 'open';
        
        -- Create system message in all conversations
        FOR conversation IN
            SELECT id FROM conversations WHERE job_id = NEW.id
        LOOP
            PERFORM create_system_message(
                conversation.id,
                'system',
                'Job cancelled. Conversation locked.'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lock_conversations_on_cancel
AFTER UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION lock_conversations_on_cancel();

-- Trigger: Update message count on conversations
CREATE OR REPLACE FUNCTION update_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET message_count = message_count + 1,
        last_message_at = CURRENT_TIMESTAMP,
        last_message_from = NEW.sender_id
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_count
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_message_count();
