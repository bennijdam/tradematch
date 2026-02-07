-- ============================================
-- TradeMatch Messaging & Credits System Schema
-- ============================================

-- Conversations Table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  job_title TEXT,
  job_location TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, customer_id, job_id)
);

CREATE INDEX idx_conversations_vendor ON conversations(vendor_id);
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_last_message_time ON conversations(last_message_time DESC);

-- Messages Table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('vendor', 'customer')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id) WHERE read_at IS NULL;

-- Credits System Tables

-- Update Vendors table to include credits
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS credits_spent INTEGER NOT NULL DEFAULT 0;

-- Credit Transactions (Ledger)
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT, -- 'purchase', 'lead_access', 'refund', 'admin_adjustment'
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_vendor ON credit_transactions(vendor_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

-- Credit Packages (Pricing)
CREATE TABLE credit_packages (
  id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL,
  price_gbp NUMERIC(10,2) NOT NULL,
  price_per_credit NUMERIC(10,2) NOT NULL,
  stripe_price_id TEXT NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert Credit Packages
INSERT INTO credit_packages (id, credits, price_gbp, price_per_credit, stripe_price_id, discount_percentage, display_order, active) VALUES
('pkg_50', 50, 9.99, 0.20, 'price_50_credits', 0, 1, true),
('pkg_150', 150, 24.99, 0.17, 'price_150_credits', 17, 2, true),
('pkg_300', 300, 44.99, 0.15, 'price_300_credits', 25, 3, true),
('pkg_500', 500, 69.99, 0.14, 'price_500_credits', 30, 4, true);

-- Credit Purchase History
CREATE TABLE credit_purchases (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package_id TEXT REFERENCES credit_packages(id),
  credits INTEGER NOT NULL,
  amount_gbp NUMERIC(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_credit_purchases_vendor ON credit_purchases(vendor_id);
CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX idx_credit_purchases_stripe ON credit_purchases(stripe_session_id);

-- Message Notifications
CREATE TABLE message_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('vendor', 'customer')),
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('push', 'email', 'sms')),
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_notifications_user ON message_notifications(user_id, user_type);
CREATE INDEX idx_message_notifications_conversation ON message_notifications(conversation_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message = NEW.message,
      last_message_time = NEW.created_at,
      unread_count = CASE
        WHEN NEW.sender_type = 'customer' THEN unread_count + 1
        ELSE unread_count
      END,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_vendor_id TEXT,
  p_credits INTEGER,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance with lock
  SELECT credits_balance INTO v_current_balance
  FROM vendors
  WHERE id = p_vendor_id
  FOR UPDATE;
  
  -- Check sufficient balance
  IF v_current_balance < p_credits THEN
    RAISE EXCEPTION 'Insufficient credits: required %, available %', p_credits, v_current_balance;
  END IF;
  
  v_new_balance := v_current_balance - p_credits;
  
  -- Update vendor balance
  UPDATE vendors
  SET credits_balance = v_new_balance,
      credits_spent = credits_spent + p_credits,
      updated_at = NOW()
  WHERE id = p_vendor_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (
    id, vendor_id, type, amount, balance_after, 
    reference_type, reference_id, description, created_at
  ) VALUES (
    'txn_' || gen_random_uuid()::TEXT,
    p_vendor_id, 'debit', p_credits, v_new_balance,
    p_reference_type, p_reference_id, p_description, NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  p_vendor_id TEXT,
  p_credits INTEGER,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance with lock
  SELECT credits_balance INTO v_current_balance
  FROM vendors
  WHERE id = p_vendor_id
  FOR UPDATE;
  
  v_new_balance := v_current_balance + p_credits;
  
  -- Update vendor balance
  UPDATE vendors
  SET credits_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_vendor_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (
    id, vendor_id, type, amount, balance_after,
    reference_type, reference_id, description, created_at
  ) VALUES (
    'txn_' || gen_random_uuid()::TEXT,
    p_vendor_id, 'credit', p_credits, v_new_balance,
    p_reference_type, p_reference_id, p_description, NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get vendor's unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_vendor_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(unread_count), 0)
  INTO v_count
  FROM conversations
  WHERE vendor_id = p_vendor_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Sample Queries
-- ============================================

-- Get vendor's conversations with unread counts
/*
SELECT 
  c.id,
  c.customer_id,
  cu.name as customer_name,
  c.job_title,
  c.last_message,
  c.last_message_time,
  c.unread_count,
  COUNT(m.id) as total_messages
FROM conversations c
JOIN customers cu ON c.customer_id = cu.id
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.vendor_id = 'vendor_123'
GROUP BY c.id, cu.name
ORDER BY c.last_message_time DESC;
*/

-- Get messages for a conversation
/*
SELECT 
  m.id,
  m.sender_type,
  m.message,
  m.created_at,
  m.read_at,
  CASE 
    WHEN m.sender_type = 'vendor' THEN v.business_name
    ELSE cu.name
  END as sender_name
FROM messages m
LEFT JOIN vendors v ON m.sender_id = v.id AND m.sender_type = 'vendor'
LEFT JOIN customers cu ON m.sender_id = cu.id AND m.sender_type = 'customer'
WHERE m.conversation_id = 'conv_123'
ORDER BY m.created_at ASC;
*/

-- Get vendor's credit balance and recent transactions
/*
SELECT 
  v.credits_balance,
  v.credits_spent,
  (
    SELECT json_agg(t.*)
    FROM (
      SELECT type, amount, description, created_at
      FROM credit_transactions
      WHERE vendor_id = v.id
      ORDER BY created_at DESC
      LIMIT 10
    ) t
  ) as recent_transactions
FROM vendors v
WHERE v.id = 'vendor_123';
*/

-- Deduct credits for lead access
/*
SELECT deduct_credits(
  'vendor_123',
  1,
  'lead_access',
  'lead_456',
  'Accessed lead for kitchen renovation in London'
);
*/

-- Add credits from purchase
/*
SELECT add_credits(
  'vendor_123',
  150,
  'purchase',
  'sess_stripe_789',
  'Purchased 150 credit package'
);
*/
