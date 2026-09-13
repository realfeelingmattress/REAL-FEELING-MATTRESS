-- ================================================================
-- REAL FEELING MATTRESS — Neon Database Setup
-- ================================================================
-- INSTRUCTIONS:
-- 1. Go to https://console.neon.tech/
-- 2. Click your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Copy ALL of this SQL and paste it into the editor
-- 5. Click "Run" button
-- 6. Wait for it to complete
-- ================================================================

-- Create all tables
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT DEFAULT 'customer',phone TEXT DEFAULT '',created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),csrf TEXT NOT NULL,expires BIGINT NOT NULL,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,description TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,name TEXT NOT NULL,subtitle TEXT,description TEXT,price BIGINT CHECK(price>=0),original_price BIGINT,category TEXT,material TEXT,firmness TEXT,thickness TEXT,image TEXT,images TEXT DEFAULT '[]',rating REAL DEFAULT 4.8,reviews BIGINT DEFAULT 0,badge TEXT DEFAULT '',stock BIGINT CHECK(stock>=0),active BIGINT DEFAULT 1,specs TEXT DEFAULT '{}',created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS variants(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id) ON DELETE CASCADE,size TEXT,thickness TEXT,firmness TEXT,price BIGINT CHECK(price>=0),stock BIGINT CHECK(stock>=0));
CREATE TABLE IF NOT EXISTS inventory_transactions(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id),change BIGINT,reason TEXT,user_id TEXT,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),customer TEXT,email TEXT,phone TEXT,address TEXT,status TEXT DEFAULT 'Placed',payment_status TEXT DEFAULT 'Demo — unpaid',payment_method TEXT,subtotal BIGINT,discount BIGINT,tax BIGINT,shipping BIGINT,total BIGINT,coupon TEXT,tracking TEXT DEFAULT '',notes TEXT DEFAULT '',created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(id TEXT PRIMARY KEY,order_id TEXT REFERENCES orders(id),product_id TEXT REFERENCES products(id),name TEXT,size TEXT,thickness TEXT,firmness TEXT,quantity BIGINT,price BIGINT);
CREATE TABLE IF NOT EXISTS coupons(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,type TEXT,amount BIGINT,minimum BIGINT DEFAULT 0,max_discount BIGINT DEFAULT 50000,usage_limit BIGINT DEFAULT 1000,used BIGINT DEFAULT 0,expires TEXT,active BIGINT DEFAULT 1);
CREATE TABLE IF NOT EXISTS coupon_usage(id TEXT PRIMARY KEY,coupon_id TEXT REFERENCES coupons(id),user_id TEXT,order_id TEXT REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id),user_id TEXT,name TEXT,rating BIGINT CHECK(rating BETWEEN 1 AND 5),title TEXT,body TEXT,verified BIGINT DEFAULT 0,status TEXT DEFAULT 'published',helpful BIGINT DEFAULT 0,response TEXT DEFAULT '',created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS review_votes(review_id TEXT REFERENCES reviews(id),session_id TEXT,PRIMARY KEY(review_id,session_id));
CREATE TABLE IF NOT EXISTS wishlists(user_id TEXT REFERENCES users(id),product_id TEXT REFERENCES products(id),PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS addresses(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),label TEXT,address TEXT,pincode TEXT);
CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),name TEXT,email TEXT,subject TEXT,category TEXT,status TEXT DEFAULT 'Open',messages TEXT DEFAULT '[]',assigned TEXT DEFAULT '',created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,title TEXT,body TEXT,type TEXT DEFAULT 'page',active BIGINT DEFAULT 1);
CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,value TEXT);
CREATE TABLE IF NOT EXISTS audit_logs(id TEXT PRIMARY KEY,user_id TEXT,actor TEXT,action TEXT,entity TEXT,ip TEXT,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT,title TEXT,body TEXT,read BIGINT DEFAULT 0,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS refunds(id TEXT PRIMARY KEY,order_id TEXT REFERENCES orders(id),amount BIGINT,status TEXT,reason TEXT,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,order_id TEXT REFERENCES orders(id),provider TEXT,status TEXT,amount BIGINT,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS checkout_requests(key TEXT PRIMARY KEY,session_id TEXT NOT NULL,fingerprint TEXT NOT NULL,response TEXT NOT NULL,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS preview_sessions(token_hash TEXT PRIMARY KEY,session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS google_challenges(nonce_hash TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,purpose TEXT NOT NULL,expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(id TEXT PRIMARY KEY,count BIGINT NOT NULL,expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires);
CREATE TABLE IF NOT EXISTS login_limits(id TEXT PRIMARY KEY,count BIGINT NOT NULL,expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS login_expiry ON login_limits(expires);
CREATE TABLE IF NOT EXISTS media_assets(id TEXT PRIMARY KEY,provider TEXT NOT NULL,provider_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,name TEXT NOT NULL,url TEXT NOT NULL,delete_url TEXT NOT NULL DEFAULT '',width BIGINT,height BIGINT,bytes BIGINT,created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS media_entity ON media_assets(entity_type,entity_id);
CREATE TABLE IF NOT EXISTS product_drafts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS drafts_expiry ON product_drafts(expires);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE preview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_drafts ENABLE ROW LEVEL SECURITY;

-- Revoke access from public roles (Supabase compatibility)
DO $$
DECLARE
    r TEXT;
    t TEXT;
BEGIN
    FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
        FOR t IN SELECT unnest(ARRAY[
            'users','sessions','categories','products','variants',
            'inventory_transactions','orders','order_items','coupons',
            'coupon_usage','reviews','review_votes','wishlists','addresses',
            'tickets','content','settings','audit_logs','notifications',
            'refunds','payments','checkout_requests','preview_sessions',
            'google_challenges','rate_limits','login_limits',
            'media_assets','product_drafts'
        ]) LOOP
            EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', t, r);
        END LOOP;
    END LOOP;
END $$;

-- Create owner account (password: RealFeeling2026!Secure)
-- bcrypt hash of 'RealFeeling2026!Secure' with salt rounds 12
INSERT INTO users(id, name, email, password, role)
SELECT 
    gen_random_uuid()::text,
    'Shop Owner',
    'admin@realfeelingmattress.com',
    '$2b$12$Qxh/m3n2zmzr9qc6HYQdOuNcwn2j1Glzs2lHD2vDhu8Jc.32ovr1e',
    'owner'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='owner');

-- Add default store settings
INSERT INTO settings(id, value) VALUES 
    ('storeName', '"REAL FEELING MATTRESS"'),
    ('email', '""'),
    ('phone', '"+91 74053 23892"'),
    ('address', '"Shop 23, Atria Business Zone, A-23, Naroda Rd, opp. Jinning Press, BRTS, Asarwa, Ahmedabad, Gujarat 380025"'),
    ('mapUrl', '"https://maps.app.goo.gl/ZU3trK9m2659EHyS7"'),
    ('facebookUrl', '"https://www.facebook.com/share/1BN5BexjMX/"'),
    ('instagramUrl', '"https://www.instagram.com/real_feeling_mattress"'),
    ('businessHours', '""'),
    ('heroEyebrow', '"REAL COMFORT. A REAL CONVERSATION."'),
    ('heroTitle', '"Better nights begin with the right feeling."'),
    ('heroSubtitle', '"Find your comfort with REAL FEELING MATTRESS. Submit your selection and our owner will call to discuss the details."'),
    ('announcement', '"Talk to us about your comfort · +91 74053 23892"'),
    ('heroImage', '"/images/hero.webp"'),
    ('heroMobileImage', '"/images/hero-small.webp"'),
    ('storyImage', '"/images/detail.webp"'),
    ('shippingThreshold', '0'),
    ('shippingFee', '0'),
    ('taxRate', '0'),
    ('currency', '"INR"'),
    ('primaryColor', '"#354f42"'),
    ('seoTitle', '"REAL FEELING MATTRESS | Ahmedabad"'),
    ('seoDescription', '"Explore mattresses and talk to REAL FEELING MATTRESS in Asarwa, Ahmedabad. Order requests are confirmed by the owner."'),
    ('deliveryZones', '"Delivery coverage and timing will be confirmed by the owner."'),
    ('paymentProvider', '"Owner confirmation"'),
    ('emailNotifications', 'false'),
    ('launchReady', 'false'),
    ('_cloudPreparedV1', '"true"')
ON CONFLICT (id) DO NOTHING;

-- Add policy drafts (unpublished — owner must review and publish)
INSERT INTO content(id, title, body, type, active) VALUES
    ('about', 'About REAL FEELING MATTRESS', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0),
    ('privacy', 'Privacy policy', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0),
    ('terms', 'Terms and conditions', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0),
    ('shipping', 'Shipping policy', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0),
    ('returns', 'Return policy', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0),
    ('refunds', 'Refund policy', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0),
    ('warranty', 'Warranty information', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0),
    ('cookies', 'Cookie policy', 'OWNER REVIEW REQUIRED. Replace this draft with the actual shop policy before publishing.', 'policy', 0)
ON CONFLICT (id) DO NOTHING;

-- Verify setup
SELECT 'Setup complete!' as status, 
    (SELECT count(*) FROM users WHERE role='owner') as owners,
    (SELECT count(*) FROM settings) as settings_count,
    (SELECT count(*) FROM content) as content_count;
