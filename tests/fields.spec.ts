import { expect, test } from "@playwright/test";

test("LeetCode fields can be hidden without requiring them in future logs", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Edit A little problem-solving", exact: true })
    .click();
  await page.getByText("Customize tracked fields (5)", { exact: true }).click();
  const definitions = page.locator(".field-definition");
  await definitions.nth(1).getByLabel("Show when logging").uncheck();
  await definitions.nth(2).getByLabel("Show when logging").uncheck();
  await page.getByRole("button", { name: "Save habit", exact: true }).click();
  await page.getByRole("button", { name: "Log problem", exact: true }).click();
  await expect(page.getByLabel("Problem link")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Difficulty" })).toHaveCount(
    0,
  );
  await page
    .getByLabel("Problem title")
    .fill("A practice session without a link");
  await page.getByRole("button", { name: "Save this little win" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.locator(".habit-card.peach .progress-number strong"),
  ).toHaveText("1");
});
