-- ================================================================
-- FIX: Add missing columns to your Neon database
-- ================================================================
-- INSTRUCTIONS:
-- 1. Go to Neon → SQL Editor → New query
-- 2. Paste this ENTIRE SQL
-- 3. Click Run
-- 4. You should see "All fixes applied!" at the bottom
-- ================================================================

-- Fix 1: Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_only BIGINT DEFAULT 0;

-- Fix 2: Add missing column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '{}';

-- Fix 3: Add Google subject index
CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject ON users(google_sub) WHERE google_sub IS NOT NULL;

-- Fix 4: Ensure cloud prepared flag exists
INSERT INTO settings(id, value) VALUES ('_cloudPreparedV1', '"true"')
ON CONFLICT (id) DO NOTHING;

-- Fix 5: Ensure owner account exists
INSERT INTO users(id, name, email, password, role)
SELECT 
    gen_random_uuid()::text,
    'Shop Owner',
    'admin@realfeelingmattress.com',
    '$2b$12$Qxh/m3n2zmzr9qc6HYQdOuNcwn2j1Glzs2lHD2vDhu8Jc.32ovr1e',
    'owner'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role='owner');

-- Fix 6: Ensure all required settings exist
INSERT INTO settings(id, value) VALUES 
    ('storeName', '"REAL FEELING MATTRESS"'),
    ('phone', '"+91 74053 23892"'),
    ('address', '"Shop 23, Atria Business Zone, A-23, Naroda Rd, opp. Jinning Press, BRTS, Asarwa, Ahmedabad, Gujarat 380025"'),
    ('mapUrl', '"https://maps.app.goo.gl/ZU3trK9m2659EHyS7"'),
    ('facebookUrl', '"https://www.facebook.com/share/1BN5BexjMX/"'),
    ('instagramUrl', '"https://www.instagram.com/real_feeling_mattress"'),
    ('email', '""'),
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
    ('seoDescription', '"Explore mattresses and talk to REAL FEELING MATTRESS in Asarwa, Ahmedabad."'),
    ('deliveryZones', '"Delivery coverage and timing will be confirmed by the owner."'),
    ('paymentProvider', '"Owner confirmation"'),
    ('emailNotifications', 'false'),
    ('launchReady', 'false')
ON CONFLICT (id) DO NOTHING;

-- Verify everything is working
SELECT 
    'All fixes applied!' as status,
    (SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='avatar') as avatar_col,
    (SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='google_sub') as google_sub_col,
    (SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='google_only') as google_only_col,
    (SELECT count(*) FROM information_schema.columns WHERE table_name='orders' AND column_name='summary') as summary_col,
    (SELECT count(*) FROM users WHERE role='owner') as owners;
