import { useEffect, useState } from "react";
import QuitModal from "./components/ui/QuitModal";
import MainPage from "./pages/MainPage";
import PlayPage from "./pages/PlayPage";
import type { StoryEngineState } from "./story/storyReducer";
import * as css from "./styles/app.css.ts";

const App = () => {
  const [screen, setScreen] = useState<"main" | "play">("main");
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
    return (
      <div className={css.appRoot}>
        <PlayPage resumeState={playResumeState} onGoHome={handleConfirmQuit} />
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
      onStart={() => {
        setPlayResumeState(null);
        setScreen("play");
      }}
      onContinueWithSave={(entry) => {
        setPlayResumeState(entry.snapshot);
        setScreen("play");
      }}
    />
  );
};

export default App;
