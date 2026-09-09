import "./env.js";
import express from "express";
import {
  registerGoogleAuth,
  googleClientId,
  googleConfigured,
} from "./google-auth.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import multer from "multer";
import {
  MAX_IMAGE_BYTES,
  validImageUrl,
  imageName,
  storeImage,
} from "./media.js";
import { db, uid, settings, product, perms, syncVariants } from "./db.js";
import { sessionCookieConfig } from "./session-cookie.js";
import {
  registerPreviewTransport,
  resolvePreviewSession,
  issuePreviewToken,
} from "./preview-transport.js";
import {
  takeRate,
  loginBlocked,
  loginFailed,
  loginSucceeded,
  pruneExpired,
} from "./security-store.js";
import { orderPdf } from "./order-pdf.js";
const app = express();
const checkoutMode = process.env.CHECKOUT_MODE === "cod" ? "cod" : "preview";
const prod =
  process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
if (prod) {
  const owners = await db
    .prepare("SELECT password FROM users WHERE role='owner'")
    .all();
  if (
    !owners.length ||
    owners.some((u) => bcrypt.compareSync("NocteDemo!2026", u.password))
  )
    throw new Error(
      "Create a non-demo owner using npm run db:setup before production startup.",
    );
  if (
    !(await db
      .prepare("SELECT id FROM settings WHERE id='_cloudPreparedV1'")
      .get())
  )
    throw new Error(
      "Run npm run db:setup before deploying this database version.",
    );
}
if (process.env.VERCEL) {
  const url = new URL(process.env.SITE_URL || "");
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "SITE_URL must be your exact canonical HTTPS origin, without a path.",
    );
  if (process.env.DB_AUTO_SETUP === "1" || process.env.DB_SEED_DEMO === "1")
    throw new Error("Do not enable migrations or demo seeding inside Vercel.");
}
app.get("/api/maintenance", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32)
    return res.status(503).json({ error: "Maintenance is not configured." });
  const actual = createHash("sha256")
      .update(req.headers.authorization || "")
      .digest("hex"),
    expected = createHash("sha256")
      .update("Bearer " + secret)
      .digest("hex");
  if (actual !== expected)
    return res.status(401).json({ error: "Unauthorized" });
  await pruneExpired();
  res.json({ ok: true });
});
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: prod
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://accounts.google.com/gsi/client"],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://accounts.google.com/gsi/style",
            ],
            imgSrc: [
              "'self'",
              "data:",
              "blob:",
              "https://i.ibb.co",
              "https://lh3.googleusercontent.com",
              "https://lh4.googleusercontent.com",
              "https://lh5.googleusercontent.com",
              "https://lh6.googleusercontent.com",
            ],
            connectSrc: ["'self'", "https://accounts.google.com/gsi/"],
            frameSrc: ["'self'", "https://accounts.google.com/gsi/"],
            fontSrc: ["'self'"],
            frameAncestors: [
              "'self'",
              "https://*.arena.ai",
              "https://arena.ai",
            ],
          },
        }
      : false,
    frameguard: false,
    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups",
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    crossOriginResourcePolicy: false,
    strictTransportSecurity: prod ? undefined : false,
  }),
);
const standardJson = express.json({
  limit: "1mb",
});
const previewJson = express.json({
  limit: "8mb",
});
app.use((req, res, next) => {
  // A bounded larger body is needed only for image uploads through the preview.
  const parser =
    !prod && req.path === "/api/preview/request" ? previewJson : standardJson;
  parser(req, res, next);
});
app.use(cookieParser());
app.use("/api", async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const auth = req.path.includes("/auth/") || req.path === "/preview/session";
  if (
    !(await takeRate(req.ip + ":" + (auth ? "auth" : "api"), auth ? 30 : 400))
  ) {
    res.set("Retry-After", "60");
    return res
      .status(429)
      .json({ error: "A little too fast. Please try again in a minute." });
  }
  next();
});
registerPreviewTransport(app, prod);
app.use("/api", async (req, res, next) => {
  if (
    req.previewTransport &&
    req.path.startsWith("/auth/") &&
    !(await takeRate(req.ip + ":auth", 30))
  )
    return res
      .status(429)
      .json({ error: "A little too fast. Please try again in a minute." });
  req.sessionCookie = sessionCookieConfig(req, prod);
  const sessionId = req.cookies[req.sessionCookie.name];
  let s = req.previewTransport
    ? await resolvePreviewSession(req.previewSessionToken)
    : sessionId &&
      (await db
        .prepare("SELECT * FROM sessions WHERE id=? AND expires>?")
        .get(sessionId, Date.now()));
  if (req.previewTransport && !s) {
    return res.status(401).json({
      code: "PREVIEW_SESSION_EXPIRED",
      error: "Your preview session expired. Please sign in again.",
    });
  }
  if (!s) {
    s = {
      id: randomBytes(32).toString("hex"),
      csrf: randomBytes(24).toString("hex"),
      expires: Date.now() + 86400000 * 7,
    };
    await db
      .prepare("INSERT INTO sessions(id,csrf,expires) VALUES(?,?,?)")
      .run(s.id, s.csrf, s.expires);
    res.cookie(req.sessionCookie.name, s.id, req.sessionCookie.options);
  }
  req.session = s;
  req.user = s.user_id
    ? await db
        .prepare(
          "SELECT id,name,email,role,phone,created,avatar,google_sub IS NOT NULL AS googleLinked,google_only FROM users WHERE id=?",
        )
        .get(s.user_id)
    : null;
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    (req.previewTransport ? req.previewCsrf : req.get("x-csrf-token")) !==
      s.csrf
  )
    return res.status(403).json({
      code: "CSRF_MISMATCH",
      error: "Your session changed. Please try again.",
    });
  next();
});
const auth = (req, res, next) =>
  req.user
    ? next()
    : res.status(401).json({
        error: "Please sign in to continue.",
      });
const can = (section) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({
      error: "Please sign in to your owner account.",
    });
  const p = perms[req.user.role] || [];
  if (!p.includes("*") && !p.includes(section))
    return res.status(403).json({
      error: "You do not have permission for this action.",
    });
  next();
};
const audit = async (req, action, entity) =>
  await db
    .prepare(
      "INSERT INTO audit_logs(id,user_id,actor,action,entity,ip) VALUES(?,?,?,?,?,?)",
    )
    .run(
      uid(),
      req.user?.id || "",
      req.user?.name || "Guest",
      action,
      String(entity),
      req.ip || "",
    );
const fail = (res, error, status = 400) =>
  res.status(status).json({
    error,
  });
const safeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
  avatar: u.avatar || "",
  googleLinked: Boolean(u.google_sub || u.googleLinked),
  google_only: Boolean(u.google_only),
});
app.get("/api/bootstrap", async (req, res) =>
  res.json({
    user: req.user ? safeUser(req.user) : null,
    csrf: req.session.csrf,
    settings: await settings(),
    categories: await db.prepare("SELECT * FROM categories").all(),
    testimonials: await db
      .prepare(
        "SELECT r.id,r.name,r.title,r.body,r.rating,r.verified,p.name AS product_name FROM reviews r JOIN products p ON p.id=r.product_id WHERE r.status='published' AND p.active=1 ORDER BY r.created DESC LIMIT 3",
      )
      .all(),
    content: await db.prepare("SELECT * FROM content WHERE active=1").all(),
    google: {
      configured: googleConfigured,
      clientId: googleConfigured ? googleClientId : "",
    },
    demo: !prod,
    checkoutMode,
    storage: {
      database: db.kind,
      images: process.env.IMGBB_API_KEY
        ? "imgbb"
        : process.env.VERCEL
          ? "unconfigured"
          : "local",
    },
    previewTransportAvailable: !prod,
    permissions: perms[req.user?.role] || [],
  }),
);
app.get("/api/products", async (req, res) => {
  const rows = (
    await db.prepare("SELECT * FROM products WHERE active=1").all()
  ).map(product);
  res.json(rows);
});
app.get("/api/products/:id", async (req, res) => {
  const p = await db
    .prepare("SELECT * FROM products WHERE (id=? OR slug=?) AND active=1")
    .get(req.params.id, req.params.id);
  if (!p) return fail(res, "This product is not available.", 404);
  res.json({
    ...product(p),
    variants: await db
      .prepare("SELECT * FROM variants WHERE product_id=?")
      .all(p.id),
    reviewList: await db
      .prepare(
        "SELECT * FROM reviews WHERE product_id=? AND status='published' ORDER BY created DESC",
      )
      .all(p.id),
  });
});
const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(128),
});
const passwordLogin = (audience) => async (req, res) => {
  const b = loginSchema.parse(req.body);
  const key = req.ip + ":" + b.email.toLowerCase();
  if (await loginBlocked(key))
    return fail(
      res,
      "Too many sign-in attempts. Try again in 15 minutes.",
      429,
    );
  const u = await db
    .prepare("SELECT * FROM users WHERE email=?")
    .get(b.email.toLowerCase());
  if (!u || !(await bcrypt.compare(b.password, u.password))) {
    await loginFailed(key);
    await audit(req, "Failed sign-in", b.email);
    return fail(res, "Email or password is incorrect.", 401);
  }
  if ((audience === "customer") !== (u.role === "customer"))
    return fail(
      res,
      "This account cannot sign in on this page. Please use the appropriate sign-in page.",
      403,
    );
  await loginSucceeded(key);
  await audit(
    {
      ...req,
      user: u,
    },
    "Signed in",
    "Session",
  );
  await signIn(req, res, u);
};
async function signIn(req, res, u) {
  const id = randomBytes(32).toString("hex"),
    csrf = randomBytes(24).toString("hex");
  const previewCredentials = await db.transaction(async () => {
    await db.prepare("DELETE FROM sessions WHERE id=?").run(req.session.id);
    await db
      .prepare("INSERT INTO sessions(id,user_id,csrf,expires) VALUES(?,?,?,?)")
      .run(id, u.id, csrf, Date.now() + 86400000 * 7);
    return req.previewTransport ? await issuePreviewToken(id) : {};
  })();
  if (!req.previewTransport)
    res.cookie(req.sessionCookie.name, id, req.sessionCookie.options);
  res.json({
    user: safeUser(u),
    csrf,
    permissions: perms[u.role] || [],
    ...previewCredentials,
  });
}
app.post("/api/auth/login", passwordLogin("customer"));
app.post("/api/auth/owner/login", passwordLogin("owner"));
registerGoogleAuth(app, {
  signIn,
  audit,
});
app.post("/api/auth/register", async (req, res) => {
  const b = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().email().max(200),
      password: z
        .string()
        .min(10)
        .max(128)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/),
    })
    .parse(req.body);
  if (
    await db
      .prepare("SELECT id FROM users WHERE email=?")
      .get(b.email.toLowerCase())
  )
    return fail(res, "An account with this email already exists.");
  const id = uid();
  await db
    .prepare("INSERT INTO users(id,name,email,password) VALUES(?,?,?,?)")
    .run(id, b.name, b.email.toLowerCase(), await bcrypt.hash(b.password, 12));
  const sid = randomBytes(32).toString("hex"),
    csrf = randomBytes(24).toString("hex");
  await db.prepare("DELETE FROM sessions WHERE id=?").run(req.session.id);
  await db
    .prepare("INSERT INTO sessions(id,user_id,csrf,expires) VALUES(?,?,?,?)")
    .run(sid, id, csrf, Date.now() + 86400000 * 7);
  const previewCredentials = req.previewTransport
    ? await issuePreviewToken(sid)
    : {};
  if (!req.previewTransport)
    res.cookie(req.sessionCookie.name, sid, req.sessionCookie.options);
  res.json({
    ...previewCredentials,
    user: await db
      .prepare("SELECT id,name,email,role,phone FROM users WHERE id=?")
      .get(id),
    csrf,
    permissions: [],
  });
});
app.post("/api/auth/logout", async (req, res) => {
  await db.prepare("DELETE FROM sessions WHERE id=?").run(req.session.id);
  if (!req.previewTransport) {
    const { maxAge, ...clearOptions } = req.sessionCookie.options;
    res.clearCookie(req.sessionCookie.name, clearOptions);
  }
  res.json({
    ok: true,
    ...(req.previewTransport
      ? {
          previewSessionEnded: true,
        }
      : {}),
  });
});
app.post("/api/auth/reset", (req, res) => {
  z.object({
    email: z.string().email(),
  }).parse(req.body);
  res.json({
    message:
      "Email delivery is not connected in this demo. Contact the store owner for account assistance.",
  });
});
app.get("/api/account", auth, async (req, res) =>
  res.json({
    orders: (
      await db
        .prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created DESC")
        .all(req.user.id)
    ).map(({ notes, ...order }) => order),
    addresses: await db
      .prepare("SELECT * FROM addresses WHERE user_id=?")
      .all(req.user.id),
    tickets: (
      await db
        .prepare("SELECT * FROM tickets WHERE user_id=? ORDER BY created DESC")
        .all(req.user.id)
    ).map((t) => ({
      ...t,
      messages: JSON.parse(t.messages),
    })),
    sessions: (
      await db
        .prepare("SELECT id,created,expires FROM sessions WHERE user_id=?")
        .all(req.user.id)
    ).map((s) => ({
      id: s.id === req.session.id ? "current" : s.id.slice(0, 8),
      created: s.created,
      expires: s.expires,
    })),
    notifications: await db
      .prepare(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY created DESC",
      )
      .all(req.user.id),
  }),
);
app.patch("/api/account", auth, async (req, res) => {
  const b = z
    .object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().max(20),
    })
    .parse(req.body);
  await db
    .prepare("UPDATE users SET name=?,phone=? WHERE id=?")
    .run(b.name, b.phone, req.user.id);
  res.json({
    ok: true,
  });
});
app.post("/api/account/password", auth, async (req, res) => {
  const b = z
    .object({
      current: z.string(),
      password: z
        .string()
        .min(10)
        .max(128)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/),
    })
    .parse(req.body);
  const u = await db
    .prepare("SELECT password FROM users WHERE id=?")
    .get(req.user.id);
  if (!(await bcrypt.compare(b.current, u.password)))
    return fail(res, "Your current password is incorrect.");
  await db
    .prepare("UPDATE users SET password=? WHERE id=?")
    .run(await bcrypt.hash(b.password, 12), req.user.id);
  await db
    .prepare("DELETE FROM sessions WHERE user_id=? AND id<>?")
    .run(req.user.id, req.session.id);
  await audit(req, "Password changed", "Account");
  res.json({
    ok: true,
  });
});
app.post("/api/account/revoke", auth, async (req, res) => {
  await db
    .prepare("DELETE FROM sessions WHERE user_id=? AND id<>?")
    .run(req.user.id, req.session.id);
  res.json({
    ok: true,
  });
});
app.post("/api/account/addresses", auth, async (req, res) => {
  const b = z
    .object({
      label: z.string().min(1).max(30),
      address: z.string().min(5).max(500),
      pincode: z.string().regex(/^\d{6}$/),
    })
    .parse(req.body);
  await db
    .prepare(
      "INSERT INTO addresses(id,user_id,label,address,pincode) VALUES(?,?,?,?,?)",
    )
    .run(uid(), req.user.id, b.label, b.address, b.pincode);
  res.json({
    ok: true,
  });
});
app.delete("/api/account/addresses/:id", auth, async (req, res) => {
  await db
    .prepare("DELETE FROM addresses WHERE id=? AND user_id=?")
    .run(req.params.id, req.user.id);
  res.json({
    ok: true,
  });
});
app.get("/api/wishlist", auth, async (req, res) =>
  res.json(
    (
      await db
        .prepare("SELECT product_id FROM wishlists WHERE user_id=?")
        .all(req.user.id)
    ).map((r) => r.product_id),
  ),
);
app.post("/api/wishlist", auth, async (req, res) => {
  const b = z
    .object({
      ids: z.array(z.string()).max(100),
    })
    .parse(req.body);
  await db.transaction(async () => {
    await db.prepare("DELETE FROM wishlists WHERE user_id=?").run(req.user.id);
    await Promise.all(
      b.ids.map(async (id) => {
        if (await db.prepare("SELECT id FROM products WHERE id=?").get(id))
          await db
            .prepare("INSERT INTO wishlists(user_id,product_id) VALUES(?,?)")
            .run(req.user.id, id);
      }),
    );
  })();
  res.json({
    ok: true,
  });
});
export async function calculate(items, code = "") {
  const s = await settings();
  let subtotal = 0;
  const lines = await Promise.all(
    items.map(async (i) => {
      const p = await db
        .prepare("SELECT * FROM products WHERE id=? AND active=1")
        .get(i.productId);
      if (!p) throw new Error("A product in your bag is no longer available.");
      const v = await db
        .prepare(
          "SELECT * FROM variants WHERE product_id=? AND size=? AND thickness=? AND firmness=?",
        )
        .get(i.productId, i.size, i.thickness, i.firmness);
      if (!v) throw new Error("Please choose an available product variant.");
      if (p.stock < i.quantity)
        throw new Error(`${p.name} does not have enough stock.`);
      subtotal += v.price * i.quantity;
      return {
        ...i,
        name: p.name,
        price: v.price,
        image: p.image,
      };
    }),
  );
  let discount = 0,
    coupon = null;
  if (code) {
    coupon = await db
      .prepare("SELECT * FROM coupons WHERE code=? AND active=1")
      .get(code.toUpperCase());
    if (
      !coupon ||
      new Date(coupon.expires + "T23:59:59") < new Date() ||
      coupon.used >= coupon.usage_limit
    )
      throw new Error("This coupon is invalid, expired, or fully redeemed.");
    if (subtotal < coupon.minimum)
      throw new Error(
        `A minimum order of ₹${coupon.minimum.toLocaleString("en-IN")} is required.`,
      );
    discount = Math.min(
      coupon.type === "percentage"
        ? Math.round((subtotal * coupon.amount) / 100)
        : coupon.amount,
      coupon.max_discount,
      subtotal,
    );
  }
  const shipping = subtotal >= s.shippingThreshold ? 0 : s.shippingFee;
  const tax = Math.round(
    subtotal - discount - (subtotal - discount) / (1 + s.taxRate / 100),
  );
  const quote = {
    items: lines,
    subtotal,
    discount,
    shipping,
    tax,
    total: subtotal - discount + shipping,
    coupon: coupon?.code || "",
    taxRate: s.taxRate,
  };
  return {
    ...quote,
    quoteHash: createHash("sha256").update(JSON.stringify(quote)).digest("hex"),
  };
}
const itemsSchema = z
  .array(
    z.object({
      productId: z.string(),
      size: z.enum(["Single", "Double", "Queen", "King", "Standard"]),
      thickness: z.enum(["1", "6", "8", "10"]),
      firmness: z.enum(["Soft", "Medium", "Firm"]),
      quantity: z.number().int().min(1).max(10),
    }),
  )
  .min(1)
  .max(30);
app.post("/api/checkout/quote", async (req, res) => {
  const b = z
    .object({
      items: itemsSchema,
      coupon: z.string().max(30).optional(),
    })
    .parse(req.body);
  try {
    res.json(await calculate(b.items, b.coupon));
  } catch (e) {
    fail(
      res,
      e.code
        ? "We couldn’t complete that order. Your payment has not been charged."
        : e.message,
    );
  }
});
app.post(
  "/api/checkout",
  (req, res, next) => {
    if (!req.user)
      return res.status(401).json({
        error: "Please sign in to your customer account before checkout.",
      });
    if (req.user.role !== "customer")
      return res.status(403).json({
        error: "Checkout requires a customer account.",
      });
    next();
  },
  async (req, res) => {
    const b = z
      .object({
        checkoutKey: z.string().uuid(),
        quoteHash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
        items: itemsSchema,
        coupon: z.string().max(30).optional(),
        name: z.string().trim().min(2).max(100),
        email: z.string().email(),
        phone: z.string().regex(/^[6-9]\d{9}$/),
        address: z.object({
          line1: z.string().trim().min(5).max(200),
          city: z.string().min(2).max(80),
          state: z.string().min(2).max(80),
          pincode: z.string().regex(/^[1-9]\d{5}$/),
        }),
        payment: z.enum(["demo", "cod"]).default("cod"),
        deliveryNotes: z.string().trim().max(1000).default(""),
      })
      .parse(req.body);
    if (checkoutMode === "cod" && b.payment !== "cod")
      return fail(
        res,
        "This store accepts callback orders, not demo payments.",
      );
    try {
      const order = await db.transaction(async () => {
        const fingerprint = createHash("sha256")
          .update(JSON.stringify(b))
          .digest("hex");
        const previous = await db
          .prepare("SELECT * FROM checkout_requests WHERE key=?")
          .get(b.checkoutKey);
        if (previous) {
          if (
            previous.session_id !== req.session.id ||
            previous.fingerprint !== fingerprint
          )
            throw new Error(
              "This checkout attempt changed. Start a new checkout from your bag.",
            );
          return JSON.parse(previous.response);
        }
        if (checkoutMode === "cod" && !(await settings()).launchReady)
          throw new Error(
            "The owner is still preparing this store for orders. Please contact the shop directly.",
          );
        const q = await calculate(b.items, b.coupon);
        if (
          (checkoutMode === "cod" && !b.quoteHash) ||
          (b.quoteHash && b.quoteHash !== q.quoteHash)
        )
          throw new Error(
            "Prices or shipping changed. Refresh prices and review the order again before submitting.",
          );
        const counts = {};
        q.items.forEach(
          (i) =>
            (counts[i.productId] = (counts[i.productId] || 0) + i.quantity),
        );
        for (const [id, quantity] of Object.entries(counts)) {
          const r = await db
            .prepare(
              "UPDATE products SET stock=stock-? WHERE id=? AND stock>=?",
            )
            .run(quantity, id, quantity);
          if (!r.changes)
            throw new Error(
              "Stock just changed. Please update your bag and try again.",
            );
          await db
            .prepare(
              "INSERT INTO inventory_transactions(id,product_id,change,reason,user_id) VALUES(?,?,?,?,?)",
            )
            .run(uid(), id, -quantity, "Order placed", req.user?.id || "guest");
        }
        const id =
          "RFM-" +
          new Date().toISOString().slice(0, 10).replaceAll("-", "") +
          "-" +
          randomBytes(5).toString("hex").toUpperCase();
        const shopSettings = await settings();
        const summary = {
          version: 1,
          isPreview: checkoutMode !== "cod",
          deliveryNotes: b.deliveryNotes,
          shippingMethod: "Standard delivery",
          taxRate: q.taxRate,
          shop: Object.fromEntries(
            ["storeName", "phone", "email", "address", "mapUrl"].map((k) => [
              k,
              shopSettings[k] || "",
            ]),
          ),
        };
        const paymentStatus =
          b.payment === "demo"
            ? "Demo — unpaid"
            : summary.isPreview
              ? "Preview — unpaid"
              : "Unpaid — confirm with owner";
        await db
          .prepare(
            "INSERT INTO orders(id,user_id,customer,email,phone,address,payment_method,subtotal,discount,tax,shipping,total,coupon) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .run(
            id,
            req.user?.id || null,
            b.name,
            b.email,
            b.phone,
            JSON.stringify(b.address),
            b.payment,
            q.subtotal,
            q.discount,
            q.tax,
            q.shipping,
            q.total,
            q.coupon,
          );
        await db
          .prepare(
            "UPDATE orders SET status=?,payment_status=?,summary=? WHERE id=?",
          )
          .run(
            "Awaiting confirmation",
            paymentStatus,
            JSON.stringify(summary),
            id,
          );
        await Promise.all(
          q.items.map(
            async (i) =>
              await db
                .prepare(
                  "INSERT INTO order_items(id,order_id,product_id,name,size,thickness,firmness,quantity,price) VALUES(?,?,?,?,?,?,?,?,?)",
                )
                .run(
                  uid(),
                  id,
                  i.productId,
                  i.name,
                  i.size,
                  i.thickness,
                  i.firmness,
                  i.quantity,
                  i.price,
                ),
          ),
        );
        if (q.coupon) {
          const c = await db
            .prepare("SELECT id FROM coupons WHERE code=?")
            .get(q.coupon);
          await db
            .prepare("UPDATE coupons SET used=used+1 WHERE id=?")
            .run(c.id);
          await db
            .prepare(
              "INSERT INTO coupon_usage(id,coupon_id,user_id,order_id) VALUES(?,?,?,?)",
            )
            .run(uid(), c.id, req.user?.id || null, id);
        }
        await db
          .prepare(
            "INSERT INTO payments(id,order_id,provider,status,amount) VALUES(?,?,?,?,?)",
          )
          .run(uid(), id, b.payment, paymentStatus, q.total);
        if (req.user)
          await db
            .prepare(
              "INSERT INTO notifications(id,user_id,title,body) VALUES(?,?,?,?)",
            )
            .run(
              uid(),
              req.user.id,
              "Your order is awaiting confirmation",
              `Order ${id} has been saved. The owner will call you soon. No payment has been collected.`,
            );
        const response = {
          id,
          ...q,
          order: await loadOrder(id),
        };
        await db
          .prepare(
            "INSERT INTO checkout_requests(key,session_id,fingerprint,response) VALUES(?,?,?,?)",
          )
          .run(
            b.checkoutKey,
            req.session.id,
            fingerprint,
            JSON.stringify(response),
          );
        return response;
      })();
      res.json(order);
    } catch (e) {
      fail(
        res,
        e.code
          ? "We couldn’t complete that order. Your payment has not been charged."
          : e.message,
      );
    }
  },
);
async function loadOrder(id, includeInternal = false) {
  const o = await db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!o) return null;
  return {
    ...o,
    ...(includeInternal ? {} : { notes: undefined }),
    address: JSON.parse(o.address),
    summary: JSON.parse(o.summary || "{}"),
    items: await db
      .prepare("SELECT * FROM order_items WHERE order_id=?")
      .all(id),
  };
}
const canReadOrder = (req, o) =>
  Boolean(
    req.user &&
    (req.user.role === "customer"
      ? o.user_id === req.user.id
      : req.user.role === "owner" || perms[req.user.role]?.includes("orders")),
  );
app.get("/api/account/orders/:id", auth, async (req, res) => {
  const o = await loadOrder(req.params.id);
  if (!o || !canReadOrder(req, o)) return fail(res, "Order not found.", 404);
  res.json(o);
});
app.get("/api/account/orders/:id/pdf", auth, async (req, res) => {
  const o = await loadOrder(req.params.id);
  if (!o || !canReadOrder(req, o)) return fail(res, "Order not found.", 404);
  const shop = o.summary.shop || (await settings());
  const buffer = await orderPdf(o, shop);
  res.json({
    filename: o.id + "-order-summary.pdf",
    mime: "application/pdf",
    base64: buffer.toString("base64"),
  });
});
app.post("/api/tracking", async (req, res) => {
  if (!(await takeRate(req.ip + ":tracking", 20, 60000)))
    return fail(
      res,
      "Please wait a minute before trying more order lookups.",
      429,
    );
  const b = z
    .object({
      id: z.string().max(40),
      email: z.string().email(),
    })
    .parse(req.body);
  const o = await db
    .prepare("SELECT * FROM orders WHERE id=? AND lower(email)=?")
    .get(b.id.toUpperCase(), b.email.toLowerCase());
  if (!o)
    return fail(
      res,
      "We couldn’t find that order. Check your order number and email.",
      404,
    );
  if (canReadOrder(req, o)) return res.json(await loadOrder(o.id));
  // An order ID + email is not authorization for private addresses or documents.
  res.json({
    id: o.id,
    status: o.status,
    created: o.created,
    payment_status: o.payment_status,
    redacted: true,
    address: {},
    items: await db
      .prepare(
        "SELECT name,size,thickness,quantity FROM order_items WHERE order_id=?",
      )
      .all(o.id),
  });
});
app.post("/api/support", async (req, res) => {
  const b = z
    .object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      subject: z.string().min(3).max(160),
      category: z.string().max(50),
      message: z.string().min(10).max(5000),
    })
    .parse(req.body);
  const id = "TK-" + Date.now().toString().slice(-7);
  await db
    .prepare(
      "INSERT INTO tickets(id,user_id,name,email,subject,category,messages) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      id,
      req.user?.id || null,
      b.name,
      b.email,
      b.subject,
      b.category,
      JSON.stringify([
        {
          from: b.name,
          text: b.message,
          at: new Date().toISOString(),
        },
      ]),
    );
  res.json({
    id,
  });
});
app.post("/api/support/:id/reply", auth, async (req, res) => {
  const b = z
    .object({
      message: z.string().min(1).max(5000),
    })
    .parse(req.body);
  const t = await db
    .prepare("SELECT * FROM tickets WHERE id=? AND user_id=?")
    .get(req.params.id, req.user.id);
  if (!t) return fail(res, "Request not found.", 404);
  const messages = JSON.parse(t.messages);
  messages.push({
    from: req.user.name,
    text: b.message,
    at: new Date().toISOString(),
  });
  await db
    .prepare("UPDATE tickets SET messages=?,status='Open' WHERE id=?")
    .run(JSON.stringify(messages), t.id);
  res.json({
    ok: true,
  });
});
app.post("/api/reviews", auth, async (req, res) => {
  const b = z
    .object({
      productId: z.string(),
      rating: z.number().int().min(1).max(5),
      title: z.string().min(3).max(120),
      body: z.string().min(10).max(3000),
    })
    .parse(req.body);
  const purchase = await db
    .prepare(
      "SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=? AND i.product_id=? AND o.status='Delivered'",
    )
    .get(req.user.id, b.productId);
  if (!purchase)
    return fail(
      res,
      "You can review this product after your order is delivered.",
    );
  await db
    .prepare(
      "INSERT INTO reviews(id,product_id,user_id,name,rating,title,body,verified,status) VALUES(?,?,?,?,?,?,?,?,?)",
    )
    .run(
      uid(),
      b.productId,
      req.user.id,
      req.user.name,
      b.rating,
      b.title,
      b.body,
      1,
      "pending",
    );
  res.json({
    ok: true,
  });
});
app.post("/api/reviews/:id/helpful", async (req, res) => {
  const r = await db
    .prepare("SELECT id FROM reviews WHERE id=?")
    .get(req.params.id);
  if (!r) return fail(res, "Review not found.", 404);
  const inserted = await db
    .prepare(
      "INSERT OR IGNORE INTO review_votes(review_id,session_id) VALUES(?,?)",
    )
    .run(r.id, req.session.id);
  if (inserted.changes)
    await db
      .prepare("UPDATE reviews SET helpful=helpful+1 WHERE id=?")
      .run(r.id);
  res.json({
    ok: true,
  });
});
async function dashboard() {
  const orders = await db
    .prepare("SELECT * FROM orders ORDER BY created DESC")
    .all();
  const rev = orders
    .filter((o) => !["Cancelled", "Refunded"].includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const chart = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const os = orders.filter(
      (o) =>
        o.created.slice(0, 10) === date &&
        !["Cancelled", "Refunded"].includes(o.status),
    );
    chart.push({
      fullDate: date,
      date: date.slice(5),
      revenue: os.reduce((s, o) => s + o.total, 0),
      orders: os.length,
    });
  }
  return {
    revenue: rev,
    orders: orders.length,
    pending: orders.filter((o) =>
      ["Awaiting confirmation", "Placed", "Confirmed", "Packed"].includes(
        o.status,
      ),
    ).length,
    customers: (
      await db
        .prepare("SELECT COUNT(*) n FROM users WHERE role='customer'")
        .get()
    ).n,
    lowStock: (
      await db
        .prepare("SELECT * FROM products WHERE stock<20 AND active=1")
        .all()
    ).map(product),
    chart,
    recentOrders: orders.slice(0, 7),
    topProducts: await db
      .prepare(
        "SELECT p.name,p.image,SUM(i.quantity) sold,SUM(i.price*i.quantity) revenue FROM order_items i JOIN products p ON p.id=i.product_id JOIN orders o ON o.id=i.order_id WHERE o.status NOT IN ('Cancelled','Refunded') GROUP BY p.id ORDER BY revenue DESC",
      )
      .all(),
    refunds: (
      await db.prepare("SELECT COALESCE(SUM(amount),0) n FROM refunds").get()
    ).n,
    tickets: (
      await db
        .prepare("SELECT COUNT(*) n FROM tickets WHERE status<>'Closed'")
        .get()
    ).n,
    reviews: (
      await db
        .prepare("SELECT COUNT(*) n FROM reviews WHERE status='pending'")
        .get()
    ).n,
    conversion: null,
  };
}
app.get(
  "/api/admin/:section",
  (req, res, next) => can(req.params.section)(req, res, next),
  async (req, res) => {
    const sec = req.params.section;
    let data;
    if (sec === "dashboard" || sec === "analytics") data = await dashboard();
    else if (sec === "products" || sec === "inventory")
      data = (
        await db.prepare("SELECT * FROM products ORDER BY created DESC").all()
      ).map(product);
    else if (sec === "orders")
      data = await Promise.all(
        (
          await db.prepare("SELECT * FROM orders ORDER BY created DESC").all()
        ).map(async (o) => ({
          ...o,
          address: JSON.parse(o.address),
          items: await db
            .prepare("SELECT * FROM order_items WHERE order_id=?")
            .all(o.id),
        })),
      );
    else if (sec === "customers")
      data = await db
        .prepare(
          "SELECT u.id,u.name,u.email,u.phone,u.created,COUNT(o.id) orders,COALESCE(SUM(o.total),0) spent FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id",
        )
        .all();
    else if (sec === "staff")
      data = await db
        .prepare(
          "SELECT id,name,email,role,created FROM users WHERE role<>'customer'",
        )
        .all();
    else if (sec === "settings") data = await settings();
    else if (sec === "security")
      data = {
        sessions: await db
          .prepare(
            "SELECT s.created,s.expires,u.name,u.email,CASE WHEN p.session_id IS NOT NULL THEN 'Isolated preview' ELSE 'HttpOnly cookie' END protection FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN preview_sessions p ON p.session_id=s.id ORDER BY s.created DESC",
          )
          .all(),
        logs: await db
          .prepare(
            "SELECT * FROM audit_logs WHERE action LIKE '%sign%' OR action LIKE '%Password%' ORDER BY created DESC LIMIT 30",
          )
          .all(),
        mfa: false,
        emailConnected: false,
      };
    else {
      const tables = {
        reviews: "reviews",
        coupons: "coupons",
        content: "content",
        categories: "categories",
        support: "tickets",
        audit: "audit_logs",
        refunds: "refunds",
      };
      const table = tables[sec];
      if (!table) return fail(res, "Section not found.", 404);
      data = await db
        .prepare(
          `SELECT * FROM ${table} ORDER BY ${["reviews", "tickets", "audit_logs", "refunds"].includes(table) ? "created" : "id"} DESC LIMIT 500`,
        )
        .all();
      if (sec === "support")
        data = data.map((t) => ({
          ...t,
          messages: JSON.parse(t.messages),
        }));
    }
    res.json(data);
  },
);
const productSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    subtitle: z.string().max(200),
    description: z.string().max(10000),
    price: z.number().int().min(1).max(10000000),
    original_price: z.number().int().min(1).max(10000000),
    category: z.string().min(1),
    material: z.string().min(2).max(120),
    firmness: z.enum(["Soft", "Medium", "Firm"]),
    thickness: z.enum(["1", "6", "8", "10"]),
    image: z
      .string()
      .refine(validImageUrl, "Use a local shop image or HTTPS ImgBB image."),
    images: z.array(z.string().refine(validImageUrl)).max(12).optional(),
    draftId: z.string().uuid().optional(),
    expectedStock: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).max(100000),
    badge: z.string().max(40),
    active: z.number().int().min(0).max(1),
  })
  .refine((b) => b.original_price >= b.price, {
    message: "Original price must not be lower than the sale price.",
  });
app.post("/api/admin/products", can("products"), async (req, res) => {
  const b = productSchema.parse(req.body);
  const id = b.draftId || uid(),
    slug =
      b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + id.slice(0, 4);
  await db.transaction(async () => {
    if (
      b.draftId &&
      !(await db
        .prepare(
          "SELECT id FROM product_drafts WHERE id=? AND user_id=? AND expires>?",
        )
        .get(b.draftId, req.user.id, Date.now()))
    )
      throw Object.assign(
        new Error(
          "This product draft expired. Upload its image again before saving.",
        ),
        { status: 409, expose: true },
      );

    await db
      .prepare(
        "INSERT INTO products(id,slug,name,subtitle,description,price,original_price,category,material,firmness,thickness,image,stock,badge,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        slug,
        b.name,
        b.subtitle,
        b.description,
        b.price,
        b.original_price,
        b.category,
        b.material,
        b.firmness,
        b.thickness,
        b.image,
        b.stock,
        b.badge,
        b.active,
      );
    for (const [size, m] of [
      ["Single", 0.65],
      ["Double", 0.85],
      ["Queen", 1],
      ["King", 1.2],
    ])
      for (const t of ["6", "8", "10"])
        await db
          .prepare(
            "INSERT INTO variants(id,product_id,size,thickness,firmness,price,stock) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            uid(),
            id,
            size,
            t,
            b.firmness,
            Math.max(1, Math.round(b.price * m + (+t - +b.thickness) * 900)),
            b.stock,
          );
    await syncVariants({
      ...b,
      id,
    });
    await db
      .prepare("UPDATE products SET images=?,rating=0,reviews=0 WHERE id=?")
      .run(JSON.stringify(b.images?.length ? b.images : [b.image]), id);
    await db.prepare("DELETE FROM product_drafts WHERE id=?").run(id);
    await audit(req, "Product created", b.name);
  })();
  res.json({
    id,
  });
});
app.patch("/api/admin/products/:id", can("products"), async (req, res) => {
  const b = productSchema.parse(req.body);
  const old = await db
    .prepare("SELECT * FROM products WHERE id=?")
    .get(req.params.id);
  if (!old) return fail(res, "Product not found.", 404);
  if (b.expectedStock !== undefined && b.expectedStock !== old.stock)
    return fail(
      res,
      "Stock changed while you were editing. Reload the product before saving.",
      409,
    );
  await db.transaction(async () => {
    const changed = await db
      .prepare(
        "UPDATE products SET name=?,subtitle=?,description=?,price=?,original_price=?,category=?,material=?,firmness=?,thickness=?,image=?,stock=?,badge=?,active=? WHERE id=? AND stock=?",
      )
      .run(
        b.name,
        b.subtitle,
        b.description,
        b.price,
        b.original_price,
        b.category,
        b.material,
        b.firmness,
        b.thickness,
        b.image,
        b.stock,
        b.badge,
        b.active,
        old.id,
        old.stock,
      );
    if (!changed.changes)
      throw Object.assign(
        new Error(
          "Stock changed while you were editing. Reload the product before saving.",
        ),
        { status: 409, expose: true },
      );
    for (const [size, m] of [
      ["Single", 0.65],
      ["Double", 0.85],
      ["Queen", 1],
      ["King", 1.2],
    ])
      for (const t of ["6", "8", "10"])
        await db
          .prepare(
            "UPDATE variants SET price=?,firmness=? WHERE product_id=? AND size=? AND thickness=?",
          )
          .run(
            Math.max(1, Math.round(b.price * m + (+t - +b.thickness) * 900)),
            b.firmness,
            old.id,
            size,
            t,
          );
    if (old.stock !== b.stock)
      await db
        .prepare(
          "INSERT INTO inventory_transactions(id,product_id,change,reason,user_id) VALUES(?,?,?,?,?)",
        )
        .run(
          uid(),
          old.id,
          b.stock - old.stock,
          "Product editor adjustment",
          req.user.id,
        );
    await db
      .prepare("UPDATE products SET images=? WHERE id=?")
      .run(JSON.stringify(b.images?.length ? b.images : [b.image]), old.id);
    await syncVariants({
      ...b,
      id: old.id,
    });
    await audit(
      req,
      old.price !== b.price ? "Product / price updated" : "Product updated",
      b.name,
    );
  })();
  res.json({
    ok: true,
  });
});
app.patch("/api/admin/inventory/:id", can("inventory"), async (req, res) => {
  const b = z
    .object({
      change: z.number().int().min(-100000).max(100000),
      reason: z.string().min(3).max(200),
    })
    .parse(req.body);
  const ok = await db.transaction(async () => {
    const r = await db
      .prepare("UPDATE products SET stock=stock+? WHERE id=? AND stock+?>=0")
      .run(b.change, req.params.id, b.change);
    if (!r.changes) return false;
    await db
      .prepare(
        "INSERT INTO inventory_transactions(id,product_id,change,reason,user_id) VALUES(?,?,?,?,?)",
      )
      .run(uid(), req.params.id, b.change, b.reason, req.user.id);
    await audit(
      req,
      "Inventory adjusted",
      `${req.params.id}: ${b.change} (${b.reason})`,
    );
    return true;
  })();
  if (!ok) return fail(res, "Stock cannot be negative.");
  res.json({
    ok: true,
  });
});
app.get(
  "/api/admin/inventory/:id/history",
  can("inventory"),
  async (req, res) =>
    res.json(
      await db
        .prepare(
          "SELECT * FROM inventory_transactions WHERE product_id=? ORDER BY created DESC",
        )
        .all(req.params.id),
    ),
);
app.patch("/api/admin/orders/:id", can("orders"), async (req, res) => {
  const b = z
    .object({
      status: z.enum([
        "Awaiting confirmation",
        "Placed",
        "Confirmed",
        "Packed",
        "Shipped",
        "Out for delivery",
        "Delivered",
        "Cancelled",
        "Return requested",
        "Refunded",
      ]),
      notes: z.string().max(5000).optional(),
      tracking: z.string().max(100).optional(),
    })
    .parse(req.body);
  if (b.status === "Refunded" && !["owner", "finance"].includes(req.user.role))
    return fail(res, "Only finance or owner can process refunds.", 403);
  await db.transaction(async () => {
    const o = await db
      .prepare("SELECT * FROM orders WHERE id=?")
      .get(req.params.id);
    if (!o)
      throw Object.assign(new Error("Order not found."), {
        status: 404,
        expose: true,
      });
    if (["Cancelled", "Refunded"].includes(o.status) && b.status !== o.status)
      throw Object.assign(new Error("This order is closed."), {
        status: 400,
        expose: true,
      });
    if (checkoutMode === "cod" && b.status === "Refunded")
      throw Object.assign(
        new Error(
          "No online payment was collected. Handle any offline refund directly with the customer; this application cannot refund money.",
        ),
        { status: 400, expose: true },
      );
    await db
      .prepare("UPDATE orders SET status=?,notes=?,tracking=? WHERE id=?")
      .run(b.status, b.notes ?? o.notes, b.tracking ?? o.tracking, o.id);
    if (b.status === "Cancelled" && o.status !== "Cancelled") {
      for (const i of await db
        .prepare("SELECT * FROM order_items WHERE order_id=?")
        .all(o.id)) {
        await db
          .prepare("UPDATE products SET stock=stock+? WHERE id=?")
          .run(i.quantity, i.product_id);
        await db
          .prepare(
            "INSERT INTO inventory_transactions(id,product_id,change,reason,user_id) VALUES(?,?,?,?,?)",
          )
          .run(uid(), i.product_id, i.quantity, "Order cancelled", req.user.id);
      }
    }
    if (b.status === "Refunded" && o.status !== "Refunded")
      await db
        .prepare(
          "INSERT INTO refunds(id,order_id,amount,status,reason) VALUES(?,?,?,?,?)",
        )
        .run(
          uid(),
          o.id,
          o.total,
          "Simulated — no funds moved",
          b.notes || "Owner initiated",
        );
    if (o.user_id)
      await db
        .prepare(
          "INSERT INTO notifications(id,user_id,title,body) VALUES(?,?,?,?)",
        )
        .run(
          uid(),
          o.user_id,
          `Order ${b.status.toLowerCase()}`,
          `${o.id} is now ${b.status.toLowerCase()}.`,
        );
    await audit(
      req,
      "Order status changed",
      `${o.id}: ${o.status} → ${b.status}`,
    );
  })();
  res.json({
    ok: true,
  });
});
app.post("/api/admin/coupons", can("coupons"), async (req, res) => {
  const b = z
    .object({
      code: z.string().regex(/^[A-Z0-9_-]{3,30}$/),
      type: z.enum(["percentage", "fixed"]),
      amount: z.number().int().min(1).max(100000),
      minimum: z.number().int().min(0),
      max_discount: z.number().int().min(1),
      usage_limit: z.number().int().min(1),
      expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .parse(req.body);
  if (b.type === "percentage" && b.amount > 100)
    return fail(res, "Percentage cannot exceed 100.");
  if (await db.prepare("SELECT id FROM coupons WHERE code=?").get(b.code))
    return fail(res, "This coupon code already exists.");
  await db
    .prepare(
      "INSERT INTO coupons(id,code,type,amount,minimum,max_discount,usage_limit,expires) VALUES(?,?,?,?,?,?,?,?)",
    )
    .run(
      uid(),
      b.code,
      b.type,
      b.amount,
      b.minimum,
      b.max_discount,
      b.usage_limit,
      b.expires,
    );
  await audit(req, "Coupon created", b.code);
  res.json({
    ok: true,
  });
});
app.patch("/api/admin/coupons/:id", can("coupons"), async (req, res) => {
  const { active } = z
    .object({
      active: z.number().int().min(0).max(1),
    })
    .parse(req.body);
  await db
    .prepare("UPDATE coupons SET active=? WHERE id=?")
    .run(active, req.params.id);
  await audit(req, "Coupon toggled", req.params.id);
  res.json({
    ok: true,
  });
});
app.post("/api/admin/content", can("content"), async (req, res) => {
  const b = z
    .object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string().min(2).max(200),
      body: z.string().min(5).max(20000),
      type: z.enum(["policy", "guide", "faq", "banner"]),
      active: z.number().int().min(0).max(1),
    })
    .parse(req.body);
  await db
    .prepare(
      "INSERT INTO content(id,title,body,type,active) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,type=excluded.type,active=excluded.active",
    )
    .run(b.id, b.title, b.body, b.type, b.active);
  await audit(req, "Content saved", b.id);
  res.json({
    ok: true,
  });
});
app.post("/api/admin/categories", can("categories"), async (req, res) => {
  const b = z
    .object({
      name: z.string().min(2).max(50),
      description: z.string().max(200),
    })
    .parse(req.body);
  if (await db.prepare("SELECT id FROM categories WHERE name=?").get(b.name))
    return fail(res, "This category already exists.");
  await db
    .prepare("INSERT INTO categories(id,name,description) VALUES(?,?,?)")
    .run(uid(), b.name, b.description);
  await audit(req, "Category created", b.name);
  res.json({
    ok: true,
  });
});
app.patch("/api/admin/reviews/:id", can("reviews"), async (req, res) => {
  const b = z
    .object({
      status: z.enum(["published", "hidden", "pending", "flagged"]),
      response: z.string().max(3000),
    })
    .parse(req.body);
  await db.transaction(async () => {
    const r = await db
      .prepare("SELECT product_id FROM reviews WHERE id=?")
      .get(req.params.id);
    if (!r)
      throw Object.assign(new Error("Review not found."), {
        status: 404,
        expose: true,
      });
    await db
      .prepare("UPDATE reviews SET status=?,response=? WHERE id=?")
      .run(b.status, b.response, req.params.id);
    const stats = await db
      .prepare(
        "SELECT COUNT(*) AS n,COALESCE(AVG(rating),0) AS rating FROM reviews WHERE product_id=? AND status='published'",
      )
      .get(r.product_id);
    await db
      .prepare("UPDATE products SET rating=?,reviews=? WHERE id=?")
      .run(Math.round(stats.rating * 10) / 10, stats.n, r.product_id);
    await audit(req, "Review moderated", req.params.id);
  })();
  res.json({
    ok: true,
  });
});
app.patch("/api/admin/support/:id", can("support"), async (req, res) => {
  const b = z
    .object({
      status: z.enum(["Open", "In progress", "Closed"]),
      reply: z.string().max(5000).optional(),
      assigned: z.string().max(100).optional(),
    })
    .parse(req.body);
  const t = await db
    .prepare("SELECT * FROM tickets WHERE id=?")
    .get(req.params.id);
  if (!t) return fail(res, "Ticket not found.", 404);
  const messages = JSON.parse(t.messages);
  if (b.reply)
    messages.push({
      from: "Store support",
      text: b.reply,
      at: new Date().toISOString(),
    });
  await db
    .prepare("UPDATE tickets SET status=?,messages=?,assigned=? WHERE id=?")
    .run(b.status, JSON.stringify(messages), b.assigned || "", t.id);
  await audit(req, "Support request updated", t.id);
  res.json({
    ok: true,
  });
});
app.post("/api/admin/staff", can("staff"), async (req, res) => {
  const b = z
    .object({
      name: z.string().min(2).max(80),
      email: z.string().email(),
      password: z
        .string()
        .min(10)
        .max(128)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/),
      role: z.enum(["manager", "content", "support", "finance"]),
    })
    .parse(req.body);
  if (
    await db
      .prepare("SELECT id FROM users WHERE email=?")
      .get(b.email.toLowerCase())
  )
    return fail(res, "This email already has an account.");
  await db
    .prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)")
    .run(
      uid(),
      b.name,
      b.email.toLowerCase(),
      await bcrypt.hash(b.password, 12),
      b.role,
    );
  await audit(req, "Staff account created", b.email + " / " + b.role);
  res.json({
    ok: true,
  });
});
app.delete("/api/admin/staff/:id", can("staff"), async (req, res) => {
  const u = await db
    .prepare("SELECT * FROM users WHERE id=?")
    .get(req.params.id);
  if (!u || u.role === "owner")
    return fail(res, "The owner account cannot be revoked.");
  await db.prepare("UPDATE users SET role='customer' WHERE id=?").run(u.id);
  await db.prepare("DELETE FROM sessions WHERE user_id=?").run(u.id);
  await audit(req, "Staff access revoked", u.email);
  res.json({
    ok: true,
  });
});
app.post("/api/admin/settings", can("settings"), async (req, res) => {
  const schema = z.object({
    launchReady: z.boolean().default(false),
    storeName: z.string().min(2).max(50),
    email: z.union([z.literal(""), z.string().email()]),
    mapUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .url()
          .max(500)
          .refine((v) => v.startsWith("https://")),
      ])
      .default(""),
    facebookUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .url()
          .max(500)
          .refine((v) => v.startsWith("https://")),
      ])
      .default(""),
    instagramUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .url()
          .max(500)
          .refine((v) => v.startsWith("https://")),
      ])
      .default(""),
    phone: z.string().max(30),
    address: z.string().max(300),
    heroImage: z.string().refine(validImageUrl).optional(),
    heroMobileImage: z.string().refine(validImageUrl).optional(),
    storyImage: z.string().refine(validImageUrl).optional(),
    heroEyebrow: z.string().max(100),
    heroTitle: z.string().min(2).max(100),
    heroSubtitle: z.string().max(300),
    announcement: z.string().max(150),
    shippingThreshold: z.number().int().min(0).max(1000000),
    shippingFee: z.number().int().min(0).max(10000),
    taxRate: z.number().min(0).max(40),
    currency: z.literal("INR"),
    primaryColor: z.enum(["#354f42", "#384955", "#51453f"]),
    seoTitle: z.string().max(80),
    seoDescription: z.string().max(200),
    deliveryZones: z.string().max(500),
    businessHours: z.string().max(100),
    paymentProvider: z
      .enum(["Demo", "Owner confirmation"])
      .default("Owner confirmation"),
    emailNotifications: z.boolean(),
  });
  const b = schema.parse(req.body);
  await db.transaction(async () => {
    await Promise.all(
      Object.entries(b).map(
        async ([k, v]) =>
          await db
            .prepare(
              "INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
            )
            .run(k, JSON.stringify(v)),
      ),
    );
    await audit(req, "Store settings saved", "Settings");
  })();
  res.json({
    ok: true,
  });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5, fieldSize: 1000 },
});
app.post(
  "/api/admin/upload",
  can("products"),
  (req, res, next) =>
    req.previewTransport ? next() : upload.single("image")(req, res, next),
  async (req, res) => {
    if (!req.file) return fail(res, "Choose an image first.");
    const b = z
      .object({
        purpose: z.enum(["product", "banner"]).default("product"),
        entityId: z.string().max(100).optional(),
        assetName: z.string().trim().max(120).optional(),
      })
      .parse(req.body || {});
    if (
      b.purpose === "banner" &&
      req.user.role !== "owner" &&
      !perms[req.user.role]?.includes("content")
    )
      return fail(res, "This role cannot change banners.", 403);
    let entityId = b.entityId,
      name = b.assetName;
    if (b.purpose === "product") {
      const p =
        entityId &&
        (await db
          .prepare("SELECT id,name FROM products WHERE id=?")
          .get(entityId));
      if (
        entityId &&
        !p &&
        !(await db
          .prepare(
            "SELECT id FROM product_drafts WHERE id=? AND user_id=? AND expires>?",
          )
          .get(entityId, req.user.id, Date.now()))
      )
        return fail(res, "Product or draft not found.", 404);
      if (!entityId) {
        entityId = uid();
        await db
          .prepare(
            "INSERT INTO product_drafts(id,user_id,expires) VALUES(?,?,?)",
          )
          .run(entityId, req.user.id, Date.now() + 86400000);
      }
      name = name || p?.name || "New product";
    } else {
      if (!["heroImage", "heroMobileImage", "storyImage"].includes(entityId))
        return fail(res, "Choose a supported banner slot.");
      name = name || entityId;
    }
    const filename = imageName(b.purpose, name, entityId);
    let stored;
    try {
      stored = await storeImage(req.file.buffer, filename);
    } catch (e) {
      return fail(
        res,
        e.message,
        process.env.VERCEL && !process.env.IMGBB_API_KEY ? 503 : 400,
      );
    }
    const id = uid();
    await db
      .prepare(
        "INSERT INTO media_assets(id,provider,provider_id,entity_type,entity_id,name,url,delete_url,width,height,bytes) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        stored.provider,
        stored.providerId,
        b.purpose,
        entityId,
        filename,
        stored.url,
        stored.deleteUrl,
        stored.width,
        stored.height,
        stored.bytes,
      );
    await audit(
      req,
      "Image uploaded",
      b.purpose + ": " + name + " (" + entityId + ")",
    );
    res.json({
      id,
      url: stored.url,
      name: filename,
      entityId,
      provider: stored.provider,
      width: stored.width,
      height: stored.height,
      bytes: stored.bytes,
    });
  },
);
app.get("/robots.txt", (req, res) =>
  res
    .type("text")
    .send(
      checkoutMode !== "cod"
        ? "User-agent: *\nDisallow: /"
        : "User-agent: *\nDisallow: /owner\nDisallow: /account\nDisallow: /checkout\nDisallow: /api/",
    ),
);
app.get("/sitemap.xml", async (req, res) => {
  const base = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;
  const routes = [
    "/",
    "/mattresses",
    "/sleep-guide",
    ...(await db.prepare("SELECT slug FROM products WHERE active=1").all()).map(
      (p) => "/product/" + p.slug,
    ),
  ];
  res
    .type("xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((r) => `<url><loc>${base.replaceAll("&", "&amp;")}${r}</loc></url>`).join("")}</urlset>`,
    );
});
app.use(
  "/images",
  express.static("public/images", {
    maxAge: prod ? "7d" : "1h",
  }),
);
app.use("/api", (req, res) =>
  fail(res, "This endpoint could not be found.", 404),
);
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError)
    return fail(
      res,
      err.issues
        .map((i) => `${i.path.join(".") || "Form"}: ${i.message}`)
        .join("; "),
    );
  if (err.type === "entity.too.large")
    return res.status(413).json({
      error: "This request is too large. Images must be smaller than 3 MB.",
    });
  if (err.code === "LIMIT_FILE_SIZE")
    return fail(res, "Image must be smaller than 3 MB.");
  if (err.expose && [400, 403, 404, 409].includes(err.status))
    return fail(res, err.message, err.status);
  console.error("Request failed:", err.name, err.code || "");
  res.status(500).json({
    error: "Something went wrong. Your information is safe to retry.",
  });
});
// Never let a development static-file handler expose server code, sessions, or the database.
app.use((req, res, next) => {
  let url;
  try {
    url = decodeURIComponent(req.path);
  } catch {
    return res.sendStatus(400);
  }
  if (
    /(?:^|\/)(?:data|server|qa|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|\/|$)|\.(?:sqlite(?:-wal|-shm)?|pem|crt)(?:$|\/)/i.test(
      url,
    )
  ) {
    return res.status(404).type("text").send("Not found");
  }
  next();
});
export default app;
