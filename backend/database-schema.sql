-- TradeMatch Database Schema
-- PostgreSQL / Neon Compatible
-- Converted from MySQL to PostgreSQL

-- Drop tables if exists (for fresh install)
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS escrow_releases CASCADE;
DROP TABLE IF EXISTS payment_milestones CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS vendor_service_areas CASCADE;
DROP TABLE IF EXISTS vendor_postcodes CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS service_location_pages CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Users table
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'vendor')),
  phone VARCHAR(20),
  postcode VARCHAR(20),
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_status ON users(status);

-- Vendors table
CREATE TABLE vendors (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  service_areas JSONB,
  hourly_rate DECIMAL(10, 2),
  certifications JSONB,
  insurance_number VARCHAR(100),
  vat_number VARCHAR(50),
  rating DECIMAL(3, 2) DEFAULT 0.00,
  completed_jobs INT DEFAULT 0,
  response_rate DECIMAL(5, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_service_type ON vendors(service_type);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_rating ON vendors(rating);

-- Vendor Service Areas
CREATE TABLE vendor_service_areas (
  id VARCHAR(50) PRIMARY KEY,
  vendor_id VARCHAR(50) NOT NULL,
  zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('circle', 'polygon', 'rectangle')),
  coordinates JSONB NOT NULL,
  radius INT,
  area_sqkm DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_vendor_service_areas_vendor_id ON vendor_service_areas(vendor_id);

-- Vendor Postcodes
CREATE TABLE vendor_postcodes (
  id VARCHAR(50) PRIMARY KEY,
  vendor_id VARCHAR(50) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  UNIQUE(vendor_id, postcode)
);

CREATE INDEX idx_vendor_postcodes_vendor_id ON vendor_postcodes(vendor_id);
CREATE INDEX idx_vendor_postcodes_postcode ON vendor_postcodes(postcode);

-- Quotes table
CREATE TABLE quotes (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  postcode VARCHAR(20) NOT NULL,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  urgency VARCHAR(50),
  additional_details JSONB,
  photos JSONB,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_service_type ON quotes(service_type);
CREATE INDEX idx_quotes_postcode ON quotes(postcode);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

-- Bids table
CREATE TABLE bids (
  id VARCHAR(50) PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL,
  vendor_id VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  message TEXT,
  estimated_duration VARCHAR(100),
  availability VARCHAR(255),
  portfolio_links JSONB,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_bids_quote_id ON bids(quote_id);
CREATE INDEX idx_bids_vendor_id ON bids(vendor_id);
CREATE INDEX idx_bids_status ON bids(status);

-- Notifications table
CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_id VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ==========================================
-- MESSAGING TABLES
-- ==========================================

-- Conversations
CREATE TABLE conversations (
  id VARCHAR(50) PRIMARY KEY,
  quote_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
);

CREATE INDEX idx_conversations_quote_id ON conversations(quote_id);

-- Conversation Participants
CREATE TABLE conversation_participants (
  id VARCHAR(50) PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  last_read_at TIMESTAMP NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);

-- Messages
CREATE TABLE messages (
  id VARCHAR(50) PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Message Attachments
CREATE TABLE message_attachments (
  id VARCHAR(50) PRIMARY KEY,
  message_id VARCHAR(50) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- ==========================================
-- PAYMENT TABLES
-- ==========================================

-- Payments
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  vendor_id VARCHAR(50),
  amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2),
  stripe_payment_intent VARCHAR(255),
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  escrow_status VARCHAR(50) DEFAULT 'held' CHECK (escrow_status IN ('held', 'released', 'disputed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_quote_id ON payments(quote_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_vendor_id ON payments(vendor_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Payment Milestones
CREATE TABLE payment_milestones (
  id VARCHAR(50) PRIMARY KEY,
  payment_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  percentage DECIMAL(5, 2),
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'disputed')),
  released_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_milestones_payment_id ON payment_milestones(payment_id);
CREATE INDEX idx_payment_milestones_status ON payment_milestones(status);

-- Escrow Releases
CREATE TABLE escrow_releases (
  id VARCHAR(50) PRIMARY KEY,
  payment_id VARCHAR(50) NOT NULL,
  milestone_id VARCHAR(50),
  amount DECIMAL(10, 2) NOT NULL,
  requested_by VARCHAR(50) NOT NULL,
  approved_by VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES payment_milestones(id) ON DELETE SET NULL
);

CREATE INDEX idx_escrow_releases_payment_id ON escrow_releases(payment_id);
CREATE INDEX idx_escrow_releases_status ON escrow_releases(status);

-- ==========================================
-- REVIEW TABLES
-- ==========================================

-- Reviews
CREATE TABLE reviews (
  id VARCHAR(50) PRIMARY KEY,
  quote_id VARCHAR(50) NOT NULL,
  vendor_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  value_rating INT CHECK (value_rating >= 1 AND value_rating <= 5),
  cleanliness_rating INT CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  review_text TEXT,
  photos JSONB,
  would_recommend BOOLEAN DEFAULT TRUE,
  vendor_response TEXT,
  vendor_response_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reviews_vendor_id ON reviews(vendor_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- ==========================================
-- SEO TABLES
-- ==========================================

-- Services
CREATE TABLE services (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_slug ON services(slug);

-- Locations
CREATE TABLE locations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  postcode VARCHAR(20),
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_postcode ON locations(postcode);

-- Service Location Pages
CREATE TABLE service_location_pages (
  id VARCHAR(50) PRIMARY KEY,
  service_id VARCHAR(50) NOT NULL,
  location_id VARCHAR(50) NOT NULL,
  url_slug VARCHAR(255) UNIQUE NOT NULL,
  meta_title VARCHAR(255),
  meta_description TEXT,
  page_views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_service_location_pages_service_id ON service_location_pages(service_id);
CREATE INDEX idx_service_location_pages_location_id ON service_location_pages(location_id);
CREATE INDEX idx_service_location_pages_url_slug ON service_location_pages(url_slug);

-- ==========================================
-- SAMPLE DATA
-- ==========================================

-- Insert sample services
INSERT INTO services (id, name, slug, description, icon) VALUES
  ('svc_1', 'House Extension', 'house-extension', 'Single and double storey extensions', '🏗️'),
  ('svc_2', 'Loft Conversion', 'loft-conversion', 'Transform your attic space', '🏠'),
  ('svc_3', 'Kitchen Fitting', 'kitchen-fitting', 'Complete kitchen installation', '🍳'),
  ('svc_4', 'Bathroom Installation', 'bathroom-installation', 'Bathroom renovation and fitting', '🚿'),
  ('svc_5', 'Roofing', 'roofing', 'Roof repairs and replacement', '🏚️');

-- Insert sample locations
INSERT INTO locations (id, name, slug, postcode, region) VALUES
  ('loc_1', 'London', 'london', 'SW1A', 'Greater London'),
  ('loc_2', 'Manchester', 'manchester', 'M1', 'Greater Manchester'),
  ('loc_3', 'Birmingham', 'birmingham', 'B1', 'West Midlands'),
  ('loc_4', 'Leeds', 'leeds', 'LS1', 'West Yorkshire'),
  ('loc_5', 'Bristol', 'bristol', 'BS1', 'Bristol');

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- NOTES
-- ==========================================

-- This schema is PostgreSQL / Neon compatible
-- Key differences from MySQL:
-- 1. ENUM replaced with CHECK constraints
-- 2. JSON → JSONB (better performance)
-- 3. AUTO_INCREMENT → SERIAL (but using VARCHAR for IDs)
-- 4. ENGINE=InnoDB → Not needed in PostgreSQL
-- 5. Triggers for updated_at timestamps
-- 6. CASCADE syntax slightly different

-- To import this schema:
-- psql -h your-host -U your-user -d your-database -f database-schema.sql

-- Or using Neon's SQL Editor:
-- 1. Copy this file's contents
-- 2. Paste into Neon SQL Editor
-- 3. Run the query
