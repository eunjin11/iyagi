import type React from "react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { currentStory } from "./story/current";
import { useStoryEngine } from "./story/engine";
import { evalWhen } from "./story/evalWhen";
import type { StoryLogEntry } from "./story/storyLog";
import type { StoryEngineState } from "./story/storyReducer";
import {
	actionButton,
	actionRow,
	card,
	content,
	header,
	title,
} from "./styles/app.css";

type SceneNavState = {
	navId: number;
	snapshot: {
		engine: StoryEngineState;
		storyLog: StoryLogEntry[];
	};
};

function isSceneNavState(v: unknown): v is SceneNavState {
	if (!v || typeof v !== "object") return false;
	const obj = v as { navId?: unknown; snapshot?: unknown };
	const navId = obj.navId;
	const snapshot = obj.snapshot;
	if (typeof navId !== "number") return false;
	if (!snapshot || typeof snapshot !== "object") return false;
	const snap = snapshot as { engine?: unknown; storyLog?: unknown };
	const engine = snap.engine as
		| { sceneId?: unknown; stepIndex?: unknown; vars?: unknown }
		| undefined;
	const storyLog = snap.storyLog;
	if (!engine || typeof engine !== "object") return false;
	if (typeof engine.sceneId !== "string") return false;
	if (typeof engine.stepIndex !== "number") return false;
	if (!engine.vars || typeof engine.vars !== "object") return false;
	if (!Array.isArray(storyLog)) return false;
	return true;
}

function StoryView(): React.JSX.Element {
	const location = useLocation();
	const navigate = useNavigate();
	const {
		scene,
		story,
		currentStep,
		pastTexts,
		isDone,
		choices,
		vars,
		storyLog,
		advance,
		choose,
		getSnapshot,
		setSnapshot,
	} = useStoryEngine(currentStory);

	const isDev = import.meta.env.DEV === true;
	const storyPanelRef = useRef<HTMLElement>(null);
	const logScrollRef = useRef<HTMLDivElement>(null);

	const appliedNavIdRef = useRef<number | null>(null);
	const navSeqRef = useRef(0);
	const didInitRef = useRef(false);
	const pendingSceneCommitRef = useRef(false);
	const restoringRef = useRef(false);
	const lastSceneIdForCommitRef = useRef<string | null>(null);

	const externalNavState = isSceneNavState(location.state)
		? (location.state as SceneNavState)
		: null;

	// (1) 히스토리 state에서 스냅샷이 있으면 엔진을 복원한다.
	useEffect(() => {
		if (!externalNavState) return;
		if (appliedNavIdRef.current === externalNavState.navId) return;
		appliedNavIdRef.current = externalNavState.navId;
		navSeqRef.current = Math.max(navSeqRef.current, externalNavState.navId + 1);
		restoringRef.current = true;
		setSnapshot(externalNavState.snapshot);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [externalNavState, setSnapshot]);

	// (2) 씬(scene.id)이 바뀌면 "첫 렌더링 가능한 순간"에만 스냅샷을 히스토리에 기록한다.
	useEffect(() => {
		if (lastSceneIdForCommitRef.current === scene.id) return;
		lastSceneIdForCommitRef.current = scene.id;
		pendingSceneCommitRef.current = true;
	}, [scene.id]);

	useEffect(() => {
		const stable = Boolean(currentStep) || isDone;
		if (!pendingSceneCommitRef.current) return;
		if (!stable) return;

		// 복원 직후의 안정화는 "엔트리 추가"로 취급하지 않는다.
		if (restoringRef.current) {
			restoringRef.current = false;
			pendingSceneCommitRef.current = false;
			return;
		}

		// 아직 외부 히스토리 state 스냅샷 적용이 끝나지 않았으면 기록을 미룬다.
		if (
			externalNavState &&
			appliedNavIdRef.current !== externalNavState.navId
		) {
			return;
		}

		pendingSceneCommitRef.current = false;

		// initial load에서만 replace로 "현재 엔트리"를 스냅샷으로 덮어쓴다.
		const replace = !didInitRef.current && externalNavState == null;
		if (!didInitRef.current) didInitRef.current = true;

		const snapshot = getSnapshot();
		const navId = navSeqRef.current++;
		appliedNavIdRef.current = navId;
		navigate("/play", { state: { navId, snapshot }, replace });
	}, [currentStep, externalNavState, getSnapshot, isDone, navigate]);

	const canAdvance = Boolean(currentStep);

	function interpolate(src: string) {
		return src.replace(/\$([a-zA-Z0-9_]+)/g, (_m, key) => {
			const v = (vars as Record<string, unknown>)[key];
			return typeof v === "undefined" ? _m : String(v);
		});
	}

	useEffect(() => {
		// Keep deps in sync with what's rendered.
		if (pastTexts.length === 0 && !currentStep?.content) return;
		const el = storyPanelRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [pastTexts.length, currentStep?.content]);

	useEffect(() => {
		if (storyLog.length === 0) return;
		const el = logScrollRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [storyLog.length]);

	return (
		<>
			<header className={header}>
				<h1 className={title}>{story.title}</h1>
			</header>

			<main className={content}>
				{(pastTexts.length > 0 || currentStep) && (
					<section
						ref={storyPanelRef}
						className={card}
						aria-label="story"
						onClick={canAdvance ? advance : undefined}
						onKeyDown={(e) => {
							if (!canAdvance) return;
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								advance();
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
						{currentStep && (
							<div style={{ whiteSpace: "pre-wrap" }}>
								{interpolate(currentStep.content)}
							</div>
						)}
					</section>
				)}

				{/* 모든 step 완료 후 choices */}
				{isDone && choices.length > 0 && (
					<nav className={actionRow} aria-label="actions">
						{choices.map((c) => {
							const enabled = !c.enabledWhen || evalWhen(c.enabledWhen, vars);
							const choiceKey = `${c.text}|${c.enabledWhen ?? ""}|${c.script}`;
							return (
								<button
									key={choiceKey}
									type="button"
									className={actionButton}
									disabled={!enabled}
									title={
										!enabled && c.enabledWhen
											? `조건 불충족: ${c.enabledWhen}`
											: undefined
									}
									aria-disabled={!enabled}
									onClick={() => {
										if (!enabled) return;
										choose(c);
									}}
									style={
										!enabled
											? { opacity: 0.45, cursor: "not-allowed" }
											: undefined
									}
								>
									{c.text}
								</button>
							);
						})}
					</nav>
				)}

				{/* 선택지도 없고 step도 없으면 (엔딩) */}
				{isDone && choices.length === 0 && (
					<section className={card} aria-label="ending">
						<div style={{ opacity: 0.6, textAlign: "center" }}>— END —</div>
					</section>
				)}

				<details className={card} style={{ marginTop: "1rem" }}>
					<summary style={{ cursor: "pointer", userSelect: "none" }}>
						스토리 로그 ({storyLog.length}줄)
					</summary>
					<div
						ref={logScrollRef}
						role="log"
						aria-label="story-log"
						style={{
							marginTop: "0.75rem",
							maxHeight: "min(36vh, 280px)",
							overflow: "auto",
							fontSize: 13,
							lineHeight: 1.45,
							borderTop: "1px solid rgba(0,0,0,0.08)",
							paddingTop: "0.75rem",
						}}
					>
						{storyLog.length === 0 ? (
							<div style={{ opacity: 0.55 }}>아직 기록이 없습니다.</div>
						) : (
							storyLog.map((entry) => {
								const entryKey =
									entry.kind === "enterScene"
										? `enterScene|${entry.sceneId}`
										: entry.kind === "text"
											? `text|${entry.sceneId}|${entry.content}`
											: entry.kind === "script"
												? `script|${entry.sceneId}|${entry.code}`
												: `choice|${entry.sceneId}|${entry.text}|${entry.script}`;
								return (
									<div key={entryKey} style={{ marginBottom: "0.65em" }}>
										{entry.kind === "enterScene" && (
											<div style={{ opacity: 0.7 }}>
												<strong>씬</strong> · <code>{entry.sceneId}</code>
											</div>
										)}
										{entry.kind === "text" && (
											<div>
												<strong>대사</strong> ·{" "}
												<code style={{ opacity: 0.65 }}>{entry.sceneId}</code>
												<div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
													{interpolate(entry.content)}
												</div>
											</div>
										)}
										{entry.kind === "script" && (
											<div>
												<strong>스크립트</strong> ·{" "}
												<code style={{ opacity: 0.65 }}>{entry.sceneId}</code>
												{isDev ? (
													<pre
														style={{
															margin: "6px 0 0",
															padding: "8px 10px",
															background: "rgba(0,0,0,0.06)",
															borderRadius: 6,
															fontSize: 12,
															whiteSpace: "pre-wrap",
															wordBreak: "break-word",
														}}
													>
														{entry.code}
													</pre>
												) : (
													<div style={{ marginTop: 4, opacity: 0.65 }}>
														(스크립트 실행됨)
													</div>
												)}
											</div>
										)}
										{entry.kind === "choice" && (
											<div>
												<strong>선택</strong> ·{" "}
												<code style={{ opacity: 0.65 }}>{entry.sceneId}</code>
												<div style={{ marginTop: 4 }}>「{entry.text}」</div>
												{isDev && (
													<pre
														style={{
															margin: "6px 0 0",
															padding: "8px 10px",
															background: "rgba(0,0,0,0.06)",
															borderRadius: 6,
															fontSize: 12,
															whiteSpace: "pre-wrap",
															wordBreak: "break-word",
														}}
													>
														{entry.script}
													</pre>
												)}
											</div>
										)}
									</div>
								);
							})
						)}
					</div>
				</details>
			</main>

			{isDev && (
				<div
					role="status"
					aria-label="debug-overlay"
					style={{
						position: "fixed",
						right: 12,
						bottom: 12,
						zIndex: 9999,
						backgroundColor: "rgba(0,0,0,0.65)",
						color: "#fff",
						padding: "8px 10px",
						maxWidth: "42vw",
						maxHeight: "40vh",
						overflow: "auto",
						fontSize: 12,
						lineHeight: "1.4",
						pointerEvents: "none",
					}}
				>
					<pre style={{ margin: 0 }}>{JSON.stringify(vars, null, 2)}</pre>
				</div>
			)}
		</>
	);
}

export default function App(): React.JSX.Element {
	return <StoryView />;
}
