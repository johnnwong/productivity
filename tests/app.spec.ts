import { expect, test, type Page } from "@playwright/test";

const KEY = "little-by-little.v1";
async function addWater(page: Page, amount: string) {
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Stay hydrated", exact: true }),
  });
  await card.getByRole("button", { name: "Add progress" }).click();
  await page.getByLabel("Amount (cups)").fill(amount);
  await page.getByRole("button", { name: "Save this little win" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("daily habits persist, edit, graph, delete, and check off", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await addWater(page, "2");
  await addWater(page, "1");
  await addWater(page, "2");
  const card = page.locator(".habit-card").filter({ hasText: "Stay hydrated" });
  await expect(card.locator(".progress-number strong")).toHaveText("5");
  await page
    .getByRole("button", { name: "Complete A moment for yourself" })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Uncheck A moment for yourself" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator(".progress-number strong")).toHaveText("5");
  await page
    .getByRole("button", { name: "Little journal", exact: true })
    .click();
  await page
    .locator(".entry-row")
    .filter({ hasText: "2 cups" })
    .first()
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByLabel("Amount (cups)").fill("3");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "Growth", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Habit", exact: true })
    .selectOption({ label: "Stay hydrated" });
  await expect(page.locator(".insight-totals strong").first()).toHaveText("6");
  await page.getByText("See daily numbers", { exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Not recorded");
  await page
    .getByRole("button", { name: "Little journal", exact: true })
    .click();
  await page
    .locator(".entry-row")
    .filter({ hasText: "3 cups" })
    .getByRole("button", { name: /Delete/ })
    .click();
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await page.getByRole("button", { name: "My day", exact: true }).click();
  await expect(card.locator(".progress-number strong")).toHaveText("3");
  await expect(
    page.getByRole("button", { name: "Uncheck A moment for yourself" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("rich LeetCode logs support multiple problems and dates", async ({
  page,
}) => {
  await page.goto("/");
  for (const title of ["Two Sum", "Valid Parentheses"]) {
    await page.getByRole("button", { name: "Log problem" }).click();
    await page.getByLabel("Problem title").fill(title);
    await page
      .getByLabel("Problem link")
      .fill("https://leetcode.com/problems/two-sum/");
    await page.getByLabel("Difficulty").selectOption("medium");
    await page.getByLabel("Minutes").fill("24");
    await page.getByLabel("What did you learn?").fill("Remember the hash map.");
    await page.getByRole("button", { name: "Save this little win" }).click();
  }
  await expect(
    page.locator(".habit-card.peach .progress-number strong"),
  ).toHaveText("2");
  await page.reload();
  await expect(page.getByRole("link", { name: "Two Sum" })).toHaveAttribute(
    "href",
    "https://leetcode.com/problems/two-sum/",
  );
  await expect(page.locator(".entry-note").first()).toHaveText(
    "Remember the hash map.",
  );
  await page.getByRole("button", { name: "Previous day" }).click();
  await expect(
    page.locator(".habit-card.peach .progress-number strong"),
  ).toHaveText("0");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(
    page.locator(".habit-card.peach .progress-number strong"),
  ).toHaveText("2");
});
test("create, archive and restore a habit without losing history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New habit" }).click();
  await page.getByLabel("What would you like to grow?").fill("Read a little");
  await page.getByRole("button", { name: "Plant a new habit" }).click();
  await page.getByRole("button", { name: "Complete Read a little" }).click();
  await page.getByRole("button", { name: "Edit Read a little" }).click();
  await page
    .getByRole("button", { name: "Archive habit (keep history)" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Read a little", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "View archived habits (1)" }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Uncheck Read a little" }),
  ).toBeVisible();
});
test("step targets save as whole numbers and preserve yesterday's goal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit Find your stride" }).click();
  await page.getByLabel("Daily target").fill("7000");
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const steps = page.locator(".habit-card.sage");
  await expect(steps.locator(".progress-number > span")).toContainText("7,000");
  await steps.getByRole("button", { name: "Add progress" }).click();
  await page.getByLabel("Amount (steps)").fill("0.5");
  await page.getByRole("button", { name: "Save this little win" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Amount (steps)").fill("1500");
  await page.getByRole("button", { name: "Save this little win" }).click();
  await expect(steps.locator(".progress-number strong")).toHaveText("1,500");
  await page.getByRole("button", { name: "Previous day" }).click();
  await expect(steps.locator(".progress-number > span")).toContainText("6,000");
});
test("backup round trip validates before replacing data", async ({ page }) => {
  await page.goto("/");
  await addWater(page, "2");
  await page
    .getByRole("button", { name: "Settings and backups", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export a backup", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toMatch(
    /little-by-little-.*\.json/,
  );
  const original = await page.evaluate(
    (key) => localStorage.getItem(key)!,
    KEY,
  );
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("couldn't be read");
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    original,
  );
  const parsed = JSON.parse(original);
  parsed.entries = [];
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(parsed)),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.locator(".habit-card.blue .progress-number strong"),
  ).toHaveText("0");
});
test("storage failure preserves the open form and retry does not duplicate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log problem" }).click();
  await page.getByLabel("Problem title").fill("Keep my input");
  await page
    .getByLabel("Problem link")
    .fill("https://leetcode.com/problems/two-sum/");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "little-by-little.v1") {
        Storage.prototype.setItem = original;
        throw new Error("Storage is full");
      }
      original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Save this little win" }).click();
  await expect(
    page.getByRole("dialog").getByText(/Storage is full/),
  ).toBeVisible();
  await expect(page.getByLabel("Problem title")).toHaveValue("Keep my input");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).entries.length,
      KEY,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Save this little win" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).entries.length,
      KEY,
    ),
  ).toBe(1);
});
test("corrupted storage is not overwritten and can be recovered", async ({
  page,
}) => {
  await page.goto("/");
  const valid = await page.evaluate((key) => localStorage.getItem(key)!, KEY);
  await page.evaluate(
    (key) => localStorage.setItem(key, "corrupt original"),
    KEY,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Let's protect your space." }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    "corrupt original",
  );
  await page
    .getByRole("button", { name: "Recovery & backups", exact: true })
    .click();
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(valid),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("heading", { name: "Your daily little things" }),
  ).toBeVisible();
});
test("production shell installs and works offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await addWater(page, "1");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const manifest = await page.request.get("/manifest.webmanifest");
  expect((await manifest.json()).display).toBe("standalone");
  const icons = ["/icon-192.png", "/icon-512.png"];
  for (const icon of icons)
    expect((await page.request.get(icon)).headers()["content-type"]).toContain(
      "image/png",
    );
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.locator(".habit-card.blue .progress-number strong"),
  ).toHaveText("1");
  await addWater(page, "2");
  await expect(
    page.locator(".habit-card.blue .progress-number strong"),
  ).toHaveText("3");
});
test("responsive design and reduced motion", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".plant.tall")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Growth", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Look how you're growing." }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("growth.png"),
    fullPage: true,
  });
});
