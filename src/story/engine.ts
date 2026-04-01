import { useCallback, useEffect, useRef, useState } from 'react';
import type { Choice, Scene, Story, VariableBag } from './types';
import { runScript } from '../actions';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function emptyScene(id: string): Scene {
  return { id, steps: [], choices: [] };
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export function useStoryEngine(story: Story) {
  const [sceneId, setSceneId] = useState<string>(story.start);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [vars, setVars] = useState<VariableBag>(story.init ?? {});

  // jumped 플래그 — script step에서 jump()가 불리면 남은 step 처리를 중단
  const jumpedRef = useRef<boolean>(false);

  const scene: Scene = story.scenes[sceneId] ?? emptyScene(sceneId);
  const steps = scene.steps;

  // navigate 함수 (useCallback으로 안정화)
  const navigate = useCallback((id: string) => {
    jumpedRef.current = true;
    setSceneId(id);
    setStepIndex(0);
  }, []);

  // script step 자동 실행 — stepIndex가 script를 가리킬 때 즉시 실행
  useEffect(() => {
    const step = steps[stepIndex];
    if (!step || step.type !== 'script') return;

    jumpedRef.current = false;
    runScript(step.code, vars, { vars, setVars, navigate });

    if (!jumpedRef.current) {
      setStepIndex((i) => i + 1);
    }
    // vars를 의존성에 넣으면 setVars 후 재실행되므로 의도적으로 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, sceneId]);

  // 현재 text step (null이면 아직 텍스트 없음 or 모든 step 완료)
  const currentStep = steps[stepIndex]?.type === 'text' ? steps[stepIndex] : null;
  const isDone = stepIndex >= steps.length;

  // 지금까지 지나간 text step들 (누적 표시용)
  const pastTexts: string[] = [];
  for (let i = 0; i < stepIndex; i++) {
    const s = steps[i];
    if (s.type === 'text') pastTexts.push(s.content);
  }

  const choices: Choice[] = isDone ? scene.choices : [];

  /** text step을 클릭으로 진행 */
  function advance() {
    const step = steps[stepIndex];
    if (!step || step.type !== 'text') return;
    setStepIndex((i) => i + 1);
  }

  /** choice 선택 — script 실행 후 navigate까지 포함 */
  function choose(choice: Choice) {
    jumpedRef.current = false;
    runScript(choice.script, vars, { vars, setVars, navigate });
  }

  return {
    story,
    scene,
    currentStep,
    pastTexts,
    isDone,
    choices,
    vars,
    advance,
    choose,
  };
}
