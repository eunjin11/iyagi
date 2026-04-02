import { useEffect, useState } from "react";
import QuitModal from "./components/ui/QuitModal";
import MainPage from "./pages/MainPage";
import PlayPage from "./pages/PlayPage";
import * as css from "./styles/app.css.ts";

const App = () => {
  const [screen, setScreen] = useState<"main" | "play">("main");
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
    setScreen("main");
  };

  const handleCancelQuit = () => {
    setShowQuitModal(false);
    window.history.pushState({ game: true }, "");
  };

  if (screen === "play") {
    return (
      <div className={css.appRoot}>
        <PlayPage />
        {showQuitModal && (
          <QuitModal
            onConfirm={handleConfirmQuit}
            onCancel={handleCancelQuit}
          />
        )}
      </div>
    );
  }
  return <MainPage onStart={() => setScreen("play")} />;
};

export default App;
