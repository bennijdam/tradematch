INSERT INTO users (id, email, password_hash, name, user_type, phone, postcode, full_name, role)
VALUES ('vendor_test_1769330600','vendor_test_1769330600@example.com','$2b$10$DUWCsH..0zamlw7dB2CRWePDDBVq1jyWZTO/bIYe/S.ArQr3pkgGm','Vendor Test','vendor','07123456789','SW1A 1AA','Vendor Test','vendor')
ON CONFLICT (email) DO NOTHING;

INSERT INTO jobs (id, customer_id, title, description, trade_category, postcode, budget_min, budget_max, timeframe, status, created_by, updated_by, metadata)
VALUES ('job_test_1769330600','df95e589-988d-4dae-9ba3-b8a3f88d486f','Test Electrical Job','Test job created for messaging','Electrical','SW1A 1AA',100,250,'urgent','live','df95e589-988d-4dae-9ba3-b8a3f88d486f','df95e589-988d-4dae-9ba3-b8a3f88d486f','{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversations (id, job_id, customer_id, vendor_id, conversation_type, status, contact_allowed, is_system, is_locked)
VALUES ('conv_test_1769330600','job_test_1769330600','df95e589-988d-4dae-9ba3-b8a3f88d486f','vendor_test_1769330600','job','open',false,false,false)
ON CONFLICT (job_id, customer_id, vendor_id, conversation_type) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id, role)
VALUES ('conv_test_1769330600','df95e589-988d-4dae-9ba3-b8a3f88d486f','customer')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id, role)
VALUES ('conv_test_1769330600','vendor_test_1769330600','vendor')
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, created_at)
VALUES ('msg_test_1769330600','conv_test_1769330600','vendor_test_1769330600','vendor','text','Hi! This is a test conversation for messaging.',NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE conversations
SET last_message_id = 'msg_test_1769330600', last_message_at = NOW(), updated_at = NOW()
WHERE id = 'conv_test_1769330600';
