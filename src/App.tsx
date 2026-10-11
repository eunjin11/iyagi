import { useEffect, useState } from "react";
import QuitModal from "./components/ui/QuitModal";
import MainPage from "./pages/MainPage";
import PlayPage from "./pages/PlayPage";
import {
  defaultStoryEntry,
  getStoryEntry,
  storyCatalog,
} from "./story/current";
import type { StoryEngineState } from "./story/storyReducer";
import * as css from "./styles/app.css.ts";

const App = () => {
  const [screen, setScreen] = useState<"main" | "play">("main");
  const [selectedStoryId, setSelectedStoryId] = useState(defaultStoryEntry.id);
  const [playStoryId, setPlayStoryId] = useState(defaultStoryEntry.id);
  const [playResumeState, setPlayResumeState] =
    useState<StoryEngineState | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);

  useEffect(() => {
    if (screen !== "play") return;
    if (typeof window === "undefined") return;

    window.history.pushState({ game: true }, "");

    const handlePopstate = () => setShowQuitModal(true);
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [screen]);

  const handleConfirmQuit = () => {
    setShowQuitModal(false);
    setPlayResumeState(null);
    setScreen("main");
  };

  const handleCancelQuit = () => {
    setShowQuitModal(false);
    window.history.pushState({ game: true }, "");
  };

  if (screen === "play") {
    const playStory = getStoryEntry(playStoryId);
    return (
      <div className={css.appRoot}>
        <PlayPage
          story={playStory.story}
          storyId={playStory.id}
          resumeState={playResumeState}
          onGoHome={handleConfirmQuit}
        />
        {showQuitModal && (
          <QuitModal
            onConfirm={handleConfirmQuit}
            onCancel={handleCancelQuit}
          />
        )}
      </div>
    );
  }
  return (
    <MainPage
      stories={storyCatalog}
      selectedStoryId={selectedStoryId}
      onSelectStory={setSelectedStoryId}
      onStart={() => {
        setPlayStoryId(selectedStoryId);
        setPlayResumeState(null);
        setScreen("play");
      }}
      onContinueWithSave={(entry) => {
        const savedStoryId = entry.storyId ?? defaultStoryEntry.id;
        setPlayStoryId(savedStoryId);
        setSelectedStoryId(savedStoryId);
        setPlayResumeState(entry.snapshot);
        setScreen("play");
      }}
    />
  );
};

export default App;
