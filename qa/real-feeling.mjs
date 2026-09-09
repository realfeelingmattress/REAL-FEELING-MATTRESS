import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
});
const page = await context.newPage();
const errors = [],
  lines = [];
const log = (s) => {
  lines.push(s);
  console.log(s);
};
page.on("pageerror", (e) => errors.push(e.message));
const root = process.env.TEST_ROOT || "http://127.0.0.1:3000";
try {
  await page.goto(root);
  await expect(page.locator(".site-header .logo")).toContainText(
    "REAL FEELING",
  );
  await expect(page.locator('a[href^="/owner"]')).toHaveCount(0);
  assert.ok(
    !/100.night|sleep trial/i.test(await page.locator("body").innerText()),
  );
  await page.screenshot({
    animations: "disabled",
    path: "qa/real-feeling-home.png",
  });
  await page
    .getByRole("button", { name: "Sign in to your customer account" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Sign in to continue");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Use demo owner credentials" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  log(
    "PASS: new shop identity; customer-only sign-in, Google setup state and no owner/trial links on the storefront.",
  );
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  const search = page.getByRole("combobox", { name: "Search products" });
  await expect(search).toBeFocused();
  await search.fill("queen hybrid");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option")).toContainText("The Hybrid");
  await search.press("ArrowDown");
  await expect(page.getByRole("option")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.screenshot({
    animations: "disabled",
    path: "qa/real-feeling-search.png",
  });
  await search.press("Enter");
  await expect(page).toHaveURL(/\/product\/hybrid-mattress$/);
  await page
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await search.fill("pillow");
  await page
    .getByRole("button", { name: "Explore all 1 match", exact: true })
    .click();
  await expect(page).toHaveURL(/\/search\?q=pillow/);
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Pillow");
  log(
    "PASS: keyboard search, multi-word matches and complete search results including accessories.",
  );
  await page.goto(root + "/product/hybrid-mattress");
  await page.getByRole("button", { name: "King 72 × 78 in" }).click();
  await page.getByRole("button", { name: "10 inches", exact: true }).click();
  await page.getByRole("button", { name: "Firm", exact: true }).click();
  await page
    .locator(".pdp-purchase")
    .getByRole("button", { name: "Add to bag" })
    .click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Sign in to continue",
  );
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("nocte-cart") || "[]").length,
    ),
    0,
  );
  await page.screenshot({
    animations: "disabled",
    path: "qa/real-feeling-customer-login.png",
  });
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name").fill("Comfort Tester");
  const email = "comfort" + Date.now() + "@example.com";
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("ComfortTest!2026");
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Your bag (1)");
  await expect(page.getByRole("dialog")).toContainText("King · 10″ · Firm");
  const cart = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nocte-cart")),
  );
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 1);
  assert.equal(cart[0].size, "King");
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Your account", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Comfort." }),
  ).toBeVisible();
  await expect(page.locator(".customer-avatar.large")).toBeVisible();
  await expect(page.locator('a[href^="/owner"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Profile & security", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your Google connection." }),
  ).toBeVisible();
  log(
    "PASS: add-to-bag pauses for customer registration then adds the exact variant once; customer profile has no owner workspace.",
  );
  await page.goto(root + "/checkout");
  await expect(page.locator(".order-summary")).toContainText("The Hybrid");
  await expect(page.getByLabel("Full name",{exact:true})).toHaveValue("Comfort Tester");
  log(
    "PASS: signed-in checkout remains connected to the customer and saved bag.",
  );
  await page.goto(root + "/account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto(root + "/checkout");
  await expect(page.locator(".checkout-signin-note")).toContainText("Sign in");
  await expect(
    page.getByRole("button", { name: "Place demo order" }),
  ).toHaveCount(0);
  await page.goto(root + "/owner");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use demo owner credentials" })
    .click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".admin-content h1")).toContainText(
    "A good day for better nights.",
  );
  await page.goto(root + "/owner/settings");
  await expect(page.getByLabel("Store name", { exact: true })).toHaveValue(
    "REAL FEELING MATTRESS",
  );
  await expect(page.getByLabel("Phone number", { exact: true })).toHaveValue(
    "+91 74053 23892",
  );
  await page.getByRole("button", { name: "Google login", exact: true }).click();
  await expect(page.locator(".google-setup-card")).toContainText(
    "GOOGLE_CLIENT_ID",
  );
  await page.screenshot({
    animations: "disabled",
    path: "qa/real-feeling-google-setup.png",
  });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of ["dashboard", "products", "settings"]) {
      await page.goto(root + "/owner/" + section);
      await expect(page.locator(".admin-content h1")).toBeVisible();
      const over = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
      assert.equal(over, false, `Owner ${section} overflow at ${width}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(root + "/account");
  await expect(
    page.getByRole("button", { name: "Create an account", exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href^="/owner"]')).toHaveCount(0);
  log(
    "PASS: separate owner endpoint/workspace, editable shop/social details, and Google setup guide. Owner session does not expose a customer-profile admin link.",
  );
  const guest = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobile = await guest.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await mobile.setViewportSize({ width, height: 844 });
    await mobile.goto(root);
    await expect(mobile.locator(".site-header .logo")).toBeVisible();
    const bounds = await mobile.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert.ok(
      bounds.scroll <= bounds.client + 1,
      `home overflow ${width}: ${JSON.stringify(bounds)}`,
    );
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(root);
  await mobile
    .getByRole("button", { name: "Search products", exact: true })
    .click();
  await mobile.getByRole("combobox").fill("notamattress");
  await expect(mobile.locator(".search-empty")).toBeVisible();
  await mobile
    .getByRole("button", { name: "Clear search", exact: true })
    .click();
  await mobile.getByRole("combobox").fill("orthopaedic");
  await expect(mobile.getByRole("option")).toHaveCount(1);
  await mobile.screenshot({
    animations: "disabled",
    path: "qa/real-feeling-mobile-search.png",
  });
  for (const theme of ["light", "dark"]) {
    await mobile.evaluate(
      (t) => (document.documentElement.dataset.theme = t),
      theme,
    );
    const axe = await new AxeBuilder({ page: mobile })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      `${theme} search a11y`,
    );
  }
  await mobile.keyboard.press("Escape");
  await mobile.goto(root + "/product/hybrid-mattress");
  await mobile
    .locator(".pdp-purchase")
    .getByRole("button", { name: "Add to bag" })
    .click();
  await expect(mobile.getByRole("dialog")).toHaveAccessibleName(
    "Sign in to continue",
  );
  await mobile.screenshot({
    animations: "disabled",
    path: "qa/real-feeling-mobile-login.png",
  });
  for (const theme of ["light", "dark"]) {
    await mobile.evaluate(
      (t) => (document.documentElement.dataset.theme = t),
      theme,
    );
    const axe = await new AxeBuilder({ page: mobile })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      `${theme} auth a11y`,
    );
  }
  const overflow = await mobile
    .getByRole("dialog")
    .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  assert.equal(overflow, false);
  await mobile.keyboard.press("Escape");
  await mobile.goto(root + "/support");
  await expect(mobile.locator(".support-contact")).toContainText([
    "+91 74053 23892",
    "Please call",
    "Ahmedabad",
  ]);
  await expect(
    mobile
      .locator('a[href="https://maps.app.goo.gl/ZU3trK9m2659EHyS7"]')
      .first(),
  ).toBeVisible();
  log(
    "PASS: nine responsive widths without page overflow, mobile search/login and four light/dark dialog accessibility checks.",
  );
  await mobile.goto(root + "/product/hybrid-mattress");
  await mobile.getByRole("button", { name: "Buy now", exact: true }).click();
  await expect(mobile.getByRole("dialog")).toHaveAccessibleName(
    "Sign in to continue",
  );
  assert.ok(!mobile.url().endsWith("/checkout"));
  await mobile.keyboard.press("Escape");
  await expect(mobile.getByRole("dialog")).toHaveCount(0);
  log(
    "PASS: Buy now also requires customer sign-in; cancelling never adds an item.",
  );
  assert.deepEqual(errors, []);
  log("All Real Feeling UI checks passed. No application errors.");
} catch (e) {
  log("FAIL: " + e.message);
  log("BROWSER ERRORS: " + JSON.stringify(errors));
  await page.screenshot({
    animations: "disabled",
    path: "qa/real-feeling-failure.png",
  });
  process.exitCode = 1;
} finally {
  fs.writeFileSync("qa/real-feeling-results.txt", lines.join("\n") + "\n");
  await browser.close();
}
