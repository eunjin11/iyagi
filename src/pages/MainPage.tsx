import { useState } from "react";
import { LoadSavedOverlay } from "../components/story/LoadSavedOverlay";
import { currentStory } from "../story/current";
import {
  deleteSavedSnapshot,
  listSavedSnapshots,
  type SavedSnapshot,
} from "../story/snapshots";
import * as css from "./mainPage.css.ts";

type Props = {
  onStart: () => void;
  onContinueWithSave: (entry: SavedSnapshot) => void;
};

const MainPage = ({ onStart, onContinueWithSave }: Props) => {
  const [continueOpen, setContinueOpen] = useState(false);

  return (
    <main className={css.page}>
      <h1 className={css.titleText}>{currentStory.title}</h1>
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
        listSaves={listSavedSnapshots}
        onPickSave={onContinueWithSave}
        onDeleteSave={deleteSavedSnapshot}
      />
    </main>
  );
};

export default MainPage;
