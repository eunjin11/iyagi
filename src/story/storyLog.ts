/** 플레이어가 보거나 진행시킨 내용의 타임라인(디버그·리플레이 참고용). */
export type StoryLogEntry =
  | { kind: "enterScene"; sceneId: string }
  | { kind: "text"; sceneId: string; content: string }
  | { kind: "script"; sceneId: string; code: string }
  | { kind: "choice"; sceneId: string; text: string; script: string };
