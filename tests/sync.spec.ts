import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.skip(
  !process.env.SYNC_TEST,
  "Requires the isolated test-cloud build; never uses a real cloud account.",
);
const owner = "e95b97fc-ddad-4b48-96c8-c8e2c1f48ca5";
const KEY = "little-by-little.v1";
async function auth(context: BrowserContext) {
  await context.addInitScript(
    ({ owner }) => {
      const key = "sb-test-project-auth-token";
      if (localStorage.getItem(key)) return;
      const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: owner, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 }))}.testsignature`;
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh-token",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: owner,
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      );
    },
    { owner },
  );
}
async function settings(page: Page) {
  await page
    .getByRole("button", { name: "Settings and backups", exact: true })
    .click();
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
}
async function water(page: Page, value: string) {
  await page
    .locator(".habit-card.blue")
    .getByRole("button", { name: "Add progress" })
    .click();
  await page.getByLabel("Amount (cups)").fill(value);
  await page.getByRole("button", { name: "Save this little win" }).click();
}
test("two devices sync, preserve offline edits, and pause on concurrent changes", async ({
  page,
  context,
  browser,
}) => {
  let document: unknown = null;
  let revision = 0;
  let network = true;
  let writes = 0;
  let reads = 0;
  let delayNextRead = false;
  let readDelayed = false;
  let resumeRead: (() => void) | undefined;
  async function backend(context: BrowserContext) {
    await context.route(
      "https://test-project.supabase.co/**",
      async (route) => {
        if (!network) {
          await route.abort("internetdisconnected");
          return;
        }
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === "/auth/v1/logout") {
          await route.fulfill({ status: 204 });
          return;
        }
        if (request.method() === "OPTIONS") {
          await route.fulfill({
            status: 204,
            headers: {
              "access-control-allow-origin": "*",
              "access-control-allow-headers": "*",
            },
          });
          return;
        }
        expect(request.headers().authorization).toMatch(/^Bearer /);
        if (url.pathname === "/rest/v1/habit_spaces") {
          expect(url.searchParams.get("owner_id")).toBe(`eq.${owner}`);
          reads += 1;
          if (delayNextRead) {
            delayNextRead = false;
            readDelayed = true;
            await new Promise<void>((resolve) => {
              resumeRead = resolve;
            });
          }
          await route.fulfill({
            json: document ? { revision, document } : null,
          });
          return;
        }
        if (url.pathname === "/rest/v1/rpc/save_habit_space") {
          const body = request.postDataJSON();
          expect(body.expected_owner).toBe(owner);
          if (body.expected_revision !== revision) {
            await route.fulfill({
              status: 409,
              json: { message: "SYNC_CONFLICT" },
            });
            return;
          }
          document = body.next_document;
          revision += 1;
          writes += 1;
          await route.fulfill({ json: revision });
          return;
        }
        await route.fulfill({
          status: 400,
          json: { message: "Unexpected test request" },
        });
      },
    );
  }
  await auth(context);
  await backend(context);
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/");
  await water(page, "2");
  await settings(page);
  await expect(
    page.getByText("No cloud copy yet.", { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(0);
  await page
    .getByRole("button", { name: "Use this device's copy", exact: true })
    .click();
  await expect.poll(() => revision).toBe(1);
  await page.getByRole("button", { name: "Close dialog" }).click();

  const second = await browser.newContext({ baseURL: "http://127.0.0.1:4173" });
  try {
    await auth(second);
    await backend(second);
    const other = await second.newPage();
    other.on("dialog", (dialog) => void dialog.accept());
    await other.goto("/");
    await settings(other);
    await other
      .getByRole("button", { name: "Use cloud on this device" })
      .click();
    await other.getByRole("button", { name: "Close dialog" }).click();
    await expect(
      other.locator(".habit-card.blue .progress-number strong"),
    ).toHaveText("2");
    await water(page, "1");
    await expect.poll(() => revision).toBe(2);
    await other.clock.install();
    await other
      .locator(".habit-card.blue")
      .getByRole("button", { name: "Add progress" })
      .click();
    await other.getByLabel("Amount (cups)").fill("9");
    const readsBeforeEditing = reads;
    await other.evaluate(() => window.dispatchEvent(new Event("focus")));
    await other.clock.runFor(1500);
    expect(reads).toBe(readsBeforeEditing);
    await expect(other.getByLabel("Amount (cups)")).toHaveValue("9");
    await other.getByRole("button", { name: "Close dialog" }).click();
    await other.clock.resume();
    await settings(other);
    await expect(other.getByRole("dialog").getByText(/Synced/)).toBeVisible();
    await other.getByRole("button", { name: "Close dialog" }).click();
    await expect(
      other.locator(".habit-card.blue .progress-number strong"),
    ).toHaveText("3");

    network = false;
    await second.setOffline(true);
    await water(other, "4");
    await settings(other);
    await expect(other.getByRole("dialog").getByRole("alert")).toBeVisible();
    await other.getByRole("button", { name: "Close dialog" }).click();
    await expect(
      other.locator(".habit-card.blue .progress-number strong"),
    ).toHaveText("7");
    network = true;
    await water(page, "2");
    await expect.poll(() => revision).toBe(3);
    await second.setOffline(false);
    await settings(other);
    await expect(
      other.getByText("Choose which copy to keep", { exact: true }),
    ).toBeVisible();
    expect(writes).toBe(3);
    await other
      .getByRole("button", { name: "Use cloud on this device" })
      .click();
    await other.getByRole("button", { name: "Close dialog" }).click();
    await expect(
      other.locator(".habit-card.blue .progress-number strong"),
    ).toHaveText("5");
    const recovery = await other.evaluate(
      (owner) => localStorage.getItem(`little-before-sync.${owner}`),
      owner,
    );
    expect(
      JSON.parse(recovery!).entries.reduce(
        (sum: number, entry: { value: number }) => sum + entry.value,
        0,
      ),
    ).toBe(7);
    expect(
      await other.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).entries.length,
        KEY,
      ),
    ).toBe(3);

    await water(page, "1");
    await expect.poll(() => revision).toBe(4);
    await water(other, "3");
    await settings(other);
    await expect(
      other.getByText("Choose which copy to keep", { exact: true }),
    ).toBeVisible();
    const beforeSignOut = await other.evaluate(
      (key) => localStorage.getItem(key),
      KEY,
    );
    delayNextRead = true;
    await other
      .getByRole("button", { name: "Use cloud on this device" })
      .click();
    await expect.poll(() => readDelayed).toBe(true);
    await other
      .getByRole("button", { name: "Sign out on this device" })
      .click();
    await expect(other.getByLabel("Email", { exact: true })).toBeVisible();
    resumeRead!();
    await expect(other.getByRole("alert")).toHaveText(
      "Account changed during sync. Local records are unchanged.",
    );
    expect(await other.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
      beforeSignOut,
    );
  } finally {
    await second.close();
  }
});
