import { useState } from "react";
import { DebugOverlay } from "../components/dev/DebugOverlay";
import { LoadSavedOverlay } from "../components/story/LoadSavedOverlay";
import { defaultStoryEntry, type StoryEntry } from "../story/current";
import {
  deleteSavedSnapshot,
  listSavedSnapshots,
  type SavedSnapshot,
} from "../story/snapshots";
import * as css from "./mainPage.css.ts";

type Props = {
  stories: StoryEntry[];
  selectedStoryId: string;
  onSelectStory: (id: string) => void;
  onStart: () => void;
  onContinueWithSave: (entry: SavedSnapshot) => void;
};

const MainPage = ({
  stories,
  selectedStoryId,
  onSelectStory,
  onStart,
  onContinueWithSave,
}: Props) => {
  const [continueOpen, setContinueOpen] = useState(false);
  const isDev = import.meta.env.DEV === true;
  const selected =
    stories.find((entry) => entry.id === selectedStoryId) ?? stories[0];
  if (!selected) return null;

  return (
    <main className={css.page}>
      <h1 className={css.titleText}>{selected.story.title}</h1>
      {stories.length > 1 && !isDev && (
        <label className={css.storyPicker}>
          <span>스토리 선택</span>
          <select
            className={css.storySelect}
            value={selected.id}
            onChange={(event) => onSelectStory(event.target.value)}
          >
            {stories.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.story.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={css.actions}>
        <button type="button" className={css.primaryButton} onClick={onStart}>
          게임 시작하기
        </button>
        <button
          type="button"
          className={css.secondaryButton}
          onClick={() => setContinueOpen(true)}
        >
          이어하기
        </button>
        <button
          type="button"
          className={css.secondaryButton}
          onClick={() => window.history.back()}
        >
          종료하기
        </button>
      </div>

      <LoadSavedOverlay
        open={continueOpen}
        onDismiss={() => setContinueOpen(false)}
        title="이어하기"
        listSaves={() =>
          listSavedSnapshots().filter(
            (entry) =>
              (entry.storyId ?? defaultStoryEntry.id) === selectedStoryId,
          )
        }
        onPickSave={onContinueWithSave}
        onDeleteSave={deleteSavedSnapshot}
      />
      <DebugOverlay isDev={isDev}>
        <label className={css.debugStoryPicker}>
          <span>iyagi 스토리</span>
          <select
            className={css.debugStorySelect}
            value={selected.id}
            onChange={(event) => onSelectStory(event.target.value)}
          >
            {stories.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.id} · {entry.story.title}
              </option>
            ))}
          </select>
        </label>
      </DebugOverlay>
    </main>
  );
};

export default MainPage;
