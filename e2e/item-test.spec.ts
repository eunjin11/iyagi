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
    story.getByText(`열쇠 보유 검사: ${owned}`, { exact: true }),
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

test("아이템 스토리: 저장 후 소비한 인벤토리와 HP·사용 동작 복원", async ({
  page,
}) => {
  await startItems(page);
  await page.getByRole("button", { name: "금화와 회복 물약을 챙긴다" }).click();
  await advance(page, 2);
  await page
    .getByRole("button", { name: "회복 물약을 하나 더 챙긴다" })
    .click();
  await advance(page, 2);
  await page.getByRole("button", { name: "menu", exact: true }).click();
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
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

  async function loadInventorySave() {
    await page.getByRole("button", { name: "menu", exact: true }).click();
    await page.getByRole("button", { name: "불러오기", exact: true }).click();
    await page
      .getByRole("button", { name: "금화와 회복 물약을 챙겼다.", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "불러오기", exact: true }),
    ).toHaveCount(0);
  }

  await loadInventorySave();
  await page.getByRole("button", { name: "menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "금화 주머니", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "회복 물약 2개", exact: true })
    .click();
  await expect(
    page.getByText("사용하면 체력을 3 회복한다.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "사용", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "close-menu" }).click();
  await page.getByRole("button", { name: "테스트를 끝낸다" }).click();
  await advance(page, 1);
  await expect(
    page.getByText("현재 HP: 3 / 금화: 10", { exact: true }),
  ).toBeVisible();

  await loadInventorySave();
  await page.getByRole("button", { name: "menu", exact: true }).click();
  await page
    .getByRole("button", { name: "회복 물약 2개", exact: true })
    .click();
  await page.getByRole("button", { name: "사용", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "회복 물약", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "close-menu" }).click();
  await page.getByRole("button", { name: "테스트를 끝낸다" }).click();
  await advance(page, 1);
  await expect(
    page.getByText("현재 HP: 6 / 금화: 10", { exact: true }),
  ).toBeVisible();
});

test.describe("아이템 툴팁 터치", () => {
  test.use({ hasTouch: true, viewport: { width: 740, height: 1000 } });

  test("아이템 툴팁: 빈 슬롯과 메뉴 터치로 닫고 내부 터치는 유지", async ({
    page,
  }) => {
    await startItems(page);
    await page.getByRole("button", { name: "금화와 회복 물약을 챙긴다" }).tap();
    await advance(page, 2);
    await page.getByRole("button", { name: "menu", exact: true }).tap();
    const potion = page.getByRole("button", { name: "회복 물약", exact: true });
    const details = page.getByRole("region", {
      name: "회복 물약",
      exact: true,
    });
    await potion.tap();
    await expect(details).toBeVisible();
    await details
      .getByText("사용하면 체력을 3 회복한다.", { exact: true })
      .tap();
    await expect(details).toBeVisible();
    await page
      .getByRole("list", { name: "인벤토리 아이템" })
      .locator("li")
      .last()
      .tap();
    await expect(details).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "menu", exact: true }),
    ).toBeVisible();
    await potion.tap();
    await expect(details).toBeVisible();
    const grid = await page
      .getByRole("list", { name: "인벤토리 아이템" })
      .boundingBox();
    if (!grid) throw new Error("인벤토리 그리드를 찾을 수 없습니다.");
    await page.touchscreen.tap(
      grid.x + grid.width / 2,
      grid.y + grid.height + 12,
    );
    await expect(details).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "menu", exact: true }),
    ).toBeVisible();
    await potion.tap();
    await expect(details).toBeVisible();
    await page.getByRole("heading", { name: "인벤토리", exact: true }).tap();
    await expect(details).toHaveCount(0);
  });
});
