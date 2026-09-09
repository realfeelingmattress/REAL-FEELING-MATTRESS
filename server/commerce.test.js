import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
const port = 3101,
  base = `http://127.0.0.1:${port}/api`;
let server, owner, guest, customer, product, order;
const dbPath = `data/qa-${Date.now()}.sqlite`;
function client() {
  let cookie = "",
    csrf = "";
  return {
    async call(url, method = "GET", body, opts = {}) {
      const r = await fetch(base + url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
          "x-csrf-token": csrf,
          ...opts.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const sc = r.headers.get("set-cookie");
      if (sc) cookie = sc.split(";")[0];
      const data = await r.json();
      if (data.csrf) csrf = data.csrf;
      return { status: r.status, data, headers: r.headers };
    },
    async init() {
      await this.call("/bootstrap");
      return this;
    },
  };
}
const line = (id = "hybrid", quantity = 1) => ({
  productId: id,
  size: "Queen",
  thickness: "8",
  firmness: "Medium",
  quantity,
});
const checkout = (items = [line()], extra = {}) => ({
  checkoutKey: randomUUID(),
  items,
  name: "QA Sleeper",
  email: "qa@example.com",
  phone: "9876543210",
  address: {
    line1: "24 Demo Garden Road",
    city: "Patna",
    state: "Bihar",
    pincode: "800001",
  },
  payment: "demo",
  ...extra,
});
before(async () => {
  server = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      DB_PATH: dbPath,
      OWNER_EMAIL: "owner@test.example",
      OWNER_PASSWORD: "TestOwner!2026",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    let logs = "";
    const timeout = setTimeout(
      () => reject(new Error("Test server startup timed out: " + logs)),
      20000,
    );
    server.stdout.on("data", (d) => {
      logs += d;
      if (logs.includes("is ready on port")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on("data", (d) => (logs += d));
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Test server exited ${code}: ${logs}`));
    });
  });
  guest = await client().init();
  owner = await client().init();
  const login = await owner.call("/auth/owner/login", "POST", {
    email: "owner@test.example",
    password: "TestOwner!2026",
  });
  assert.equal(login.status, 200);
  customer = await client().init();
  const reg = await customer.call("/auth/register", "POST", {
    name: "QA Customer",
    email: "customer@test.example",
    password: "CustomerTest!2026",
  });
  assert.equal(reg.status, 200);
});
after(() => {
  server?.kill("SIGTERM");
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(dbPath + suffix);
    } catch {}
  }
});
test("Public catalog contains all products and valid priced variants", async () => {
  const all = await guest.call("/products");
  assert.equal(all.status, 200);
  assert.equal(all.data.length, 8);
  product = (await guest.call("/products/hybrid")).data;
  assert.equal(product.variants.length, 36);
  assert.ok(product.variants.every((v) => v.price > 0));
  const pillow = (await guest.call("/products/pillow")).data;
  assert.equal(pillow.variants[0].price, 1999);
  assert.equal(pillow.variants[0].size, "Standard");
});
test("Guests and customers cannot access owner data or mutate products", async () => {
  assert.equal((await guest.call("/admin/orders")).status, 401);
  assert.equal((await customer.call("/admin/products")).status, 403);
  assert.equal(
    (await customer.call("/admin/settings", "POST", {})).status,
    403,
  );
  assert.equal(
    (await guest.call("/admin/products/hybrid", "PATCH", { price: 1 })).status,
    401,
  );
});
test("CSRF tokens are checked for mutations", async () => {
  const r = await owner.call(
    "/admin/inventory/hybrid",
    "PATCH",
    { change: 10, reason: "Not authorised" },
    { headers: { "x-csrf-token": "forged" } },
  );
  assert.equal(r.status, 403);
});
test("Passwords and session secrets are not exposed by customer/staff APIs", async () => {
  for (const route of ["/admin/customers", "/admin/staff"]) {
    const r = await owner.call(route);
    assert.equal(r.status, 200);
    assert.ok(r.data.every((u) => !("password" in u)));
  }
  const boot = await customer.call("/bootstrap");
  assert.equal(boot.data.user.role, "customer");
  assert.equal(boot.data.user.password, undefined);
});
test("Checkout never trusts browser prices, and validates coupons", async () => {
  const quote = await guest.call("/checkout/quote", "POST", {
    items: [{ ...line(), price: 1, total: 1 }],
    coupon: "REST10",
  });
  assert.equal(quote.status, 200);
  assert.equal(quote.data.subtotal, 24999);
  assert.equal(quote.data.discount, 2500);
  assert.equal(quote.data.total, 22499);
  assert.equal(quote.data.shipping, 0);
  assert.equal(
    (
      await guest.call("/checkout/quote", "POST", {
        items: [line()],
        coupon: "FAKECODE",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await guest.call("/checkout/quote", "POST", {
        items: [line("essential", -1)],
      })
    ).status,
    400,
  );
});
test("Accessories have a valid Standard checkout variant", async () => {
  const r = await guest.call("/checkout/quote", "POST", {
    items: [
      {
        productId: "pillow",
        size: "Standard",
        thickness: "1",
        firmness: "Soft",
        quantity: 2,
      },
    ],
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.subtotal, 3998);
  assert.equal(r.data.shipping, 499);
});
test("Creating an order updates stock, stores no payment details, and is idempotent", async () => {
  const before = (await guest.call("/products/hybrid")).data.stock;
  const payload = checkout([line()], { coupon: "REST10" });
  const first = await customer.call("/checkout", "POST", payload);
  assert.equal(first.status, 200, JSON.stringify(first.data));
  order = first.data;
  assert.equal(order.total, 22499);
  const duplicate = await customer.call("/checkout", "POST", payload);
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.data.id, order.id);
  const after = (await guest.call("/products/hybrid")).data.stock;
  assert.equal(after, before - 1);
  const changed = await customer.call("/checkout", "POST", {
    ...payload,
    name: "Changed name",
  });
  assert.equal(changed.status, 400);
  const account = (await customer.call("/account")).data;
  assert.equal(account.orders.length, 1);
  assert.equal(account.orders[0].payment_status, "Demo — unpaid");
  assert.equal(account.notifications.length, 1);
});
test("Tracking requires matching email; customers cannot see each other’s orders", async () => {
  assert.equal(
    (
      await guest.call("/tracking", "POST", {
        id: order.id,
        email: "other@example.com",
      })
    ).status,
    404,
  );
  const tracked = await guest.call("/tracking", "POST", {
    id: order.id,
    email: "qa@example.com",
  });
  assert.equal(tracked.status, 200);
  assert.equal(tracked.data.items.length, 1);
});
test("Concurrent customers cannot both purchase the final unit", async () => {
  const p = (await guest.call("/products/natural")).data;
  assert.equal(
    (
      await owner.call("/admin/inventory/natural", "PATCH", {
        change: 1 - p.stock,
        reason: "QA final unit concurrency test",
      })
    ).status,
    200,
  );
  const a = await client().init(),
    b = await client().init();
  for (const [i, c] of [a, b].entries())
    assert.equal(
      (
        await c.call("/auth/register", "POST", {
          name: "Concurrent customer " + i,
          email: `race${i}@test.example`,
          password: "ConcurrentTest!2026",
        })
      ).status,
      200,
    );
  const results = await Promise.all([
    a.call("/checkout", "POST", checkout([line("natural")])),
    b.call("/checkout", "POST", checkout([line("natural")])),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await guest.call("/products/natural")).data.stock, 0);
});
test("Cancelling an order restores stock exactly once and prevents reopening", async () => {
  const before = (await guest.call("/products/hybrid")).data.stock;
  assert.equal(
    (
      await owner.call("/admin/orders/" + order.id, "PATCH", {
        status: "Cancelled",
        notes: "QA cancellation",
      })
    ).status,
    200,
  );
  assert.equal((await guest.call("/products/hybrid")).data.stock, before + 1);
  assert.equal(
    (
      await owner.call("/admin/orders/" + order.id, "PATCH", {
        status: "Cancelled",
      })
    ).status,
    200,
  );
  assert.equal((await guest.call("/products/hybrid")).data.stock, before + 1);
  assert.equal(
    (
      await owner.call("/admin/orders/" + order.id, "PATCH", {
        status: "Confirmed",
      })
    ).status,
    400,
  );
});
test("Only a delivered purchaser may review a product; moderation is server-protected", async () => {
  const body = {
    productId: "hybrid",
    rating: 5,
    title: "A very comfortable test",
    body: "A detailed test review for this mattress.",
  };
  assert.equal((await customer.call("/reviews", "POST", body)).status, 400);
  const placed = await customer.call("/checkout", "POST", checkout());
  assert.equal(placed.status, 200);
  assert.equal(
    (
      await owner.call("/admin/orders/" + placed.data.id, "PATCH", {
        status: "Delivered",
      })
    ).status,
    200,
  );
  assert.equal((await customer.call("/reviews", "POST", body)).status, 200);
  const reviews = (await owner.call("/admin/reviews")).data;
  const created = reviews.find((r) => r.title === body.title);
  assert.equal(created.status, "pending");
  assert.equal(
    (
      await customer.call("/admin/reviews/" + created.id, "PATCH", {
        status: "published",
        response: "",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await owner.call("/admin/reviews/" + created.id, "PATCH", {
        status: "published",
        response: "Thank you for testing.",
      })
    ).status,
    200,
  );
});
test("Inventory and product validation reject negative stock and price", async () => {
  assert.equal(
    (
      await owner.call("/admin/inventory/essential", "PATCH", {
        change: -99999,
        reason: "invalid adjustment",
      })
    ).status,
    400,
  );
  const p = (await guest.call("/products/essential")).data;
  assert.equal(
    (
      await owner.call("/admin/products/essential", "PATCH", {
        ...p,
        price: -100,
      })
    ).status,
    400,
  );
  const good = await owner.call("/admin/products/essential", "PATCH", {
    ...p,
    price: 13999,
  });
  assert.equal(good.status, 200);
  assert.equal(
    (await guest.call("/products/essential")).data.variants.find(
      (v) => v.size === "Queen" && v.thickness === "6",
    ).price,
    13999,
  );
});
test("Owner product creation, archival, coupons and content work together", async () => {
  const p = (await guest.call("/products/essential")).data;
  const created = await owner.call("/admin/products", "POST", {
    ...p,
    name: "The QA Mattress",
    stock: 3,
  });
  assert.equal(created.status, 200);
  const id = created.data.id;
  assert.equal((await guest.call("/products/" + id)).data.variants.length, 36);
  assert.equal(
    (
      await owner.call("/admin/products/" + id, "PATCH", {
        ...p,
        name: "The QA Mattress",
        stock: 3,
        active: 0,
      })
    ).status,
    200,
  );
  assert.equal((await guest.call("/products/" + id)).status, 404);
  const coupon = await owner.call("/admin/coupons", "POST", {
    code: "QA500",
    type: "fixed",
    amount: 500,
    minimum: 5000,
    max_discount: 500,
    usage_limit: 1,
    expires: "2027-12-31",
  });
  assert.equal(coupon.status, 200);
  assert.equal(
    (
      await guest.call("/checkout/quote", "POST", {
        items: [line()],
        coupon: "QA500",
      })
    ).data.discount,
    500,
  );
  const content = await owner.call("/admin/content", "POST", {
    id: "qa-guide",
    title: "Test sleep guide",
    body: "A useful guide to a well-rested test.",
    type: "guide",
    active: 1,
  });
  assert.equal(content.status, 200);
  assert.ok(
    (await guest.call("/bootstrap")).data.content.some(
      (c) => c.id === "qa-guide",
    ),
  );
});
test("Support creates a persistent conversation and admin replies reach the customer", async () => {
  const t = await customer.call("/support", "POST", {
    name: "QA Customer",
    email: "customer@test.example",
    subject: "A question about my order",
    category: "Order help",
    message: "Could you help me check the delivery information?",
  });
  assert.equal(t.status, 200);
  const id = t.data.id;
  assert.equal(
    (
      await owner.call("/admin/support/" + id, "PATCH", {
        status: "In progress",
        reply: "We are happy to help.",
        assigned: "Alex",
      })
    ).status,
    200,
  );
  const account = (await customer.call("/account")).data;
  assert.equal(account.tickets[0].messages.length, 2);
  assert.equal(
    (
      await customer.call("/support/" + id + "/reply", "POST", {
        message: "Thank you very much.",
      })
    ).status,
    200,
  );
});
test("Staff roles are enforced on the server, and revocation kills sessions", async () => {
  assert.equal(
    (
      await owner.call("/admin/staff", "POST", {
        name: "Content Tester",
        email: "content@test.example",
        password: "ContentTest!2026",
        role: "content",
      })
    ).status,
    200,
  );
  const staff = await client().init();
  assert.equal(
    (
      await staff.call("/auth/owner/login", "POST", {
        email: "content@test.example",
        password: "ContentTest!2026",
      })
    ).status,
    200,
  );
  assert.equal((await staff.call("/admin/content")).status, 200);
  assert.equal((await staff.call("/admin/orders")).status, 403);
  assert.equal((await staff.call("/admin/settings", "POST", {})).status, 403);
  const u = (await owner.call("/admin/staff")).data.find(
    (u) => u.email === "content@test.example",
  );
  assert.equal(
    (await owner.call("/admin/staff/" + u.id, "DELETE")).status,
    200,
  );
  assert.equal((await staff.call("/admin/content")).status, 401);
});
test("Audit records capture privileged actions and cannot be read by customers", async () => {
  const audit = (await owner.call("/admin/audit")).data;
  for (const action of [
    "Signed in",
    "Product created",
    "Inventory adjusted",
    "Order status changed",
    "Coupon created",
    "Content saved",
    "Staff account created",
    "Staff access revoked",
  ])
    assert.ok(
      audit.some((a) => a.action === action),
      action,
    );
  assert.equal((await customer.call("/admin/audit")).status, 403);
});
test("Security headers and secure HttpOnly cookies are configured in production mode", async () => {
  const c = await client().init();
  const r = await c.call("/bootstrap");
  assert.ok(r.headers.get("content-security-policy"));
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  const fresh = await fetch(base + "/bootstrap");
  const cookie = fresh.headers.get("set-cookie");
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("Secure"));
  assert.ok(cookie.includes("SameSite=Lax"));
});

test("Preview login rotates a partitioned session and logout clears the same cookie scope", async () => {
  const proxyHeaders = {
    "x-forwarded-host": "3000-cookiecheck.e2b.app",
    "x-forwarded-proto": "https",
  };
  const boot = await fetch(base + "/bootstrap", { headers: proxyHeaders });
  const initial = await boot.json();
  const first = boot.headers.get("set-cookie");
  assert.ok(first.startsWith("nocte_preview_session="));
  assert.ok(first.includes("Secure"));
  assert.ok(first.includes("HttpOnly"));
  assert.ok(first.includes("SameSite=None"));
  assert.ok(first.includes("Partitioned"));
  const login = await fetch(base + "/auth/owner/login", {
    method: "POST",
    headers: {
      ...proxyHeaders,
      "Content-Type": "application/json",
      cookie: first.split(";")[0],
      "x-csrf-token": initial.csrf,
    },
    body: JSON.stringify({
      email: "owner@test.example",
      password: "TestOwner!2026",
    }),
  });
  assert.equal(login.status, 200);
  const signedIn = await login.json();
  const rotated = login.headers.get("set-cookie");
  assert.ok(rotated.includes("Partitioned"));
  assert.notEqual(rotated.split(";")[0], first.split(";")[0]);
  const account = await fetch(base + "/admin/orders", {
    headers: { ...proxyHeaders, cookie: rotated.split(";")[0] },
  });
  assert.equal(account.status, 200);
  const logout = await fetch(base + "/auth/logout", {
    method: "POST",
    headers: {
      ...proxyHeaders,
      cookie: rotated.split(";")[0],
      "x-csrf-token": signedIn.csrf,
    },
  });
  assert.equal(logout.status, 200);
  const cleared = logout.headers.get("set-cookie");
  assert.ok(cleared.includes("nocte_preview_session=;"));
  assert.ok(cleared.includes("Partitioned"));
  assert.ok(cleared.includes("SameSite=None"));
  assert.ok(cleared.includes("01 Jan 1970"));
  const revoked = await fetch(base + "/admin/orders", {
    headers: { ...proxyHeaders, cookie: rotated.split(";")[0] },
  });
  assert.equal(revoked.status, 401);
});

test("Cookie-free demo transport is disabled in production, including for owners", async () => {
  const handshake = await owner.call("/preview/session", "POST", {
    transport: "isolated-preview",
  });
  assert.equal(handshake.status, 404);
  assert.equal(handshake.data.code, "PREVIEW_TRANSPORT_DISABLED");
  assert.equal(handshake.data.previewSessionToken, undefined);
  const dispatch = await owner.call("/preview/request", "POST", {
    sessionToken: "np1_" + "0".repeat(64),
    csrfToken: "test",
    path: "/admin/orders",
    method: "GET",
  });
  assert.equal(dispatch.status, 404);
  assert.equal(dispatch.data.code, "PREVIEW_TRANSPORT_DISABLED");
});

test("Customer and owner sign-in endpoints reject the wrong account type without changing the session", async () => {
  const g = await client().init();
  const staffOnCustomer = await g.call("/auth/login", "POST", {
    email: "owner@test.example",
    password: "TestOwner!2026",
  });
  assert.equal(staffOnCustomer.status, 403);
  assert.equal((await g.call("/bootstrap")).data.user, null);
  const customerOnOwner = await g.call("/auth/owner/login", "POST", {
    email: "customer@test.example",
    password: "CustomerTest!2026",
  });
  assert.equal(customerOnOwner.status, 403);
  assert.equal((await g.call("/admin/orders")).status, 401);
  const correct = await g.call("/auth/login", "POST", {
    email: "customer@test.example",
    password: "CustomerTest!2026",
  });
  assert.equal(correct.status, 200);
  assert.equal(correct.data.user.role, "customer");
});
test("Checkout requires a signed-in customer, including when the API is called directly", async () => {
  assert.equal((await guest.call("/checkout", "POST", checkout())).status, 401);
  assert.equal((await owner.call("/checkout", "POST", checkout())).status, 403);
});
test("Real Feeling shop details are persistent, owner-configurable, and contain no trial offer", async () => {
  const boot = (await guest.call("/bootstrap")).data;
  assert.equal(boot.settings.phone, "+91 74053 23892");
  assert.equal(boot.settings.storeName, "REAL FEELING MATTRESS");
  assert.ok(boot.settings.address.includes("Ahmedabad"));
  assert.equal(
    boot.settings.mapUrl,
    "https://maps.app.goo.gl/ZU3trK9m2659EHyS7",
  );
  assert.ok(boot.settings.instagramUrl.endsWith("real_feeling_mattress"));
  assert.ok(
    boot.content.every((c) => !c.title.toLowerCase().includes("trial")),
  );
  assert.ok(
    (await guest.call("/products")).data.every(
      (p) => p.specs.trial === undefined,
    ),
  );
  const r = await customer.call("/admin/settings", "POST", {
    ...boot.settings,
    phone: "tampered",
  });
  assert.equal(r.status, 403);
});
test("Google endpoints fail closed until configured; no client profile or role is trusted", async () => {
  assert.equal(
    (await guest.call("/auth/google/challenge", "POST", { purpose: "login" }))
      .status,
    503,
  );
  assert.equal(
    (
      await guest.call("/auth/google", "POST", {
        credential: "fake",
        name: "Owner",
        role: "owner",
        avatar: "javascript:alert(1)",
      })
    ).status,
    503,
  );
  assert.equal((await guest.call("/bootstrap")).data.google.configured, false);
});

test('New callback checkout returns a full private snapshot and detects stale review prices', async()=>{
 const items=[line('essential')],q=(await customer.call('/checkout/quote','POST',{items})).data;
 const bad=await customer.call('/checkout','POST',checkout(items,{payment:'cod',quoteHash:'0'.repeat(64)}));assert.equal(bad.status,400);
 const body=checkout(items,{payment:'cod',quoteHash:q.quoteHash,deliveryNotes:'Please call before delivery.'});
 const result=await customer.call('/checkout','POST',body);assert.equal(result.status,200,JSON.stringify(result.data));const o=result.data.order;
 assert.match(o.id,/^RFM-\d{8}-[A-F0-9]{10}$/);assert.equal(o.status,'Awaiting confirmation');assert.match(o.payment_status,/unpaid/i);assert.equal(o.summary.deliveryNotes,body.deliveryNotes);assert.equal(o.summary.shop.storeName,'REAL FEELING MATTRESS');assert.equal(o.address.line1,body.address.line1);
 const repeat=await customer.call('/checkout','POST',body);assert.deepEqual(repeat.data,result.data);
 const pdf=await customer.call('/account/orders/'+o.id+'/pdf');assert.equal(pdf.status,200);assert.equal(pdf.data.mime,'application/pdf');assert.equal(Buffer.from(pdf.data.base64,'base64').subarray(0,5).toString(),'%PDF-');
 assert.equal((await guest.call('/account/orders/'+o.id+'/pdf')).status,401);
 const other=await client().init();await other.call('/auth/register','POST',{name:'Other Document Customer',email:'private-document@test.example',password:'DocumentTest!2026'});
 assert.equal((await other.call('/account/orders/'+o.id+'/pdf')).status,404);
 assert.equal((await owner.call('/account/orders/'+o.id+'/pdf')).status,200);
 const tracked=(await guest.call('/tracking','POST',{id:o.id,email:body.email})).data;assert.equal(tracked.redacted,true);assert.equal(tracked.email,undefined);assert.equal(tracked.phone,undefined);assert.deepEqual(tracked.address,{});assert.equal(tracked.summary,undefined);
 const before=(await guest.call('/products/essential')).data.stock;
 const cancellations=await Promise.all([owner.call('/admin/orders/'+o.id,'PATCH',{status:'Cancelled'}),owner.call('/admin/orders/'+o.id,'PATCH',{status:'Cancelled'})]);assert.deepEqual(cancellations.map(r=>r.status),[200,200]);assert.equal((await guest.call('/products/essential')).data.stock,before+1);
});
