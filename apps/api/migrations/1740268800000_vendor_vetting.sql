-- Vendor Vetting & Credential Verification System Migration
-- Run this directly in the Neon SQL Editor or via psql

-- ─── Extend vendors table ───────────────────────────────────────────────────

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS identity_verified         BOOLEAN      DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS identity_verified_at      TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS identity_provider         VARCHAR(50);  -- 'govuk_onelogin' | 'manual'
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS overall_vetting_status    VARCHAR(20)  DEFAULT 'unverified';
  -- unverified | pending_review | verified | rejected | suspended
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vetting_score             INTEGER      DEFAULT 0;
  -- 0-100:  identity 25 + insurance 35 + trade_registration 20 + quiz 20
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vetting_reviewed_by       VARCHAR(100);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vetting_reviewed_at       TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vetting_notes             TEXT;

-- ─── vendor_insurance ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_insurance (
    id                  SERIAL          PRIMARY KEY,
    vendor_id           INTEGER         NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    insurance_type      VARCHAR(50)     NOT NULL,
      -- 'public_liability' | 'employers_liability' | 'professional_indemnity' | 'tools_equipment'
    provider_name       VARCHAR(255)    NOT NULL,
    policy_number       VARCHAR(100)    NOT NULL,
    coverage_amount_gbp INTEGER         NOT NULL,  -- e.g. 1000000 = £1m
    valid_from          DATE            NOT NULL,
    expires_at          DATE            NOT NULL,
    document_url        TEXT,           -- S3 or local path to uploaded PDF/image
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending',
      -- pending | verified | rejected | expired
    verified_by         VARCHAR(100),
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    admin_notes         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_insurance_policy UNIQUE (vendor_id, insurance_type, policy_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_insurance_vendor_id  ON vendor_insurance(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_insurance_expires_at ON vendor_insurance(expires_at);
CREATE INDEX IF NOT EXISTS idx_vendor_insurance_status     ON vendor_insurance(status);

-- ─── vendor_trade_registrations ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_trade_registrations (
    id                  SERIAL          PRIMARY KEY,
    vendor_id           INTEGER         NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    registration_type   VARCHAR(50)     NOT NULL,
      -- 'gas_safe' | 'niceic' | 'napit' | 'fgas' | 'oftec' | 'checkatrade' | 'trustmark' | 'other'
    registration_number VARCHAR(100)    NOT NULL,
    registered_name     VARCHAR(255),   -- name on the registration (may differ from trading name)
    issuing_body        VARCHAR(255),
    valid_from          DATE,
    expires_at          DATE,
    document_url        TEXT,
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending',
      -- pending | verified | rejected | expired | api_verified
    verification_method VARCHAR(20)     NOT NULL DEFAULT 'manual',
      -- manual | api
    api_response        JSONB,          -- raw response from Gas Safe / NICEIC / NAPIT API
    verified_by         VARCHAR(100),
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    admin_notes         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_trade_reg UNIQUE (vendor_id, registration_type, registration_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_trade_reg_vendor_id  ON vendor_trade_registrations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trade_reg_expires_at ON vendor_trade_registrations(expires_at);
CREATE INDEX IF NOT EXISTS idx_vendor_trade_reg_status     ON vendor_trade_registrations(status);
CREATE INDEX IF NOT EXISTS idx_vendor_trade_reg_type       ON vendor_trade_registrations(registration_type);

-- ─── vendor_quiz_results ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_quiz_results (
    id              SERIAL          PRIMARY KEY,
    vendor_id       INTEGER         NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    quiz_version    VARCHAR(20)     NOT NULL DEFAULT 'v1',
    score           INTEGER         NOT NULL,   -- percentage 0-100
    passed          BOOLEAN         NOT NULL,   -- score >= 70
    answers         JSONB           NOT NULL,   -- { questionId: selectedAnswer, ... }
    time_taken_secs INTEGER,
    attempt_number  INTEGER         NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_quiz_attempt UNIQUE (vendor_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_vendor_quiz_vendor_id ON vendor_quiz_results(vendor_id);

-- ─── vetting_audit_log ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vetting_audit_log (
    id              SERIAL          PRIMARY KEY,
    vendor_id       INTEGER         NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    action          VARCHAR(100)    NOT NULL,
      -- e.g. 'insurance_submitted' | 'insurance_verified' | 'registration_rejected' |
      --       'identity_verified' | 'quiz_passed' | 'status_changed' | 'expiry_warning_sent'
    actor           VARCHAR(100),   -- admin email or 'system' or 'vendor'
    target_table    VARCHAR(50),    -- 'vendor_insurance' | 'vendor_trade_registrations' | 'vendors' | etc.
    target_id       INTEGER,        -- row id in the target table
    old_value       JSONB,
    new_value       JSONB,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vetting_audit_vendor_id  ON vetting_audit_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vetting_audit_created_at ON vetting_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vetting_audit_action     ON vetting_audit_log(action);

-- ─── Helper function: recompute vetting_score for a vendor ───────────────────
-- Call after any status change to keep the score column fresh.

CREATE OR REPLACE FUNCTION recompute_vetting_score(p_vendor_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_identity_pts   INTEGER := 0;
    v_insurance_pts  INTEGER := 0;
    v_trade_pts      INTEGER := 0;
    v_quiz_pts       INTEGER := 0;
    v_total          INTEGER;
BEGIN
    -- Identity (25 pts)
    SELECT CASE WHEN identity_verified THEN 25 ELSE 0 END
      INTO v_identity_pts
      FROM vendors WHERE id = p_vendor_id;

    -- Insurance (35 pts) — at least one active public_liability verified
    SELECT CASE WHEN COUNT(*) > 0 THEN 35 ELSE 0 END
      INTO v_insurance_pts
      FROM vendor_insurance
     WHERE vendor_id = p_vendor_id
       AND status = 'verified'
       AND expires_at >= CURRENT_DATE;

    -- Trade registration (20 pts) — at least one verified registration
    SELECT CASE WHEN COUNT(*) > 0 THEN 20 ELSE 0 END
      INTO v_trade_pts
      FROM vendor_trade_registrations
     WHERE vendor_id = p_vendor_id
       AND status IN ('verified', 'api_verified')
       AND (expires_at IS NULL OR expires_at >= CURRENT_DATE);

    -- Quiz (20 pts) — passed at least once
    SELECT CASE WHEN COUNT(*) > 0 THEN 20 ELSE 0 END
      INTO v_quiz_pts
      FROM vendor_quiz_results
     WHERE vendor_id = p_vendor_id AND passed = TRUE;

    v_total := v_identity_pts + v_insurance_pts + v_trade_pts + v_quiz_pts;

    UPDATE vendors
       SET vetting_score = v_total,
           updated_at    = NOW()
     WHERE id = p_vendor_id;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;
