import { db } from "./database.js";
import { schema, previewSchema, googleSchema, cloudSchema } from "./schema.js";
export { db };
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
const autoSetup =
  db.kind === "sqlite" ||
  (process.env.DB_AUTO_SETUP === "1" && !process.env.VERCEL);
if (autoSetup)
  await db.exec([schema, previewSchema, googleSchema, cloudSchema].join(";\n"));
export const uid = () => randomUUID();
if (
  (db.kind === "sqlite" || process.env.DB_SEED_DEMO === "1") &&
  !(await db.prepare("SELECT id FROM users LIMIT 1").get())
) {
  const owner = uid();
  await db
    .prepare("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)")
    .run(
      owner,
      "Alex Morgan",
      process.env.OWNER_EMAIL || "owner@nocte.demo",
      bcrypt.hashSync(process.env.OWNER_PASSWORD || "NocteDemo!2026", 12),
      "owner",
    );
  const names = [
    "Aarav Sharma",
    "Priya Mehta",
    "Rohan Kapoor",
    "Ananya Singh",
    "Vikram Das",
    "Ishita Rao",
    "Dev Malhotra",
    "Meera Nair",
  ];
  const customers = await Promise.all(
    names.map(async (name, i) => {
      const id = uid();
      await db
        .prepare(
          "INSERT INTO users(id,name,email,password,phone) VALUES(?,?,?,?,?)",
        )
        .run(
          id,
          name,
          `customer${i + 1}@example.com`,
          bcrypt.hashSync(randomUUID(), 8),
          `98${String(76543210 + i)}`,
        );
      return {
        id,
        name,
        email: `customer${i + 1}@example.com`,
      };
    }),
  );
  await Promise.all(
    [
      "Memory Foam",
      "Orthopedic",
      "Hybrid",
      "Latex",
      "Pocket Spring",
      "Premium",
      "Kids",
      "King",
      "Queen",
      "Single",
      "Custom",
      "Bedding",
      "Accessories",
    ].map(
      async (name) =>
        await db
          .prepare("INSERT INTO categories(id,name,description) VALUES(?,?,?)")
          .run(uid(), name, `Explore our ${name.toLowerCase()} collection.`),
    ),
  );
  const ps = [
    [
      "essential",
      "The Essential",
      "Everyday comfort. Exceptionally made.",
      12999,
      17999,
      "Memory Foam",
      "Adaptive memory foam",
      "Medium",
      "6",
      "essential.webp",
      "Bestseller",
      86,
    ],
    [
      "ortho",
      "The Ortho",
      "Thoughtful support. Restorative sleep.",
      16999,
      22999,
      "Orthopedic",
      "High-resilience support foam",
      "Firm",
      "8",
      "ortho.webp",
      "Back-friendly",
      42,
    ],
    [
      "hybrid",
      "The Hybrid",
      "The perfect balance of bounce and bliss.",
      24999,
      32999,
      "Hybrid",
      "Pocket springs + memory foam",
      "Medium",
      "8",
      "hybrid.webp",
      "Most loved",
      64,
    ],
    [
      "natural",
      "The Natural",
      "A little closer to nature. A lot more comfort.",
      29999,
      39999,
      "Latex",
      "Natural latex + organic cotton",
      "Medium",
      "8",
      "natural.webp",
      "Naturally better",
      18,
    ],
    [
      "luxe",
      "The Luxe",
      "Our most indulgent sleep experience.",
      42999,
      54999,
      "Premium",
      "Latex + micro pocket springs",
      "Soft",
      "10",
      "hybrid.webp",
      "Premium",
      8,
    ],
    [
      "junior",
      "The Little Dreamer",
      "Big comfort for little dreamers.",
      8999,
      11999,
      "Kids",
      "Breathable adaptive foam",
      "Medium",
      "6",
      "essential.webp",
      "For little ones",
      26,
    ],
    [
      "linen",
      "The Linen Set",
      "Soft mornings start with softer sheets.",
      4499,
      5999,
      "Bedding",
      "100% washed cotton",
      "Soft",
      "1",
      "bedding.webp",
      "Everyday luxury",
      53,
    ],
    [
      "pillow",
      "The Cloud Pillow",
      "Light as air. Support in all the right places.",
      1999,
      2999,
      "Accessories",
      "Shredded memory foam",
      "Soft",
      "1",
      "pillow.webp",
      "Sleep essential",
      79,
    ],
  ];
  for (const [
    id,
    name,
    subtitle,
    price,
    original,
    category,
    material,
    firmness,
    thickness,
    image,
    badge,
    stock,
  ] of ps) {
    const specs = {
      cooling: true,
      motionIsolation: category === "Hybrid" ? "Exceptional" : "Excellent",
      edgeSupport: category === "Hybrid" ? "Reinforced" : "Supportive",
      warranty: 10,
      trial: 100,
      weight: 150,
      sleepPosition: "All positions",
      certifications: "Certification documents pending verification",
      support:
        category === "Orthopedic" ? "Targeted ergonomic" : "Balanced full-body",
    };
    await db
      .prepare(
        "INSERT INTO products(id,slug,name,subtitle,description,price,original_price,category,material,firmness,thickness,image,images,rating,reviews,badge,stock,specs) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        `${id}-mattress`,
        name,
        subtitle,
        `Meet your new favourite place to be. ${name} brings together thoughtfully selected materials and precision-engineered support, so you can settle in, switch off, and wake up feeling like yourself. Made for real life, and beautifully better nights.`,
        price,
        original,
        category,
        material,
        firmness,
        thickness,
        `/images/${image}`,
        JSON.stringify([
          `/images/${image}`,
          "/images/detail.webp",
          "/images/hero.webp",
        ]),
        4.8,
        id === "essential" ? 1248 : id === "hybrid" ? 864 : 326,
        badge,
        stock,
        JSON.stringify(specs),
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
            firmness,
            Math.round(price * m + (Number(t) - Number(thickness)) * 900),
            stock,
          );
    const rs = [
      [
        "Priya M.",
        "The best decision for our bedroom",
        "I used to wake up feeling tired. A few weeks with this mattress and mornings genuinely feel different. The comfort is just right.",
      ],
      [
        "Rohan K.",
        "Comfort you notice from night one",
        "Beautifully made and so comfortable. Ordering was simple, and the team was helpful with choosing the right size.",
      ],
      [
        "Ananya S.",
        "Finally, a proper night’s sleep",
        "The balance of softness and support is lovely. It feels like a little upgrade to everyday life.",
      ],
    ];
    await Promise.all(
      rs.map(
        async ([name, title, body], i) =>
          await db
            .prepare(
              "INSERT INTO reviews(id,product_id,name,rating,title,body,verified) VALUES(?,?,?,?,?,?,?)",
            )
            .run(uid(), id, name, i === 2 ? 4 : 5, title, body, 1),
      ),
    );
  }
  await db
    .prepare(
      "INSERT INTO coupons(id,code,type,amount,minimum,max_discount,expires) VALUES(?,?,?,?,?,?,?)",
    )
    .run(uid(), "REST10", "percentage", 10, 10000, 5000, "2027-12-31");
  await db
    .prepare(
      "INSERT INTO coupons(id,code,type,amount,minimum,max_discount,expires) VALUES(?,?,?,?,?,?,?)",
    )
    .run(uid(), "WELCOME500", "fixed", 500, 5000, 500, "2027-12-31");
  const s = {
    storeName: "NOCTE",
    email: "hello@nocte.example",
    phone: "+91 800 000 0000",
    address: "Patna, Bihar, India",
    heroEyebrow: "THOUGHTFULLY MADE. BEAUTIFULLY COMFORTABLE.",
    heroTitle: "A better night.\nA brighter you.",
    heroSubtitle:
      "Exceptional mattresses, designed around you.\nDiscover the comfort your days have been dreaming of.",
    announcement: "Better sleep, on us. Save 10% with REST10",
    shippingThreshold: 10000,
    shippingFee: 499,
    taxRate: 18,
    currency: "INR",
    primaryColor: "#354f42",
    seoTitle: "NOCTE — A better kind of rest",
    seoDescription:
      "Thoughtfully engineered mattresses and bedding for beautifully better nights.",
    deliveryZones: "All India",
    businessHours: "Monday – Saturday, 9 am – 6 pm",
    paymentProvider: "Demo",
    emailNotifications: true,
  };
  await Promise.all(
    Object.entries(s).map(
      async ([k, v]) =>
        await db
          .prepare("INSERT INTO settings(id,value) VALUES(?,?)")
          .run(k, JSON.stringify(v)),
    ),
  );
  const pages = [
    [
      "privacy",
      "Privacy policy",
      "Your privacy matters. This demo collects only the information needed to demonstrate your account and order. Do not submit sensitive or real payment information.\n\nBefore launch, the owner must publish a reviewed privacy policy identifying the data controller, processing purposes, retention periods, processors and customer rights.",
    ],
    [
      "terms",
      "Terms & conditions",
      "This is a demonstration store. Orders do not create a real purchase or charge. Product information, trial periods and warranties are illustrative, not binding offers.\n\nThe owner must review and publish final terms before accepting live orders.",
    ],
    [
      "shipping",
      "Delivery, made simple",
      "Demo delivery estimates are 5–7 business days. Shipping is calculated from the store settings at checkout.\n\nDelivery coverage, carrier details and timing must be confirmed by the owner before launch.",
    ],
    [
      "returns",
      "Returns & sleep trial",
      "Comfort is personal. The 100-night trial shown in this demo is an illustrative store offering and must be confirmed by the owner.\n\nFor help with a demo order, open a support request in your account. Final eligibility, collection and return conditions must be published before launch.",
    ],
    [
      "refunds",
      "Refund policy",
      "No money is collected in this demo. Refund actions record a simulated refund only. The owner must publish a reviewed refund policy before enabling live payments.",
    ],
    [
      "warranty",
      "Made for many good nights",
      "The 10-year warranty shown is sample content, not a verified legal promise. Coverage, exclusions and the claims process must be reviewed and published by the owner.",
    ],
    [
      "cookies",
      "Cookie policy",
      "Essential cookies keep your session active and protect requests. Local storage remembers your cart, comparison, wishlist and theme preference. This demo does not use advertising or tracking cookies.",
    ],
    [
      "about",
      "Good days begin the night before.",
      "We believe that better sleep should feel natural. Not complicated. Not overwhelming. Just considered design, honest materials, and comfort that fits the way you live.\n\nNOCTE is a demo premium sleep brand, built around a simple idea: make room for rest.",
    ],
    [
      "guide-position",
      "Find comfort in your sleep position",
      "Side sleeper? A little extra cushioning can help distribute pressure around your shoulders and hips. Back sleepers often prefer balanced support. Stomach sleepers may prefer a firmer feel.\n\nThere is no single mattress that is right for everyone. Comfort preferences, body shape and existing health conditions all matter. Our comfort finder is a shopping guide, not medical advice.",
    ],
    [
      "guide-materials",
      "A little material knowledge goes a long way",
      "Memory foam gently contours to your shape. Pocket springs bring responsive support and airflow. Latex offers a naturally buoyant feel.\n\nA hybrid combines layers to balance comfort and support. Choose the feel you enjoy rather than relying on a single material label.",
    ],
    [
      "guide-routine",
      "Small rituals. Better nights.",
      "Keep your bedtime consistent. Give yourself a little room to wind down. A cool, quiet, dim bedroom can make rest feel more inviting.\n\nIf sleep problems persist, speak with a qualified healthcare professional. A mattress is one part of a comfortable sleep environment, not a medical treatment.",
    ],
  ];
  await Promise.all(
    pages.map(
      async ([id, title, body]) =>
        await db
          .prepare("INSERT INTO content(id,title,body,type) VALUES(?,?,?,?)")
          .run(id, title, body, id.startsWith("guide") ? "guide" : "policy"),
    ),
  );
  await Promise.all(
    [
      [
        "faq-trial",
        "How does the 100-night trial work?",
        "The demo trial gives you time to find your comfort. Final trial conditions will be published before the store launches.",
      ],
      [
        "faq-size",
        "Which mattress size should I choose?",
        "Measure the inside of your bed frame. Single is 36 × 75 in, Double 54 × 75 in, Queen 60 × 78 in and King 72 × 78 in. Contact our team for a custom size.",
      ],
      [
        "faq-delivery",
        "When will my mattress arrive?",
        "Our demo estimate is 5–7 business days. Enter your PIN code on a product page for a delivery estimate.",
      ],
      [
        "faq-care",
        "How do I care for my mattress?",
        "Use a breathable mattress protector, rotate your mattress regularly, and follow the care label. Avoid soaking the mattress.",
      ],
    ].map(
      async ([id, title, body]) =>
        await db
          .prepare(
            "INSERT INTO content(id,title,body,type) VALUES(?,?,?,'faq')",
          )
          .run(id, title, body),
    ),
  );
  for (let i = 0; i < 48; i++) {
    const c = customers[i % 8],
      p = ps[i % 6],
      id = `NC-${10400 + i}`,
      status = ["Delivered", "Shipped", "Confirmed", "Placed", "Packed"][i % 5],
      date = new Date(Date.now() - (47 - i) * 17 * 3600000).toISOString();
    await db
      .prepare(
        "INSERT INTO orders(id,user_id,customer,email,phone,address,status,payment_status,payment_method,subtotal,discount,tax,shipping,total,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        c.id,
        c.name,
        c.email,
        "9876543210",
        JSON.stringify({
          line1: "24 Garden Avenue",
          city: "Patna",
          state: "Bihar",
          pincode: "800001",
        }),
        status,
        "Demo — unpaid",
        "demo",
        p[3],
        0,
        Math.round(p[3] - p[3] / 1.18),
        0,
        p[3],
        date,
      );
    await db
      .prepare(
        "INSERT INTO order_items(id,order_id,product_id,name,size,thickness,firmness,quantity,price) VALUES(?,?,?,?,?,?,?,?,?)",
      )
      .run(uid(), id, p[0], p[1], "Queen", p[8], p[7], 1, p[3]);
  }
  await db
    .prepare(
      "INSERT INTO tickets(id,user_id,name,email,subject,category,messages) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      "TK-1042",
      customers[0].id,
      customers[0].name,
      customers[0].email,
      "Help choosing the right firmness",
      "Product advice",
      JSON.stringify([
        {
          from: customers[0].name,
          text: "I am a side sleeper. Would you recommend The Essential or The Hybrid?",
          at: new Date().toISOString(),
        },
      ]),
    );
  await db
    .prepare(
      "INSERT INTO audit_logs(id,user_id,actor,action,entity,ip) VALUES(?,?,?,?,?,?)",
    )
    .run(uid(), owner, "System", "Demo database initialized", "Store", "local");
}
export const settings = async () =>
  Object.fromEntries(
    (await db.prepare("SELECT * FROM settings").all())
      .filter((r) => !r.id.startsWith("_"))
      .map((r) => [r.id, JSON.parse(r.value)]),
  );
export const product = (p) =>
  p
    ? {
        ...p,
        images: JSON.parse(p.images),
        specs: JSON.parse(p.specs),
      }
    : null;
export const perms = {
  owner: ["*"],
  manager: [
    "dashboard",
    "products",
    "inventory",
    "orders",
    "customers",
    "reviews",
    "coupons",
    "analytics",
  ],
  content: ["products", "content", "categories"],
  support: ["orders", "customers", "support", "reviews"],
  finance: ["orders", "analytics", "refunds"],
};

// One shared inventory pool per product in this temporary store. Variant prices are server-owned.
export async function syncVariants(p) {
  const accessory = ["Bedding", "Accessories"].includes(p.category);
  await db.prepare("DELETE FROM variants WHERE product_id=?").run(p.id);
  const sizes = accessory
    ? [["Standard", 1]]
    : [
        ["Single", 0.65],
        ["Double", 0.85],
        ["Queen", 1],
        ["King", 1.2],
      ];
  const heights = accessory ? ["1"] : ["6", "8", "10"];
  for (const [size, m] of sizes)
    for (const height of heights)
      for (const firmness of accessory
        ? [p.firmness]
        : ["Soft", "Medium", "Firm"]) {
        const price = accessory
          ? p.price
          : Math.max(
              1,
              Math.round(
                p.price * m + (Number(height) - Number(p.thickness)) * 900,
              ),
            );
        await db
          .prepare(
            "INSERT INTO variants(id,product_id,size,thickness,firmness,price,stock) VALUES(?,?,?,?,?,?,?)",
          )
          .run(uid(), p.id, size, height, firmness, price, p.stock);
      }
}
if (autoSetup) {
  if (
    !(await db
      .prepare("SELECT id FROM settings WHERE id='_variantMigration2'")
      .get())
  )
    await db.transaction(async () => {
      await Promise.all(
        (await db.prepare("SELECT * FROM products").all()).map(syncVariants),
      );
      await db
        .prepare("INSERT INTO settings(id,value) VALUES(?,?)")
        .run("_variantMigration2", "true");
    })();

  // Additive identity migration: existing customers, passwords and orders are kept.
  const userColumns = new Set(
    (await db.prepare("PRAGMA table_info(users)").all()).map((c) => c.name),
  );
  for (const [name, type] of [
    ["avatar", "TEXT DEFAULT ''"],
    ["google_sub", "TEXT"],
    ["google_only", "INTEGER DEFAULT 0"],
  ]) {
    if (!userColumns.has(name))
      await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
  }
  await db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject ON users(google_sub) WHERE google_sub IS NOT NULL",
  );
  // One-time shop configuration, never reapplied over future owner edits.
  if (
    !(await db
      .prepare("SELECT id FROM settings WHERE id=?")
      .get("_realFeelingShopV1"))
  )
    await db.transaction(async () => {
      const details = {
        storeName: "REAL FEELING MATTRESS",
        phone: "+91 74053 23892",
        address:
          "Shop 23, Atria Business Zone, A-23, Naroda Rd, opp. Jinning Press, BRTS, Asarwa, Ahmedabad, Gujarat 380025",
        mapUrl: "https://maps.app.goo.gl/ZU3trK9m2659EHyS7",
        facebookUrl: "https://www.facebook.com/share/1BN5BexjMX/",
        instagramUrl: "https://www.instagram.com/real_feeling_mattress",
        email: "",
        businessHours: "Please call to confirm visiting hours.",
        seoTitle: "REAL FEELING MATTRESS | Comfort in Ahmedabad",
        seoDescription:
          "Explore mattresses and bedding at Real Feeling Mattress, Asarwa, Ahmedabad. Visit Shop 23, Atria Business Zone or call +91 74053 23892.",
        _realFeelingShopV1: true,
      };
      const put = db.prepare(
        "INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
      );
      for (const [key, value] of Object.entries(details))
        await put.run(key, JSON.stringify(value));
      await db
        .prepare("UPDATE content SET title=?,body=? WHERE id=?")
        .run(
          "Returns & support",
          "For questions about a product or an order, contact Real Feeling Mattress on +91 74053 23892 or open a support request. Return eligibility and conditions must be confirmed with the shop before purchase. This demo does not process real payments.",
          "returns",
        );
      await db
        .prepare("UPDATE content SET body=? WHERE id=?")
        .run(
          "This is a demonstration store. Orders do not create a real purchase or charge. Product information and warranties are illustrative, not binding offers. The owner must review and publish final terms before accepting live orders.",
          "terms",
        );
      await db
        .prepare("UPDATE content SET title=?,body=? WHERE id=?")
        .run(
          "A real feeling of comfort.",
          "Visit REAL FEELING MATTRESS in Asarwa, Ahmedabad. Explore mattresses, bedding and comfort options with our team.\n\n" +
            details.address +
            "\n\nCall " +
            details.phone +
            " for product enquiries and visiting information.",
          "about",
        );
      await db.prepare("DELETE FROM content WHERE id='faq-trial'").run();
      await db
        .prepare(
          "UPDATE content SET active=0 WHERE lower(title) LIKE '%trial%' OR lower(body) LIKE '%100-night%'",
        )
        .run();
      for (const p of await db.prepare("SELECT id,specs FROM products").all()) {
        const specs = JSON.parse(p.specs || "{}");
        delete specs.trial;
        await db
          .prepare("UPDATE products SET specs=? WHERE id=?")
          .run(JSON.stringify(specs), p.id);
      }
    })();
}

if (autoSetup) {
  const cols = (await db.prepare("PRAGMA table_info(orders)").all()).map(
    (c) => c.name,
  );
  if (!cols.includes("summary"))
    await db.exec("ALTER TABLE orders ADD COLUMN summary TEXT DEFAULT '{}'");
  await db
    .prepare(
      "INSERT OR IGNORE INTO settings(id,value) VALUES('_cloudPreparedV1','true')",
    )
    .run();
}

// ── Cloud-safe additive migrations (run on EVERY startup, including Vercel) ──
// These only ADD missing columns/indexes — they never modify existing data.
// This ensures Vercel deployments don't crash with "undefined column" errors.
if (db.kind === "postgres") {
  try {
    // Add missing columns to users table
    await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT ''");
    await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT");
    await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_only BIGINT DEFAULT 0");

    // Add missing column to orders table
    await db.exec("ALTER TABLE orders ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '{}'");

    // Add Google subject index
    await db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject ON users(google_sub) WHERE google_sub IS NOT NULL",
    );

    // Ensure cloud prepared flag
    await db.exec(
      "INSERT INTO settings(id,value) VALUES('_cloudPreparedV1','\"true\"') ON CONFLICT(id) DO NOTHING",
    );
  } catch (migrationError) {
    // Log but don't crash — individual queries will fail with clear errors
    console.error("Cloud migration warning:", migrationError.message);
  }
}
