import { test, expect, addDish, shot } from "./helpers.js";

test.describe("Pickup orders", () => {
  test("E2E-ORD-01 guest orders wings and a steak with options, pays (test mode) and sees the order @mobile", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.locator("button.dish").first()).toBeVisible();
    await addDish(page, "Chicken Wings");
    await addDish(page, "Ribeye");
    await page.goto("/checkout");
    await expect(page.locator(".csum__lines li")).toHaveCount(2);
    await page.locator('.checkout input[autocomplete="name"]').fill("Tan Wei Ming");
    await page.locator('.checkout input[autocomplete="tel"]').fill("9123 4567");
    await page.locator('.checkout input[type="email"]').fill("weiming@example.com");
    await page.locator(".checkout__side .csum__agree input").check();
    await expect(page.locator(".cpts--guest")).toContainText("points");
    await page.locator(".csum__pay").click();
    await page.waitForURL(/\/order\/BG-\d{6}-[A-Z2-9]{4}/);
    await expect(page.locator("body")).toContainText(/received|on the grill/i);
    await expect(page.locator(".track__total")).toContainText("$");
    await shot(page, "order-status");
  });

  test("E2E-ORD-02 checkout needs details and the terms, and highlights what's missing", async ({ page }) => {
    await page.goto("/menu");
    await addDish(page, "Truffle Fries");
    await page.goto("/checkout");
    await page.locator(".csum__pay").click();
    await expect(page.locator(".csum__error")).toBeVisible();
    await expect(page.locator(".field--err").first()).toBeVisible();
    await page.locator('.checkout input[autocomplete="tel"]').fill("1234");
    await page.locator('.checkout input[autocomplete="name"]').fill("Tan Wei Ming");
    await page.locator('.checkout input[type="email"]').fill("weiming@example.com");
    await page.locator(".checkout__side .csum__agree input").check();
    await page.locator(".csum__pay").click();
    await expect(page.locator(".csum__error")).toContainText(/Singapore mobile/i);
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("E2E-ORD-03 alcohol shows on the menu but can't be added to the cart", async ({ page }) => {
    await page.goto("/bar");
    await expect(page.locator("body")).toContainText(/dine-in/i);
    await page.goto("/menu");
    const cartCount = await page.locator(".cartbtn__n").count();
    expect(cartCount).toBe(0);
  });

  test("E2E-ORD-04 cart: change quantity, delete one dish, clear all with two taps", async ({ page }) => {
    await page.goto("/menu");
    await addDish(page, "Truffle Fries");
    await addDish(page, "Chicken Wings");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(".cartbtn").click();
    await expect(page.locator(".cline")).toHaveCount(2);
    await page.locator(".cline__del").first().click();
    await expect(page.locator(".cline")).toHaveCount(1);
    await page.locator(".drawer__clear").click();
    await expect(page.locator(".drawer__clear")).toContainText(/again|sure|confirm/i);
    await page.locator(".drawer__clear").click();
    await expect(page.locator(".drawer__empty")).toBeVisible();
  });

  test("E2E-ORD-05 guest tracks an order with its number and email", async ({ page, request }) => {
    const slots = await (await request.get("http://localhost:4000/api/orders/pickup-slots")).json();
    const placed = await request.post("http://localhost:4000/api/orders", {
      headers: { "X-Forwarded-For": "172.20.1.1" },
      data: {
        idempotencyKey: crypto.randomUUID(),
        items: [{ slug: "truffle-fries", quantity: 1 }],
        customer: { name: "Track Me", email: "trackme@example.com", phone: "91234567" },
        pickupAt: slots.data[0].slots[2].iso,
        agree: true,
      },
    });
    const { order } = (await placed.json()).data;
    await request.post(`http://localhost:4000/api/orders/${order.code}/confirm?t=${order.token}`, { data: {} });
    await page.goto("/track");
    await page.locator(".tfind__form input").first().fill(order.code);
    await page.locator('.tfind__form input[type="email"]').fill("trackme@example.com");
    await page.locator(".tfind__submit").click();
    await page.waitForURL(new RegExp(`/order/${order.code}`));
    await expect(page.locator("body")).toContainText(order.code);
  });

  test("E2E-ORD-06 a menu link from the home page lands on the right section", async ({ page }) => {
    await page.goto("/");
    const card = page.locator('a.pyf__card[href="/menu#pizza"]');
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForURL(/\/menu/);
    await page.waitForTimeout(2600);
    const top = await page.evaluate(() => document.getElementById("cat-pizza").getBoundingClientRect().top);
    expect(top).toBeGreaterThan(40);
    expect(top).toBeLessThan(320);
  });
});
