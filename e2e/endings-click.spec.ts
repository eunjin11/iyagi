import { expect, type Page, test } from "@playwright/test";

async function advanceStoryPanelN(page: Page, n: number) {
	const storyPanel = page.getByRole("button", { name: "story" });
	for (let i = 0; i < n; i++) {
		await storyPanel.click();
	}
}

test.describe("e2e: click-through endings", () => {
	test("start -> going_home", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Demo" })).toBeVisible();
		const storyPanel = page.getByRole("button", { name: "story" });

		// start: 텍스트 2개 -> choices가 나오도록 2번 advance
		await expect(
			storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
		).toBeVisible();
		await advanceStoryPanelN(page, 2);
		await page.getByRole("button", { name: "숲으로 들어간다" }).click();

		// forest: script 실행 후 텍스트 2개 -> choices 나오도록 2번 advance
		await expect(
			storyPanel.getByText("숲은 조용하다. 나뭇잎이 속삭인다."),
		).toBeVisible();
		await advanceStoryPanelN(page, 2);
		await page.getByRole("button", { name: "더 깊이 들어간다 (HP-2)" }).click();

		// deep: 텍스트 2개 -> choices 나오도록 2번 advance -> 금화 선택
		await expect(
			storyPanel.getByText("어둠 속에서 금빛이 번뜩인다."),
		).toBeVisible();
		await advanceStoryPanelN(page, 2);
		await page.getByRole("button", { name: "금화를 챙긴다" }).click();

		// start -> village
		await expect(
			storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
		).toBeVisible();
		await advanceStoryPanelN(page, 2);
		await page.getByRole("button", { name: "마을로 향한다" }).click();

		// village: 텍스트 2개 -> choices 나오도록 2번 advance -> 빵 선택
		await expect(
			storyPanel.getByText("마을은 평화롭다. 장터가 북적인다."),
		).toBeVisible();
		await advanceStoryPanelN(page, 2);
		await page.getByRole("button", { name: "빵을 산다" }).click();

		// going_home: 첫 줄이 바로 보이면 충분
		await expect(
			storyPanel.getByText("맛있는 빵을 먹고 여행을 마치고 집으로 돌아간다."),
		).toBeVisible();
	});

	test("start -> ending", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Demo" })).toBeVisible();
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
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "Demo" })).toBeVisible();
		const storyPanel = page.getByRole("button", { name: "story" });

		for (let cycle = 0; cycle < 3; cycle++) {
			// start -> forest
			await expect(
				storyPanel.getByText("여행자는 하얀 길목에 서 있다."),
			).toBeVisible();
			await advanceStoryPanelN(page, 2);
			await page.getByRole("button", { name: "숲으로 들어간다" }).click();

			// forest -> deep (hp -2 added)
			await expect(
				storyPanel.getByText("숲은 조용하다. 나뭇잎이 속삭인다."),
			).toBeVisible();
			await advanceStoryPanelN(page, 2);
			await page
				.getByRole("button", { name: "더 깊이 들어간다 (HP-2)" })
				.click();

			// deep -> start (gold choice; hp change 없음)
			await expect(
				storyPanel.getByText("어둠 속에서 금빛이 번뜩인다."),
			).toBeVisible();
			await advanceStoryPanelN(page, 2);
			await page.getByRole("button", { name: "금화를 챙긴다" }).click();
		}

		// 4번째 start->forest에서 hp가 0이 되며 forest 진입 스크립트가 gameover로 점프
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
