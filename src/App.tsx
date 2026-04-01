import React, { useEffect, useRef } from 'react';
import { header, title, content, card, actionRow, actionButton } from './styles/app.css';
import { useStoryEngine } from './story/engine';
import { currentStory } from './story/current';

function StoryView(): React.JSX.Element {
  const { story, currentStep, pastTexts, isDone, choices, vars, advance, choose } =
    useStoryEngine(currentStory);

  const isDev = import.meta.env.DEV === true;
  const storyPanelRef = useRef<HTMLElement>(null);

  const canAdvance = Boolean(currentStep);

  function interpolate(src: string) {
    return src.replace(/\$([a-zA-Z0-9_]+)/g, (_m, key) => {
      const v = (vars as Record<string, unknown>)[key];
      return typeof v === 'undefined' ? _m : String(v);
    });
  }

  useEffect(() => {
    const el = storyPanelRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [pastTexts.length, currentStep?.content]);

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
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                advance();
              }
            }}
            tabIndex={canAdvance ? 0 : undefined}
            role={canAdvance ? 'button' : undefined}
            style={{ cursor: canAdvance ? 'pointer' : 'default' }}
          >
            {pastTexts.map((t, i) => (
              <div
                key={i}
                style={{ whiteSpace: 'pre-wrap', marginBottom: '0.75em', opacity: 0.5 }}
              >
                {interpolate(t)}
              </div>
            ))}
            {currentStep && (
              <div style={{ whiteSpace: 'pre-wrap' }}>{interpolate(currentStep.content)}</div>
            )}
          </section>
        )}

        {/* 모든 step 완료 후 choices */}
        {isDone && choices.length > 0 && (
          <nav className={actionRow} aria-label="actions">
            {choices.map((c, idx) => (
              <button key={idx} className={actionButton} onClick={() => choose(c)}>
                {c.text}
              </button>
            ))}
          </nav>
        )}

        {/* 선택지도 없고 step도 없으면 (엔딩) */}
        {isDone && choices.length === 0 && (
          <section className={card} aria-label="ending">
            <div style={{ opacity: 0.6, textAlign: 'center' }}>— END —</div>
          </section>
        )}
      </main>

      {isDev && (
        <div
          aria-label="debug-overlay"
          style={{
            position: 'fixed',
            right: 12,
            bottom: 12,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.65)',
            color: '#fff',
            padding: '8px 10px',
            maxWidth: '42vw',
            maxHeight: '40vh',
            overflow: 'auto',
            fontSize: 12,
            lineHeight: '1.4',
            pointerEvents: 'none',
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
