import { DebugOverlay } from "../components/dev/DebugOverlay";
import { ChoiceList } from "../components/story/ChoiceList";
import { StoryLogPanel } from "../components/story/StoryLogPanel";
import { StoryPanel } from "../components/story/StoryPanel";
import { currentStory } from "../story/current";
import { useStoryEngine } from "../story/engine";
import { interpolateVars } from "../utils/interpolateVars";
import {
	actionButton,
	actionRow,
	card,
	content,
	header,
	logTriggerRow,
	title,
} from "./playPage.css";

const PlayPage = () => {
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
	} = useStoryEngine(currentStory);

	const isDev = import.meta.env.DEV === true;
	const canAdvance = Boolean(currentStep);
	const interpolate = (src: string) => interpolateVars(src, vars);

	return (
		<>
			<header className={header}>
				<h1 className={title}>{story.title}</h1>
			</header>

			<main className={content}>
				<StoryPanel
					className={card}
					pastTexts={pastTexts}
					currentText={currentStep?.content ?? null}
					canAdvance={canAdvance}
					onAdvance={advance}
					interpolate={interpolate}
				/>

				<ChoiceList
					isDone={isDone}
					choices={choices}
					vars={vars}
					onChoose={choose}
					className={actionRow}
					buttonClassName={actionButton}
				/>

				{isDone && choices.length === 0 && (
					<section className={card} aria-label="ending">
						<div style={{ opacity: 0.6, textAlign: "center" }}>— END —</div>
					</section>
				)}

				<div className={logTriggerRow}>
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
