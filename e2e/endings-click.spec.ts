import { expect, type Page } from "@playwright/test";

import { test } from "./fixtures";

async function startGame(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작하기" }).click();
}

async function advanceStoryPanelN(page: Page, n: number) {
  const storyPanel = page.getByRole("button", { name: "story" });
  for (let i = 0; i < n; i++) {
    await storyPanel.click();
  }
}

test.describe("e2e: click-through endings", () => {
  test("start -> going_home", async ({ page }) => {
    await startGame(page);
    await expect(page.getByRole("heading", { name: "여행" })).toBeVisible();
    const storyPanel = page.getByRole("button", { name: "story" });

    // start: 텍스트 2개 → choices
    await expect(
      storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "숲으로 들어간다" }).click();

    // forest: 스크립트 자동실행 후 텍스트 2개 → choices
    await expect(
      storyPanel.getByText("숲은 조용하다. 나뭇잎이 속삭인다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "더 깊이 들어간다 (HP-2)" }).click();

    // deep: 텍스트 2개 → choices
    await expect(
      storyPanel.getByText("어둠 속에서 금빛이 번뜩인다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "금화를 챙긴다" }).click();

    // after_gold: 텍스트 2개 → 스크립트 자동실행 → battle 진입
    await expect(
      storyPanel.getByText("금화와 회복 물약을 챙겼다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);

    // battle: 스크립트 자동실행 후 텍스트 2개 → choices
    await expect(storyPanel.getByText("괴한과 대치 중이다.")).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "도망치기" }).click();

    // after_run: 텍스트 2개 → choices
    await expect(storyPanel.getByText("도망쳤다.")).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "마을로 돌아가자" }).click();

    // village: 텍스트 2개 → choices (gold=10 → 빵 구매 가능)
    await expect(
      storyPanel.getByText("마을은 평화롭다. 장터가 북적인다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "빵을 산다" }).click();

    // going_home: 첫 줄 확인
    await expect(
      storyPanel.getByText("맛있는 빵을 먹고 여행을 마치고 집으로 돌아간다."),
    ).toBeVisible();
  });

  test("start -> ending", async ({ page }) => {
    await startGame(page);
    await expect(page.getByRole("heading", { name: "여행" })).toBeVisible();
    const storyPanel = page.getByRole("button", { name: "story" });

    await expect(
      storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "마을로 향한다" }).click();

    await expect(
      storyPanel.getByText("마을은 평화롭다. 장터가 북적인다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page
      .getByRole("button", { name: "여행을 마치고 집으로 돌아간다" })
      .click();

    // ending은 텍스트 3개; 2번 advance하면 "즐거운 여행이었다."가 currentStep으로 나옴
    await expect(storyPanel.getByText("여행은 끝났다.")).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await expect(storyPanel.getByText("즐거운 여행이었다.")).toBeVisible();
  });

  test("start -> gameover", async ({ page }) => {
    // 결정론적 gameover 경로:
    // 매 사이클: 숲 진입(-1hp) → 깊이(-2hp) → 금화 → battle flee → village → 처음으로
    // 사이클당 순 -3hp, set("hp",5) 없음 → 3사이클 후 hp=1, 4번째 숲 진입 시 hp=0 → gameover
    await startGame(page);
    const storyPanel = page.getByRole("button", { name: "story" });

    for (let cycle = 0; cycle < 3; cycle++) {
      // start → forest (hp -1)
      await expect(
        storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
      ).toBeVisible();
      await advanceStoryPanelN(page, 2);
      await page.getByRole("button", { name: "숲으로 들어간다" }).click();

      // forest → deep (hp -2)
      await expect(
        storyPanel.getByText("숲은 조용하다. 나뭇잎이 속삭인다."),
      ).toBeVisible();
      await advanceStoryPanelN(page, 2);
      await page
        .getByRole("button", { name: "더 깊이 들어간다 (HP-2)" })
        .click();

      // deep → after_gold → battle
      await expect(
        storyPanel.getByText("어둠 속에서 금빛이 번뜩인다."),
      ).toBeVisible();
      await advanceStoryPanelN(page, 2);
      await page.getByRole("button", { name: "금화를 챙긴다" }).click();

      // after_gold: 2 texts → battle 진입
      await expect(
        storyPanel.getByText("금화와 회복 물약을 챙겼다."),
      ).toBeVisible();
      await advanceStoryPanelN(page, 2);

      // battle: 2 texts → flee (hp 변화 없음)
      await expect(storyPanel.getByText("괴한과 대치 중이다.")).toBeVisible();
      await advanceStoryPanelN(page, 2);
      await page.getByRole("button", { name: "도망치기" }).click();

      // after_run → village
      await expect(storyPanel.getByText("도망쳤다.")).toBeVisible();
      await advanceStoryPanelN(page, 2);
      await page.getByRole("button", { name: "마을로 돌아가자" }).click();

      // village → start (다시 길로)
      await expect(
        storyPanel.getByText("마을은 평화롭다. 장터가 북적인다."),
      ).toBeVisible();
      await advanceStoryPanelN(page, 2);
      await page.getByRole("button", { name: "다시 길로 나온다" }).click();
    }

    // 4번째 숲 진입: hp=1→0 → forest 진입 스크립트 gameover
    await expect(
      storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
    ).toBeVisible();
    await advanceStoryPanelN(page, 2);
    await page.getByRole("button", { name: "숲으로 들어간다" }).click();

    await expect(
      storyPanel.getByText("여행자는 쓰러졌다. 이야기는 여기서 끝난다."),
    ).toBeVisible();
  });
});
