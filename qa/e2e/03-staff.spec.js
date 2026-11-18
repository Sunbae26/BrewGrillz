import { test, expect, API, freshIp, signIn, teamAccount, shot } from "./helpers.js";

async function placeOrder(request, name = "Board Test") {
  const slots = await (await request.get(`${API}/orders/pickup-slots`)).json();
  const res = await request.post(`${API}/orders`, {
    headers: { "X-Forwarded-For": freshIp() },
    data: {
      idempotencyKey: crypto.randomUUID(),
      items: [{ slug: "chicken-wings", quantity: 1 }],
      customer: { name, email: "board@example.com", phone: "91234567" },
      pickupAt: slots.data[0].slots[2].iso,
      agree: true,
    },
  });
  const { order } = (await res.json()).data;
  await request.post(`${API}/orders/${order.code}/confirm?t=${order.token}`, { data: {} });
  return order;
}

test.describe("Staff dashboard", () => {
  test("E2E-STAFF-01 admin moves an order across the board to picked up", async ({ page, request }) => {
    const order = await placeOrder(request);
    await signIn(page, teamAccount("ADMIN"), "/admin/login");
    await expect(page).toHaveURL(/\/admin$/);
    const card = page.locator(".acard", { hasText: order.code.slice(-4) }).first();
    await expect(card).toBeVisible();
    await shot(page, "admin-orders");
    await card.getByRole("button", { name: "Start preparing" }).click();
    await expect(page.locator(".aboard__col--preparing .acard", { hasText: order.code.slice(-4) })).toBeVisible();
    await page.locator(".aboard__col--preparing .acard", { hasText: order.code.slice(-4) }).getByRole("button", { name: "Mark ready" }).click();
    await page.locator(".aboard__col--ready .acard", { hasText: order.code.slice(-4) }).getByRole("button", { name: "Picked up" }).click();
    await expect(page.locator(".adm__list .acard", { hasText: order.code.slice(-4) })).toBeVisible();
  });

  test("E2E-STAFF-02 marking a dish sold out hides it from online ordering, and back again", async ({ page }) => {
    await signIn(page, teamAccount("ADMIN"), "/admin/login");
    await page.goto("/admin/menu");
    await page.locator(".adm__tools input[type=search]").fill("Bruschetta");
    const row = page.locator(".amenu__row", { hasText: "Bruschetta" }).first();
    await row.locator(".aswitch input").click();
    await expect(row.locator(".aswitch")).toContainText("Sold out");
    const check = await page.request.get(`${API}/menu/availability?items=bruschetta`);
    expect(JSON.stringify(await check.json())).toMatch(/false/);
    await row.locator(".aswitch input").click();
    await expect(row.locator(".aswitch")).toContainText("Available");
  });

  test("E2E-STAFF-03 staff see fewer tabs and can't open Team or Reports", async ({ page }) => {
    await signIn(page, teamAccount("STAFF"), "/admin/login");
    await expect(page.locator(".adm__tab")).toHaveCount(6);
    await expect(page.locator(".adm__tab", { hasText: "Team" })).toHaveCount(0);
    await page.goto("/admin/reports");
    await expect(page.locator(".falert--error")).toBeVisible();
  });

  test("E2E-STAFF-04 owner adds a staff member, who can then sign in", async ({ page, browser }) => {
    await signIn(page, teamAccount("ADMIN"), "/admin/login");
    await page.goto("/admin/team");
    const email = `newstaff.${Date.now()}@example.com`;
    await page.locator("#tname").fill("New Server");
    await page.locator("#temail").fill(email);
    await page.locator("#tpass").fill("grill-staff-2026");
    await page.getByRole("button", { name: "Add to team" }).click();
    await expect(page.locator(".falert--info")).toContainText("can now sign in");
    const other = await browser.newContext();
    const staffPage = await other.newPage();
    await signIn(staffPage, { email, password: "grill-staff-2026" }, "/admin/login");
    await expect(staffPage.locator(".adm__who")).toContainText("Staff");
    await other.close();
  });

  test("E2E-STAFF-05 a customer who opens /admin sees 'Staff only'", async ({ page, request }) => {
    const email = `cust.${Date.now()}@example.com`;
    await request.post(`${API}/auth/register`, { data: { name: "Just Customer", email, password: "steak-and-chips-2026" }, headers: { "X-Forwarded-For": freshIp() } });
    await signIn(page, { email, password: "steak-and-chips-2026" });
    await page.goto("/admin");
    await expect(page.getByText("Staff only")).toBeVisible();
  });

  test("E2E-STAFF-06 every dashboard tab opens without errors", async ({ page }) => {
    await signIn(page, teamAccount("ADMIN"), "/admin/login");
    for (const tab of ["bookings", "enquiries", "menu", "rewards", "settings", "team", "reports"]) {
      await page.goto(`/admin/${tab}`);
      await expect(page.locator(".adm__title")).toBeVisible();
    }
  });
});
