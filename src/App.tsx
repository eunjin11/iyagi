import React, { useEffect, useRef } from "react";
import {
  header,
  title,
  content,
  card,
  actionRow,
  actionButton,
} from "./styles/app.css";
import { evalCondition, formatConditionAst } from "./story/conditionAst";
import { useStoryEngine } from "./story/engine";
import { currentStory } from "./story/current";

function StoryView(): React.JSX.Element {
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
  const storyPanelRef = useRef<HTMLElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const canAdvance = Boolean(currentStep);

  function interpolate(src: string) {
    return src.replace(/\$([a-zA-Z0-9_]+)/g, (_m, key) => {
      const v = (vars as Record<string, unknown>)[key];
      return typeof v === "undefined" ? _m : String(v);
    });
  }

  useEffect(() => {
    const el = storyPanelRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [pastTexts.length, currentStep?.content]);

  useEffect(() => {
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
            {pastTexts.map((t, i) => (
              <div
                key={i}
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
            {choices.map((c, idx) => {
              const enabled =
                !c.enabledWhenAst || evalCondition(c.enabledWhenAst, vars);
              return (
                <button
                  key={idx}
                  type="button"
                  className={actionButton}
                  disabled={!enabled}
                  title={
                    !enabled && c.enabledWhenAst
                      ? `조건 불충족: ${formatConditionAst(c.enabledWhenAst)}`
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
              storyLog.map((entry, i) => (
                <div key={i} style={{ marginBottom: "0.65em" }}>
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
              ))
            )}
          </div>
        </details>
      </main>

      {isDev && (
        <div
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
