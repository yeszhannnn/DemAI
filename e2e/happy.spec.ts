import { test, expect } from "@playwright/test";

/**
 * e2e/happy.spec.ts — the one happy-path spec (Prompt 12.4), run against
 * `?demo=1` so it never touches the network.
 *
 *   fresh profile → onboarding completes in ≤7 clicks (assert click count)
 *   → lands on Detail → all 9 section test-ids present, in order
 *   → disclaimer visible.
 *
 * The onboarding flow is S0 language → S1 who → S2 diagnosis (multi-select,
 * so a Continue tap is always required) → S3 triggers ("pick for me"
 * auto-advances) → S4 district (finish). That is 6 taps — well within the ≤7
 * budget.
 */

const EXPECTED_SECTIONS = [
  "section-topbar",
  "section-hero",
  "section-actions",
  "section-pollen",
  "section-air",
  "section-forecast",
  "section-why",
  "section-bot",
  "section-disclaimer",
] as const;

test("happy path: ≤7 taps to Detail with all 9 sections in demo mode", async ({ page }) => {
  // Fresh context → empty localStorage → no profile → onboarding.
  let taps = 0;
  const tap = async (locator: import("@playwright/test").Locator) => {
    await locator.click();
    taps += 1;
  };

  await page.goto("/onboarding?demo=1");

  // S0 — language: pick Русский.
  await tap(page.getByRole("button", { name: "Русский" }));

  // S1 — who: «Для меня».
  await tap(page.getByRole("button", { name: "Для меня" }));

  // S2 — diagnosis: «Астма» (multi-select → needs an explicit Continue tap).
  await tap(page.getByRole("button", { name: "Астма" }));
  await tap(page.getByRole("button", { name: "Продолжить" }));

  // S3 — triggers: «Выбрать за меня по диагнозу» (auto-advances to S4).
  await tap(page.getByRole("button", { name: "Выбрать за меня по диагнозу" }));

  // S4 — district: «Бостандыкский» → finish → /d/bostandyk?demo=1.
  await tap(page.getByRole("button", { name: "Бостандыкский" }));

  // Landed on the Detail screen (demo flag preserved).
  await expect(page).toHaveURL(/\/d\/bostandyk/, { timeout: 15_000 });

  // Assert the ≤7-click budget (the whole onboarding is the user's effort).
  expect(taps).toBeLessThanOrEqual(7);

  // Wait for the skeleton to clear and the hero to render.
  await expect(page.getByTestId("section-hero")).toBeVisible({ timeout: 15_000 });

  // All 9 section test-ids present, in order. Collect every section-* testid
  // in DOM order and verify the 9 expected ones form an ordered subsequence
  // (extra ids like section-bot-push / section-why-threshold are allowed as
  // long as the 9 keep their relative order).
  const present = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-testid^='section-']"))
      .map((el) => el.getAttribute("data-testid") ?? "");
  });

  let cursor = 0;
  for (const expected of EXPECTED_SECTIONS) {
    const idx = present.indexOf(expected, cursor);
    expect(idx, `section "${expected}" missing or out of order in ${JSON.stringify(present)}`).toBeGreaterThan(-1);
    expect(idx, `section "${expected}" out of order`).toBeGreaterThanOrEqual(cursor);
    cursor = idx;
  }

  // Disclaimer is visible and non-empty (DESIGN §8: always present on Detail).
  const disclaimer = page.getByTestId("section-disclaimer");
  await expect(disclaimer).toBeVisible();
  const disclaimerText = (await disclaimer.textContent())?.trim() ?? "";
  expect(disclaimerText.length).toBeGreaterThan(0);
});
