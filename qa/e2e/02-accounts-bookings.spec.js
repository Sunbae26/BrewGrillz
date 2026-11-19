import { test, expect, API, addDish, apiCustomer, freshIp, randomPhone, signIn, teamAccount, shot } from "./helpers.js";

test.describe("Accounts, Rewards and bookings", () => {
  test("E2E-ACC-01 sign up, the navbar shows the account, sign out @mobile", async ({ page }) => {
    await page.goto("/register");
    await page.locator("#name").fill("Siti Nur'Aisyah");
    await page.locator("#email").fill(`siti.${Date.now()}@example.com`);
    await page.locator("#phone").fill(randomPhone());
    await page.locator("#password").fill("steak-and-chips-2026");
    await page.locator(".auth__form input[type=checkbox]").last().check();
    await page.locator(".auth__submit").click();
    await page.waitForURL(/\/account/);
    await expect(page.locator(".acct__title")).toContainText("Siti");
    await expect(page.locator(".acctbtn__initial")).toHaveText("S");
    await shot(page, "account");
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL((u) => u.pathname === "/");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount|\/login\?next=\/account/);
  });

  test("E2E-ACC-02 wrong password shows a clear message; forgot password sends a link", async ({ page, request }) => {
    const member = await apiCustomer(request);
    await page.goto("/login");
    await page.locator("#email").fill(member.email);
    await page.locator("#password").fill("wrong-password-1");
    await page.locator(".auth__submit").click();
    await expect(page.locator(".falert--error")).toBeVisible();
    await page.goto("/forgot-password");
    await page.locator("#email").fill(member.email);
    await page.locator(".auth__submit").click();
    await expect(page.locator(".falert--info")).toBeVisible();
  });

  test("E2E-ACC-03 member earns points, staff add a dine-in bill, member spends 100 points at checkout", async ({ page, request }) => {
    const member = await apiCustomer(request);
    // staff add a S$120 dine-in bill
    const admin = teamAccount("ADMIN");
    const login = await request.post(`${API}/auth/login`, { data: admin, headers: { "X-Forwarded-For": freshIp() } });
    const cookie = login.headers()["set-cookie"].split(";")[0];
    const found = await (await request.get(`${API}/admin/members?q=${encodeURIComponent(member.email)}`, { headers: { Cookie: cookie } })).json();
    await request.post(`${API}/admin/members/${found.data[0].id}/points`, { data: { billCents: 12000 }, headers: { Cookie: cookie } });

    await signIn(page, member);
    await page.goto("/menu");
    await addDish(page, "Chicken Wings");
    await addDish(page, "Truffle Fries");
    await page.goto("/checkout");
    await expect(page.locator('.checkout input[type="email"]')).toHaveValue(member.email);
    await expect(page.locator(".cpts__top")).toContainText("120");
    await page.getByRole("button", { name: "Use more points" }).click();
    await expect(page.locator(".csum__row--off")).toContainText("−$5.00");
    await page.locator('.checkout input[autocomplete="tel"]').fill("9123 4567");
    await page.locator(".checkout__side .csum__agree input").check();
    await page.locator(".csum__pay").click();
    await page.waitForURL(/\/order\/BG-/);
    await expect(page.locator("body")).toContainText("Rewards (100 pts)");
    await page.goto("/account");
    await page.locator(".acct__tab", { hasText: "Points" }).click();
    await expect(page.locator(".acct__row")).toHaveCount(3); // dine-in, used, earned
  });

  test("E2E-BOOK-01 book a table, see the status page, then cancel it @mobile", async ({ page }) => {
    await page.goto("/reserve");
    await page.locator("button.ribbon__day").nth(3).click();
    await page.locator("button.slot:not([disabled])").nth(1).click();
    await page.locator('input[autocomplete="name"]').fill("Booking Tester");
    await page.locator('input[autocomplete="tel"]').fill(randomPhone());
    await page.locator('input[type="email"]').first().fill(`book.${Date.now()}@example.com`);
    await page.locator(".book__side .csum__agree input").check();
    await page.locator(".book__side button", { hasText: "Request my table" }).click();
    await page.waitForURL(/\/reserve\/BT-/);
    await expect(page.locator(".seal")).toBeVisible();
    await expect(page.locator('a[download$=".ics"]')).toBeVisible();
    await page.locator(".bstatus__cancel button").click();
    await page.locator(".bstatus__cancel button").click();
    await expect(page.locator(".seal")).toContainText(/cancel/i);
  });

  test("E2E-EVT-01 send an event enquiry", async ({ page }) => {
    await page.goto("/events");
    await page.locator("#enquire").scrollIntoViewIfNeeded();
    const date = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await page.fill("#enquire input[type=date]", date);
    await page.fill("#enquire input[autocomplete=name]", "Party Planner");
    await page.fill("#enquire input[autocomplete=tel]", randomPhone());
    await page.fill("#enquire input[type=email]", `party.${Date.now()}@example.com`);
    await page.locator("#enquire .csum__agree input").last().check();
    await page.locator("#enquire button", { hasText: "Send my enquiry" }).click();
    await expect(page.locator(".evsent")).toBeVisible();
  });
});
