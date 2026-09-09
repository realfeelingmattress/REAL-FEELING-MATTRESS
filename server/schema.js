export const schema = `
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT DEFAULT 'customer',phone TEXT DEFAULT '',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,description TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,slug TEXT UNIQUE NOT NULL,name TEXT NOT NULL,subtitle TEXT,description TEXT,price INTEGER CHECK(price>=0),original_price INTEGER,category TEXT,material TEXT,firmness TEXT,thickness TEXT,image TEXT,images TEXT DEFAULT '[]',rating REAL DEFAULT 4.8,reviews INTEGER DEFAULT 0,badge TEXT DEFAULT '',stock INTEGER CHECK(stock>=0),active INTEGER DEFAULT 1,specs TEXT DEFAULT '{}',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS variants(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id) ON DELETE CASCADE,size TEXT,thickness TEXT,firmness TEXT,price INTEGER CHECK(price>=0),stock INTEGER CHECK(stock>=0));
CREATE TABLE IF NOT EXISTS inventory_transactions(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id),change INTEGER,reason TEXT,user_id TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),customer TEXT,email TEXT,phone TEXT,address TEXT,status TEXT DEFAULT 'Placed',payment_status TEXT DEFAULT 'Demo — unpaid',payment_method TEXT,subtotal INTEGER,discount INTEGER,tax INTEGER,shipping INTEGER,total INTEGER,coupon TEXT,tracking TEXT DEFAULT '',notes TEXT DEFAULT '',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(id TEXT PRIMARY KEY,order_id TEXT REFERENCES orders(id),product_id TEXT REFERENCES products(id),name TEXT,size TEXT,thickness TEXT,firmness TEXT,quantity INTEGER,price INTEGER);
CREATE TABLE IF NOT EXISTS coupons(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,type TEXT,amount INTEGER,minimum INTEGER DEFAULT 0,max_discount INTEGER DEFAULT 50000,usage_limit INTEGER DEFAULT 1000,used INTEGER DEFAULT 0,expires TEXT,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS coupon_usage(id TEXT PRIMARY KEY,coupon_id TEXT REFERENCES coupons(id),user_id TEXT,order_id TEXT REFERENCES orders(id));
CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id),user_id TEXT,name TEXT,rating INTEGER CHECK(rating BETWEEN 1 AND 5),title TEXT,body TEXT,verified INTEGER DEFAULT 0,status TEXT DEFAULT 'published',helpful INTEGER DEFAULT 0,response TEXT DEFAULT '',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS review_votes(review_id TEXT REFERENCES reviews(id),session_id TEXT,PRIMARY KEY(review_id,session_id));
CREATE TABLE IF NOT EXISTS wishlists(user_id TEXT REFERENCES users(id),product_id TEXT REFERENCES products(id),PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS addresses(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),label TEXT,address TEXT,pincode TEXT);
CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),name TEXT,email TEXT,subject TEXT,category TEXT,status TEXT DEFAULT 'Open',messages TEXT DEFAULT '[]',assigned TEXT DEFAULT '',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,title TEXT,body TEXT,type TEXT DEFAULT 'page',active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,value TEXT);
CREATE TABLE IF NOT EXISTS audit_logs(id TEXT PRIMARY KEY,user_id TEXT,actor TEXT,action TEXT,entity TEXT,ip TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user_id TEXT,title TEXT,body TEXT,read INTEGER DEFAULT 0,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS refunds(id TEXT PRIMARY KEY,order_id TEXT REFERENCES orders(id),amount INTEGER,status TEXT,reason TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,order_id TEXT REFERENCES orders(id),provider TEXT,status TEXT,amount INTEGER,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS checkout_requests(key TEXT PRIMARY KEY,session_id TEXT NOT NULL,fingerprint TEXT NOT NULL,response TEXT NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);
`;

export const previewSchema = `CREATE TABLE IF NOT EXISTS preview_sessions (
  token_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE
)`;

export const googleSchema = `CREATE TABLE IF NOT EXISTS google_challenges(nonce_hash TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,purpose TEXT NOT NULL,expires INTEGER NOT NULL)`;

export const cloudSchema = `
CREATE TABLE IF NOT EXISTS rate_limits(id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires);
CREATE TABLE IF NOT EXISTS login_limits(id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_expiry ON login_limits(expires);
CREATE TABLE IF NOT EXISTS media_assets(id TEXT PRIMARY KEY,provider TEXT NOT NULL,provider_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,name TEXT NOT NULL,url TEXT NOT NULL,delete_url TEXT NOT NULL DEFAULT '',width INTEGER,height INTEGER,bytes INTEGER,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS media_entity ON media_assets(entity_type,entity_id);
CREATE TABLE IF NOT EXISTS product_drafts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS drafts_expiry ON product_drafts(expires);
`;
