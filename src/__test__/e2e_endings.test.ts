import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseDSL } from "../parser/parseScene";
import { evalWhen } from "../story/evalWhen";
import type { StoryEngineState } from "../story/storyReducer";
import {
	applyStoryEvent,
	initialEngineState,
	storyReducer,
} from "../story/storyReducer";
import type { Story, VariableBag } from "../story/types";

function demoStorySource(): string {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	return readFileSync(join(__dirname, "../scenarios/demo.iyagi"), "utf-8");
}

function getScene(story: Story, sceneId: string) {
	return story.scenes[sceneId] ?? { id: sceneId, steps: [], choices: [] };
}

function isDoneInScene(story: Story, s: StoryEngineState) {
	const scene = getScene(story, s.sceneId);
	return s.stepIndex >= scene.steps.length;
}

function tickUntilDone(story: Story, s0: StoryEngineState): StoryEngineState {
	let s = s0;
	const maxTicks = 5000;
	for (let i = 0; i < maxTicks; i++) {
		if (isDoneInScene(story, s)) return s;
		const scene = getScene(story, s.sceneId);
		const step = scene.steps[s.stepIndex];
		if (!step) return s;

		if (step.type === "text") {
			s = storyReducer(s, { type: "TAP_ADVANCE" }, story);
			continue;
		}

		s = applyStoryEvent(
			s,
			{ type: "RUN_SCRIPT", context: "step", code: step.code },
			story,
		);
	}
	throw new Error("tickUntilDone: maxTicks exceeded (possible infinite loop)");
}

function enabledChoice(choice: { enabledWhen?: string }, vars: VariableBag) {
	return !choice.enabledWhen || evalWhen(choice.enabledWhen, vars);
}

function chooseByText(
	story: Story,
	s0: StoryEngineState,
	choiceText: string,
): StoryEngineState {
	let s = tickUntilDone(story, s0);
	const scene = getScene(story, s.sceneId);
	const choice = scene.choices.find((c) => c.text === choiceText);
	if (!choice) throw new Error(`choice not found: ${choiceText}`);
	expect(enabledChoice(choice, s.vars)).toBe(true);

	s = applyStoryEvent(
		s,
		{ type: "RUN_SCRIPT", context: "choice", code: choice.script },
		story,
	);
	return s;
}

function expectAtDoneScene(story: Story, s: StoryEngineState, sceneId: string) {
	expect(s.sceneId).toBe(sceneId);
	const scene = getScene(story, sceneId);
	expect(s.stepIndex).toBeGreaterThanOrEqual(scene.steps.length);
}

describe("e2e endings (engine simulation)", () => {
	const parsed = parseDSL(demoStorySource(), { title: "여행", start: "start" });
	expect(parsed.errors).toEqual([]);
	const story = parsed.story;

	it("village -> healer: heal(5)로 hp가 증가", () => {
		let s = initialEngineState(story);
		s = chooseByText(story, s, "마을로 향한다"); // jump village
		s = chooseByText(story, s, "치유사에게 간다"); // jump healer

		s = tickUntilDone(story, s);
		expectAtDoneScene(story, s, "healer");
		expect(s.vars.hp).toBe(15);

		s = chooseByText(story, s, "마을로 돌아간다"); // jump village
		s = tickUntilDone(story, s);
		expectAtDoneScene(story, s, "village");
		expect(s.vars.hp).toBe(15);
	});

	it("scene start -> going_home 엔딩", () => {
		let s = initialEngineState(story);
		s = chooseByText(story, s, "숲으로 들어간다"); // hp -1, jump forest
		s = chooseByText(story, s, "더 깊이 들어간다 (HP-2)"); // hp -2, jump deep
		s = chooseByText(story, s, "금화를 챙긴다"); // gold +10, jump start
		s = chooseByText(story, s, "마을로 향한다"); // jump village
		s = chooseByText(story, s, "빵을 산다"); // gold -1, hp +2, jump going_home

		s = tickUntilDone(story, s);
		expectAtDoneScene(story, s, "going_home");

		// going_home 진입 즉시이므로 텍스트만 진행(변수 변경 없음)
		expect(s.vars.hp).toBe(9);
		expect(s.vars.gold).toBe(9);
	});

	it("scene start -> ending 엔딩", () => {
		let s = initialEngineState(story);
		s = chooseByText(story, s, "마을로 향한다"); // jump village
		s = chooseByText(story, s, "여행을 마치고 집으로 돌아간다"); // jump ending

		s = tickUntilDone(story, s);
		expectAtDoneScene(story, s, "ending");

		// ending 진입 시 추가 스텝/변수 변경 없음
		expect(s.vars.hp).toBe(10);
		expect(s.vars.gold).toBe(0);
	});

	it("scene start -> gameover 엔딩", () => {
		let s = initialEngineState(story);

		// 세 번 deep로 들어가 금화를 챙긴 뒤, 마지막에 hp를 0으로 만들어 gameover로 점프한다.
		for (let i = 0; i < 3; i++) {
			s = chooseByText(story, s, "숲으로 들어간다"); // hp -1, jump forest
			s = chooseByText(story, s, "더 깊이 들어간다 (HP-2)"); // hp -2, jump deep
			s = chooseByText(story, s, "금화를 챙긴다"); // gold +10, jump start
		}

		// hp: 1 -> start에서 숲 선택 시 hp 0, forest의 첫 스크립트가 gameover로 이동
		s = chooseByText(story, s, "숲으로 들어간다");
		s = tickUntilDone(story, s);
		expectAtDoneScene(story, s, "gameover");

		expect(s.vars.hp).toBe(0);
		expect(s.vars.gold).toBe(30);
	});
});
