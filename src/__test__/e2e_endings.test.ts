import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

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

function isDoneInScene(_story: Story, s: StoryEngineState) {
  if (s.stepQueue.length === 0) return true;
  return s.stepQueue[0]?.type === "choices";
}

function tickUntilDone(story: Story, s0: StoryEngineState): StoryEngineState {
  let s = s0;
  const maxTicks = 5000;
  for (let i = 0; i < maxTicks; i++) {
    if (isDoneInScene(story, s)) return s;
    const step = s.stepQueue[0];
    if (!step) return s;

    if (step.type === "text") {
      s = storyReducer(s, { type: "TAP_ADVANCE" }, story);
      continue;
    }
    if (step.type === "script") {
      s = applyStoryEvent(s, { type: "RUN_SCRIPT", code: step.code }, story);
      continue;
    }
    return s;
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
  const choicesStep = s.stepQueue[0];
  if (!choicesStep || choicesStep.type !== "choices")
    throw new Error(`not at choices step in scene ${s.sceneId}`);
  const choice = choicesStep.choices.find((c) => c.text === choiceText);
  if (!choice) throw new Error(`choice not found: ${choiceText}`);
  expect(enabledChoice(choice, s.vars)).toBe(true);

  s = applyStoryEvent(s, { type: "CHOOSE", choice }, story);
  return s;
}

function expectAtDoneScene(
  _story: Story,
  s: StoryEngineState,
  sceneId: string,
) {
  expect(s.sceneId).toBe(sceneId);
  // "done" = empty queue or waiting at a choices step
  const done = s.stepQueue.length === 0 || s.stepQueue[0]?.type === "choices";
  expect(done).toBe(true);
}

describe("e2e endings (engine simulation)", () => {
  const parsed = parseDSL(demoStorySource(), { start: "start" });
  expect(parsed.errors).toEqual([]);
  const story = parsed.story;

  afterEach(() => vi.restoreAllMocks());

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
    // 전투에서 항상 히트: 플레이어 2dmg, 적 1dmg
    vi.spyOn(Math, "random").mockReturnValue(0);

    let s = initialEngineState(story);
    s = chooseByText(story, s, "숲으로 들어간다"); // hp 10→9
    s = chooseByText(story, s, "더 깊이 들어간다 (HP-2)"); // hp 9→7
    s = chooseByText(story, s, "금화를 챙긴다"); // gold +10, → after_gold → battle
    // battle: hp=7, enemyHp=10, 항상 히트
    // 5라운드: enemyHp 10→8→6→4→2→0, hp 7→6→5→4→3→2
    for (let i = 0; i < 5; i++) {
      s = chooseByText(story, s, "전투하기");
    }
    // battle 재진입: enemyHp=0 → battle_win
    s = chooseByText(story, s, "마을로 돌아가자"); // battle_win → village
    s = chooseByText(story, s, "빵을 산다"); // gold 10→9, hp 2+2=4, → going_home

    s = tickUntilDone(story, s);
    expectAtDoneScene(story, s, "going_home");

    expect(s.vars.hp).toBe(4);
    expect(s.vars.gold).toBe(19); // after_gold(+10) + battle_win(+10) - bread(-1)
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
    // 플레이어 항상 미스(0.8 ≥ 0.7), 적 항상 히트(0.0 < 0.7) 교대
    let callCount = 0;
    vi.spyOn(Math, "random").mockImplementation(() =>
      callCount++ % 2 === 0 ? 0.8 : 0.0,
    );

    let s = initialEngineState(story);
    s = chooseByText(story, s, "숲으로 들어간다"); // hp 10→9
    s = chooseByText(story, s, "더 깊이 들어간다 (HP-2)"); // hp 9→7
    s = chooseByText(story, s, "금화를 챙긴다"); // gold +10, → after_gold → battle
    // battle: hp=7, 적만 히트 → 7라운드 후 hp=0
    for (let i = 0; i < 7; i++) {
      s = chooseByText(story, s, "전투하기");
    }
    s = tickUntilDone(story, s); // battle 재진입: hp=0 → gameover
    expectAtDoneScene(story, s, "gameover");

    expect(s.vars.hp).toBe(0);
    expect(s.vars.gold).toBe(10);
  });
});
