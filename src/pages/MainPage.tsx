import { currentStory } from "../story/current";
import * as css from "./mainPage.css.ts";

type Props = {
  onStart: () => void;
};

const MainPage = ({ onStart }: Props) => (
  <main className={css.page}>
    <h1 className={css.titleText}>{currentStory.title}</h1>
    <div className={css.actions}>
      <button type="button" className={css.primaryButton} onClick={onStart}>
        게임 시작하기
      </button>
      <button
        type="button"
        className={css.secondaryButton}
        onClick={() => window.history.back()}
      >
        종료하기
      </button>
    </div>
  </main>
);

export default MainPage;
