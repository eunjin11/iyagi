import React from 'react';
import { header, title, content, card, actionRow, actionButton } from './styles/app.css';
import { useStoryEngine } from './story/engine';
import { currentStory } from './story/current';

function StoryView(): React.JSX.Element {
  const { story, currentStep, pastTexts, isDone, choices, vars, advance, choose } =
    useStoryEngine(currentStory);

  const isDev = import.meta.env.DEV === true;

  function interpolate(src: string) {
    return src.replace(/\$([a-zA-Z0-9_]+)/g, (_m, key) => {
      const v = (vars as Record<string, unknown>)[key];
      return typeof v === 'undefined' ? _m : String(v);
    });
  }

  return (
    <>
      <header className={header}>
        <h1 className={title}>{story.title}</h1>
      </header>

      <main className={content}>
        {/* 지나간 text들 */}
        {pastTexts.length > 0 && (
          <section className={card} aria-label="history" style={{ opacity: 0.5 }}>
            {pastTexts.map((t, i) => (
              <div key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: '0.4em' }}>
                {interpolate(t)}
              </div>
            ))}
          </section>
        )}

        {/* 현재 text step */}
        {currentStep && (
          <section
            className={card}
            aria-label="story"
            onClick={advance}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ whiteSpace: 'pre-wrap' }}>{interpolate(currentStep.content)}</div>
            <div style={{ marginTop: '1em', fontSize: '0.75em', opacity: 0.5, textAlign: 'right' }}>
              클릭하여 계속
            </div>
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
