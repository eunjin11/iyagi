import React from 'react';
import { header, title, content, card, actionRow, actionButton } from './styles/app.css';
import { useStoryEngine } from './story/engine';
import { currentStory } from './story/current';

export default function App(): React.JSX.Element {
  const { passage, choices, vars, choose } = useStoryEngine(currentStory);
  const isDev = import.meta.env.DEV === true;
  function renderPassage(text: string) {
    const lines = String(text).split('\n');
    return (
      <>
        {lines.map((line, idx) => {
          if (line.trim().startsWith('###')) {
            const h = line.replace(/^###\s*/, '');
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
              {line}
            </div>
          );
        })}
      </>
    );
  }
  return (
    <>
      <header className={header}>
        <h1 className={title}>{currentStory.title}</h1>
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


