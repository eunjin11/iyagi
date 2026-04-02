import { expect, type Page } from "@playwright/test";

import { test } from "./fixtures";

async function startGame(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작하기" }).click();
}

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "menu" }).click();
  await expect(page.getByRole("dialog", { name: "menu" })).toBeVisible();
}

async function closeMenu(page: Page) {
  await page.getByRole("button", { name: "close-menu" }).click();
  await expect(page.getByRole("dialog", { name: "menu" })).not.toBeVisible();
}

async function advanceStoryPanelN(page: Page, n: number) {
  const storyPanel = page.getByRole("button", { name: "story" });
  for (let i = 0; i < n; i++) {
    await storyPanel.click();
  }
}

test.describe("e2e: snapshots menu", () => {
  test("저장 -> 진행 -> 불러오기(SET_SNAPSHOT)로 복원", async ({ page }) => {
    await startGame(page);

    await expect(page.getByRole("heading", { name: "여행" })).toBeVisible();
    const storyPanel = page.getByRole("button", { name: "story" });
    await expect(
      storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
    ).toBeVisible();

    // 저장(초기 start/stepIndex=0 시점)
    await openMenu(page);
    await page.getByRole("button", { name: "저장하기" }).click();
    await page.getByRole("button", { name: "불러오기" }).click();
    await expect(page.getByRole("dialog", { name: "불러오기" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "여행자는 하얀 길목에 서 있다." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "back-to-menu" }).click();
    await closeMenu(page);

    // 다른 시점으로 진행 (start 텍스트 2개 -> choices -> forest)
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "숲으로 들어간다" }).click();
    await expect(
      storyPanel.getByText("숲은 조용하다. 나뭇잎이 속삭인다."),
    ).toBeVisible();

    // 불러오기 후 초기 텍스트로 복원
    await openMenu(page);
    await page.getByRole("button", { name: "불러오기" }).click();
    await page
      .getByRole("button", { name: "여행자는 하얀 길목에 서 있다." })
      .click();
    // 불러오기 항목 클릭 시 GameMenu가 onLoad 뒤 메뉴 전체를 닫음 (close-menu 없음)
    await expect(page.getByRole("dialog", { name: "menu" })).not.toBeVisible();

    await expect(
      storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
    ).toBeVisible();
  });
});
