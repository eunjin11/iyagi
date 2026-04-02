import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { runScriptWithResult } from "./runScriptWithResult";
import type { StoryLogEntry } from "./storyLog";
import {
	initialEngineState,
	type StoryEngineState,
	type StoryEvent,
	type StoryReducerEvent,
	storyReducer,
} from "./storyReducer";
import type { Choice, Scene, Step, Story, VariableBag } from "./types";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function emptyScene(id: string): Scene {
	return { id, steps: [], choices: [] };
}

function deriveFromState(story: Story, state: StoryEngineState) {
	const scene: Scene = story.scenes[state.sceneId] ?? emptyScene(state.sceneId);
	const steps = scene.steps;

	const at = steps[state.stepIndex];
	const currentStep: Extract<Step, { type: "text" }> | null =
		at?.type === "text" ? at : null;
	const isDone = state.stepIndex >= steps.length;

	const pastTexts: string[] = [];
	for (let i = 0; i < state.stepIndex; i++) {
		const s = steps[i];
		if (s.type === "text") pastTexts.push(s.content);
	}

	const choices: Choice[] = isDone ? scene.choices : [];

	return { scene, steps, currentStep, isDone, pastTexts, choices };
}

function toReducerEvent(
	e: StoryEvent,
	vars: VariableBag,
	story: Story,
): StoryReducerEvent {
	if (e.type === "RUN_SCRIPT") {
		const { vars: nextVars, jumpTo } = runScriptWithResult(
			e.code,
			vars,
			story.varDefs,
		);
		return { type: "SCRIPT_DONE", context: e.context, vars: nextVars, jumpTo };
	}
	return e;
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export function useStoryEngine(story: Story) {
	const stateRef = useRef<StoryEngineState>(initialEngineState(story));
	const prevSceneIdRef = useRef<string | null>(null);
	const storyLogRef = useRef<StoryLogEntry[]>([]);
	const [storyLog, setStoryLog] = useState<StoryLogEntry[]>([]);

	const pushLog = useCallback((entry: StoryLogEntry) => {
		setStoryLog((prev) => {
			const next = [...prev, entry];
			storyLogRef.current = next;
			return next;
		});
	}, []);

	const [state, dispatchReducer] = useReducer(
		(s: StoryEngineState, e: StoryReducerEvent) => storyReducer(s, e, story),
		story,
		initialEngineState,
	);

	stateRef.current = state;

	const dispatch = useCallback(
		(e: StoryEvent) => {
			if (e.type === "RUN_SCRIPT" && e.context === "step") {
				pushLog({
					kind: "script",
					sceneId: stateRef.current.sceneId,
					code: e.code,
				});
			}
			dispatchReducer(toReducerEvent(e, stateRef.current.vars, story));
		},
		[pushLog],
	);

	const getSnapshot = useCallback((): {
		engine: StoryEngineState;
		storyLog: StoryLogEntry[];
	} => {
		const s = stateRef.current;
		return {
			engine: {
				sceneId: s.sceneId,
				stepIndex: s.stepIndex,
				vars: { ...s.vars },
			},
			storyLog: [...storyLogRef.current],
		};
	}, []);

	const setSnapshot = useCallback(
		(snapshot: { engine: StoryEngineState; storyLog: StoryLogEntry[] }) => {
			// enterScene 로그 중복 방지를 위해 "복원될" sceneId를 먼저 고정한다.
			prevSceneIdRef.current = snapshot.engine.sceneId;

			storyLogRef.current = [...snapshot.storyLog];
			setStoryLog(storyLogRef.current);

			dispatchReducer({
				type: "SET_SNAPSHOT",
				snapshot: {
					sceneId: snapshot.engine.sceneId,
					stepIndex: snapshot.engine.stepIndex,
					vars: { ...snapshot.engine.vars },
				},
			});
		},
		[],
	);

	const { scene, steps, currentStep, isDone, pastTexts, choices } =
		deriveFromState(story, state);

	useEffect(() => {
		if (prevSceneIdRef.current === state.sceneId) return;
		prevSceneIdRef.current = state.sceneId;
		pushLog({ kind: "enterScene", sceneId: state.sceneId });
	}, [state.sceneId, pushLog]);

	// script step: 대사 뒤에 오는 `inc(...)` 등은 텍스트 스텝을 TAP_ADVANCE로 지난 뒤 이 인덱스에서 실행됨
	useEffect(() => {
		const step = steps[state.stepIndex];
		if (!step || step.type !== "script") return;

		dispatch({ type: "RUN_SCRIPT", context: "step", code: step.code });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, steps, state.stepIndex]);

	function advance() {
		const step = steps[state.stepIndex];
		if (step?.type === "text") {
			pushLog({ kind: "text", sceneId: state.sceneId, content: step.content });
		}
		dispatch({ type: "TAP_ADVANCE" });
	}

	function choose(choice: Choice) {
		pushLog({
			kind: "choice",
			sceneId: state.sceneId,
			text: choice.text,
			script: choice.script,
		});
		dispatch({ type: "RUN_SCRIPT", context: "choice", code: choice.script });
	}

	return {
		story,
		scene,
		currentStep,
		pastTexts,
		isDone,
		choices,
		vars: state.vars,
		storyLog,
		advance,
		choose,
		getSnapshot,
		setSnapshot,
	};
}
