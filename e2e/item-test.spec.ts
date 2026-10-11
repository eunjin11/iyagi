import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function advance(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.getByRole("button", { name: "story", exact: true }).click();
  }
}

async function startItems(page: Page) {
  await page.goto("/");
  await page.getByRole("combobox").selectOption("item-test");
  await page.getByRole("button", { name: "게임 시작하기" }).click();
  await expect(
    page.getByRole("heading", { name: "아이템 테스트", exact: true }),
  ).toBeVisible();
  await advance(page, 2);
}

async function checkKey(page: Page, owned: boolean) {
  const story = page.locator('[aria-label="story"]');
  await expect(
    story.getByText(`스크립트의 열쇠 보유 검사: ${owned}`, { exact: true }),
  ).toBeVisible();
  await advance(page, 1);
  await expect(
    story.getByText(
      owned
        ? "열쇠가 있다. 잠긴 문을 열 수 있다."
        : "열쇠가 없다. 먼저 열쇠를 챙기자.",
      { exact: true },
    ),
  ).toBeVisible();
  await advance(page, 1);
  const pickup = page.getByRole("button", {
    name: "열쇠를 챙긴다",
    exact: true,
  });
  const open = page.getByRole("button", {
    name: "열쇠로 문을 연다",
    exact: true,
  });
  const drop = page.getByRole("button", { name: "열쇠를 버린다", exact: true });
  if (owned) {
    await expect(pickup).toBeDisabled();
    await expect(open).toBeEnabled();
    await expect(drop).toBeEnabled();
  } else {
    await expect(pickup).toBeEnabled();
    await expect(open).toBeDisabled();
    await expect(drop).toBeDisabled();
  }
}

test("아이템 스토리: hasItem 스크립트·if·선택지와 열쇠 버리기", async ({
  page,
}) => {
  await startItems(page);
  await page.getByRole("button", { name: "열쇠 조건을 테스트한다" }).click();
  await checkKey(page, false);
  await page
    .getByRole("button", { name: "열쇠를 챙긴다", exact: true })
    .click();
  await checkKey(page, true);
  await page
    .getByRole("button", { name: "열쇠로 문을 연다", exact: true })
    .click();
  await expect(
    page.getByText("열쇠로 잠긴 문을 열었다.", { exact: true }),
  ).toBeVisible();
  await advance(page, 1);
  await page.getByRole("button", { name: "열쇠 테스트로 돌아간다" }).click();
  await checkKey(page, true);
  await page
    .getByRole("button", { name: "열쇠를 버린다", exact: true })
    .click();
  await checkKey(page, false);
  await page
    .getByRole("button", { name: "열쇠를 챙긴다", exact: true })
    .click();
  await checkKey(page, true);
  await page.getByRole("button", { name: "menu", exact: true }).click();
  await page.getByRole("button", { name: "낡은 열쇠", exact: true }).click();
  await page.getByRole("button", { name: "버리기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "낡은 열쇠", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "close-menu" }).click();
  await expect(
    page.getByRole("button", { name: "열쇠로 문을 연다", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "열쇠를 챙긴다", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "열쇠 보유 상태를 다시 확인한다" })
    .click();
  await checkKey(page, false);
});

test("아이템 스토리: 물약 사용으로 HP 회복 및 버리기", async ({ page }) => {
  await startItems(page);
  await page.getByRole("button", { name: "금화와 회복 물약을 챙긴다" }).click();
  await advance(page, 2);
  await page
    .getByRole("button", { name: "회복 물약을 하나 더 챙긴다" })
    .click();
  await advance(page, 2);
  await page.getByRole("button", { name: "menu", exact: true }).click();
  await page
    .getByRole("button", { name: "회복 물약 2개", exact: true })
    .click();
  await page.getByRole("button", { name: "사용", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "회복 물약", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "버리기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "회복 물약", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "close-menu" }).click();
  await page.getByRole("button", { name: "테스트를 끝낸다" }).click();
  await advance(page, 1);
  await expect(
    page.getByText("현재 HP: 6 / 금화: 10", { exact: true }),
  ).toBeVisible();
});
