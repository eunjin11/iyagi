import { useEffect, useRef, useState } from "react";
import { DebugOverlay } from "../components/dev/DebugOverlay";
import { ChoiceList } from "../components/story/ChoiceList";
import { GameMenu } from "../components/story/GameMenu";
import { StoryLogPanel } from "../components/story/StoryLogPanel";
import { StoryPanel } from "../components/story/StoryPanel";
import { useStoryEngine } from "../hooks/useStoryEngine";
import type { StoryEngineState } from "../story/storyReducer";
import type { Story } from "../story/types";
import { interpolateVars } from "../utils/interpolateVars";
import * as css from "./playPage.css.ts";

type Props = {
  story: Story;
  storyId: string;
  resumeState?: StoryEngineState | null;
  onGoHome?: () => void;
};

const PlayPage = ({ story, storyId, resumeState = null, onGoHome }: Props) => {
  const { play, saves } = useStoryEngine(story, resumeState, storyId);
  const {
    currentStep,
    pastTexts,
    isDone,
    choices,
    vars,
    localVars,
    storyLog,
    advance,
    choose,
  } = play;
  const { save, listSaves, load, deleteSave } = saves;

  const isDev = import.meta.env.DEV === true;
  const canAdvance = Boolean(currentStep);
  const interpolate = (src: string) => interpolateVars(src, vars);

  // 화면 흔들림 효과: rollAttack 히트 시 vars._shakeTick 증가 → CSS 애니메이션 트리거
  const shakeTickRef = useRef<number | null>(null);
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    const tick = Number(vars._shakeTick) || 0;
    if (shakeTickRef.current === null) {
      // 초기 렌더 or 세이브 로드 시 — 흔들림 없이 기준값만 기록
      shakeTickRef.current = tick;
      return;
    }
    if (tick > shakeTickRef.current) {
      shakeTickRef.current = tick;
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 350);
      return () => clearTimeout(t);
    }
    shakeTickRef.current = tick;
  }, [vars._shakeTick]);

  return (
    <>
      <header className={css.header}>
        <div style={{ width: 44 }} aria-hidden />
        <h1 className={css.title}>{story.title}</h1>
        <GameMenu
          onSave={save}
          listSaves={listSaves}
          onLoad={load}
          onDeleteSave={deleteSave}
        />
      </header>

      <main className={`${css.content}${shaking ? ` ${css.shakeActive}` : ""}`}>
        <StoryPanel
          className={css.card}
          pastTexts={pastTexts}
          currentText={currentStep?.content ?? null}
          canAdvance={canAdvance}
          onAdvance={advance}
          interpolate={interpolate}
        />

        <div className={css.choiceSlot}>
          <ChoiceList
            choices={choices}
            vars={{ ...vars, ...localVars }}
            onChoose={choose}
            className={css.actionRow}
            buttonClassName={css.actionButton}
          />
        </div>

        {isDone && choices.length === 0 && (
          <section className={css.card} aria-label="ending">
            <div style={{ opacity: 0.6, textAlign: "center" }}>— END —</div>
            {onGoHome && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className={css.actionButton}
                  onClick={onGoHome}
                >
                  메인화면으로 돌아가기
                </button>
              </div>
            )}
          </section>
        )}

        <div className={css.logTriggerBar}>
          <StoryLogPanel
            storyLog={storyLog}
            isDev={isDev}
            interpolate={interpolate}
          />
        </div>
      </main>

      <DebugOverlay isDev={isDev} vars={vars} />
    </>
  );
};

export default PlayPage;
