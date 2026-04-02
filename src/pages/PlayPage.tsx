import { DebugOverlay } from "../components/dev/DebugOverlay";
import { ChoiceList } from "../components/story/ChoiceList";
import { GameMenu } from "../components/story/GameMenu";
import { StoryLogPanel } from "../components/story/StoryLogPanel";
import { StoryPanel } from "../components/story/StoryPanel";
import { useStoryEngine } from "../hooks/useStoryEngine";
import { currentStory } from "../story/current";
import type { StoryEngineState } from "../story/storyReducer";
import { interpolateVars } from "../utils/interpolateVars";
import * as css from "./playPage.css.ts";

type Props = {
  resumeState?: StoryEngineState | null;
};

const PlayPage = ({ resumeState = null }: Props) => {
  const { play, saves } = useStoryEngine(currentStory, resumeState);
  const {
    story,
    currentStep,
    pastTexts,
    isDone,
    choices,
    vars,
    storyLog,
    advance,
    choose,
  } = play;
  const { save, listSaves, load, deleteSave } = saves;

  const isDev = import.meta.env.DEV === true;
  const canAdvance = Boolean(currentStep);
  const interpolate = (src: string) => interpolateVars(src, vars);

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

      <main className={css.content}>
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
            isDone={isDone}
            choices={choices}
            vars={vars}
            onChoose={choose}
            className={css.actionRow}
            buttonClassName={css.actionButton}
          />
        </div>

        {isDone && choices.length === 0 && (
          <section className={css.card} aria-label="ending">
            <div style={{ opacity: 0.6, textAlign: "center" }}>— END —</div>
          </section>
        )}

        <div className={css.logTriggerRow}>
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
