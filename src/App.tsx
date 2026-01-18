import React, { useEffect, useRef } from 'react';
import { header, title, content, card, actionRow, actionButton } from './styles/app.css';
import { useStoryEngine } from './story/engine';
import { currentStory } from './story/current';

function StoryView(): React.JSX.Element {
  const { story, passage, choices, vars, choose, getSnapshot, setSnapshot } = useStoryEngine(currentStory);
  const restoringRef = useRef<boolean>(false);

  // Initialize history state without changing URL and handle back/forward
  useEffect(() => {
    const snap = getSnapshot();
    window.history.replaceState(snap, document.title, window.location.href);
    const onPopState = (e: PopStateEvent) => {
      const state = (e.state as any) || null;
      if (state && typeof state.id === 'string' && state.vars) {
        restoringRef.current = true;
        setSnapshot({ id: state.id, vars: state.vars }, { skipEnter: true });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push state on changes (skip when restoring from popstate)
  useEffect(() => {
    if (restoringRef.current) {
      restoringRef.current = false;
      return;
    }
    const snap = getSnapshot();
    window.history.pushState(snap, document.title, window.location.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage?.id, vars]);

  const isDev = import.meta.env.DEV === true;
  function renderPassage(text: string) {
    // Replace $var placeholders with current values
    const interpolate = (src: string) =>
      src.replace(/\$([a-zA-Z0-9_]+)/g, (_m, key) => {
        const v = (vars as Record<string, unknown>)[key];
        return typeof v === 'undefined' ? _m : String(v);
      });
    const lines = String(text).split('\n');
    return (
      <>
        {lines.map((line, idx) => {
          const lineInterp = interpolate(line);
          if (line.trim().startsWith('###')) {
            const h = lineInterp.replace(/^###\s*/, '');
            return (
              <h3 key={`h-${idx}`} style={{ margin: '1em 0 .5em', fontWeight: 600 }}>
                {h}
              </h3>
            );
          }
          if (line.trim() === '') {
            return <div key={`sp-${idx}`} style={{ height: '0.6em' }} />;
          }
          return (
            <div key={`l-${idx}`} style={{ whiteSpace: 'pre-wrap' }}>
              {lineInterp}
            </div>
          );
        })}
      </>
    );
  }
  return (
    <>
      <header className={header}>
        <h1 className={title}>{story.title}</h1>
      </header>
      <main className={content}>
        <section className={card} aria-label="story">
          <div>{renderPassage(passage.text)}</div>
        </section>
        <nav className={actionRow} aria-label="actions">
          {choices.map((c, idx) => (
            <button
              key={idx}
              className={actionButton}
              onClick={() => choose(c)}
            >
              {c.text}
            </button>
          ))}
        </nav>
      </main>
      {isDev && (
        <div
          aria-label="debug-overlay"
          style={{
            position: 'fixed',
            right: 12,
            bottom: 12,
            zIndex: 9999,
            backgroundColor: 'rgba(128, 128, 128, 0.6)',
            color: '#fff',
            padding: '8px 10px',
            maxWidth: '42vw',
            maxHeight: '40vh',
            overflow: 'auto',
            fontSize: 12,
            lineHeight: '1.4',
            pointerEvents: 'none'
          }}
        >
          <pre style={{ margin: 0 }}>
            {JSON.stringify(vars, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

function RouterShell(): React.JSX.Element {
  return (
    <StoryView />
  );
}

export default function App(): React.JSX.Element {
  return <RouterShell />;
}


