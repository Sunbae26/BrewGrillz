import { test, expect, API, freshIp, signIn, teamAccount } from "./helpers.js";

// Nobody should have to refresh: the customer's order page and the staff board update by themselves.
async function placeOrder(request, name = "Live Test") {
  const slots = await (await request.get(`${API}/orders/pickup-slots`)).json();
  const res = await request.post(`${API}/orders`, {
    headers: { "X-Forwarded-For": freshIp() },
    data: {
      idempotencyKey: crypto.randomUUID(),
      items: [{ slug: "chicken-wings", quantity: 1 }],
      customer: { name, email: "live@example.com", phone: "91234567" },
      pickupAt: slots.data.at(-1).slots[2].iso,
      agree: true,
    },
  });
  const { order } = (await res.json()).data;
  await request.post(`${API}/orders/${order.code}/confirm?t=${order.token}`, { data: {} });
  return order;
}

test.describe("Live updates (no reload)", () => {
  test.setTimeout(90_000);

  test("LIVE-01 customer's order page follows the kitchen: received → on the grill → ready", async ({ page, browser, request }) => {
    const order = await placeOrder(request);
    await page.goto(`/order/${order.code}?t=${encodeURIComponent(order.token)}`);
    await expect(page.locator(".step.is-now")).toContainText("Order received");
    await expect(page.locator(".track__live")).toBeVisible();

    // staff move it on, in a separate browser
    const staffCtx = await browser.newContext();
    const staff = await staffCtx.newPage();
    await signIn(staff, teamAccount("ADMIN"), "/admin/login");
    const card = staff.locator(".acard", { hasText: order.code.slice(-4) }).first();
    await card.getByRole("button", { name: "Start preparing" }).click();

    // the customer's page changes by itself within ~10s
    await expect(page.locator(".step.is-now")).toContainText("On the grill", { timeout: 15_000 });
    await staff.locator(".aboard__col--preparing .acard", { hasText: order.code.slice(-4) }).getByRole("button", { name: "Mark ready" }).click();
    await expect(page.locator(".track__title")).toContainText("Ready", { timeout: 15_000 });
    await staffCtx.close();
  });

  test("LIVE-02 a new order appears on the staff board and in the tab title without a reload", async ({ page, request }) => {
    await signIn(page, teamAccount("ADMIN"), "/admin/login");
    await expect(page).toHaveURL(/\/admin$/);
    const order = await placeOrder(request, "Board Live");
    await expect(page.locator(".acard", { hasText: order.code.slice(-4) }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveTitle(/^\(\d+\) New orders? · BrewGrillz$/, { timeout: 15_000 });
  });
});
