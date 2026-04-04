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

/** 전투 씬에 특정 vars로 직접 진입하는 상태 생성 */
function battleState(
  story: Story,
  hp: number,
  enemyHp: number,
  gold = 0,
): StoryEngineState {
  return {
    sceneId: "battle",
    stepQueue: [...(story.scenes.battle?.steps ?? [])],
    pastTexts: [],
    vars: { ...story.init, hp, enemyHp, gold },
    storyLog: [{ kind: "enterScene", sceneId: "battle" }],
  };
}

describe("battle system", () => {
  const parsed = parseDSL(demoStorySource(), { start: "start" });
  expect(parsed.errors).toEqual([]);
  const story = parsed.story;

  afterEach(() => vi.restoreAllMocks());

  it("항상 히트: 5라운드 후 플레이어 승리 → battle_win", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 0 < 0.7 → 항상 히트

    let s = battleState(story, 10, 10);
    // 5라운드: enemyHp 10→8→6→4→2→0, hp 10→9→8→7→6→5
    for (let i = 0; i < 5; i++) {
      s = chooseByText(story, s, "전투하기");
    }
    s = tickUntilDone(story, s); // battle 재진입: enemyHp=0 → battle_win
    expectAtDoneScene(story, s, "battle_win");
    expect(s.vars.hp).toBe(5);
    expect(s.vars.enemyHp).toBe(0);
  });

  it("플레이어 항상 미스·적 항상 히트: 10라운드 후 gameover", () => {
    let callCount = 0;
    // rollAttack 호출 순서: 플레이어(miss) → 적(hit) → 반복
    vi.spyOn(Math, "random").mockImplementation(() =>
      callCount++ % 2 === 0 ? 0.8 : 0.0,
    );

    let s = battleState(story, 10, 10);
    // 10라운드: hp 10→0, enemyHp 변화 없음
    for (let i = 0; i < 10; i++) {
      s = chooseByText(story, s, "전투하기");
    }
    s = tickUntilDone(story, s); // battle 재진입: hp=0 → gameover
    expectAtDoneScene(story, s, "gameover");
    expect(s.vars.hp).toBe(0);
    expect(s.vars.enemyHp).toBe(10); // 한 번도 맞지 않음
  });

  it("도망치기 → after_run → village 도달", () => {
    let s = battleState(story, 10, 10);
    s = chooseByText(story, s, "도망치기"); // → after_run
    s = chooseByText(story, s, "마을로 돌아가자"); // after_run → village
    s = tickUntilDone(story, s);
    expectAtDoneScene(story, s, "village");
  });

  it("양쪽 동시 hp=0 → hp 체크 우선 → gameover", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 항상 히트

    let s = battleState(story, 1, 1);
    // 1라운드: enemyHp 1→-1(≤0), hp 1→0
    s = chooseByText(story, s, "전투하기");
    s = tickUntilDone(story, s); // battle 재진입: if(hp<=0) 먼저 → gameover
    expectAtDoneScene(story, s, "gameover");
  });

  it("after_gold 진입 시 enemyHp가 10으로 리셋됨", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 항상 히트 (전투 통과용)

    let s = initialEngineState(story);
    s = chooseByText(story, s, "숲으로 들어간다");
    s = chooseByText(story, s, "더 깊이 들어간다 (HP-2)");
    s = chooseByText(story, s, "금화를 챙긴다"); // → after_gold: setEnemyHp(10) → battle
    s = tickUntilDone(story, s); // battle 도달
    expect(s.vars.enemyHp).toBe(10);
  });
});
