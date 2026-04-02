import { currentStory } from "../story/current";
import {
	actions,
	page,
	primaryButton,
	secondaryButton,
	titleText,
} from "./mainPage.css";

type Props = {
	onStart: () => void;
};

const MainPage = ({ onStart }: Props) => (
	<main className={page}>
		<h1 className={titleText}>{currentStory.title}</h1>
		<div className={actions}>
			<button type="button" className={primaryButton} onClick={onStart}>
				게임 시작하기
			</button>
			<button
				type="button"
				className={secondaryButton}
				onClick={() => window.history.back()}
			>
				종료하기
			</button>
		</div>
	</main>
);

export default MainPage;
