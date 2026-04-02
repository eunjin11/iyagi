import { useEffect, useRef } from "react";

type Props = {
	pastTexts: string[];
	currentText: string | null;
	canAdvance: boolean;
	onAdvance: () => void;
	interpolate: (src: string) => string;
	className: string;
};

export const StoryPanel = ({
	pastTexts,
	currentText,
	canAdvance,
	onAdvance,
	interpolate,
	className,
}: Props) => {
	const storyPanelRef = useRef<HTMLElement>(null);

	useEffect(() => {
		if (pastTexts.length === 0 && !currentText) return;
		const el = storyPanelRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [pastTexts.length, currentText]);

	if (pastTexts.length === 0 && !currentText) return null;

	return (
		<section
			ref={storyPanelRef}
			className={className}
			aria-label="story"
			onClick={canAdvance ? onAdvance : undefined}
			onKeyDown={(e) => {
				if (!canAdvance) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onAdvance();
				}
			}}
			tabIndex={canAdvance ? 0 : undefined}
			role={canAdvance ? "button" : undefined}
			style={{ cursor: canAdvance ? "pointer" : "default" }}
		>
			{pastTexts.map((t) => (
				<div
					key={t}
					style={{
						whiteSpace: "pre-wrap",
						marginBottom: "0.75em",
						opacity: 0.5,
					}}
				>
					{interpolate(t)}
				</div>
			))}
			{currentText && (
				<div style={{ whiteSpace: "pre-wrap" }}>{interpolate(currentText)}</div>
			)}
		</section>
	);
};
